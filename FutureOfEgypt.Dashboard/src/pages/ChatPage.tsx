import { useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import {
  Autocomplete,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import {
  createDirectConversation,
  createGroupConversation,
  getConversationMessages,
  getMyConversations,
  markConversationAsRead,
  sendChatMessage,
} from '../api/chatApi';
import { getEngineers } from '../api/engineersApi';
import { createChatHubConnection } from '../signalr/chatHub';
import { useAuth } from '../auth/AuthContext';
import type {
  ChatConversationResponse,
  ChatMessageResponse,
  ChatRealtimeMessageResponse,
  CreateGroupChatRequest,
} from '../types/chat';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getConversationTitle(conversation: ChatConversationResponse): string {
  if (conversation.title) return conversation.title;
  const first = conversation.participants[0];
  return first?.displayName ?? 'Direct conversation';
}

function getConversationInitials(title: string): string {
  const parts = title.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return title.slice(0, 2).toUpperCase();
}

function formatMessageTime(utcStr: string): string {
  return new Date(utcStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatConversationTime(utcStr: string): string {
  const d = new Date(utcStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString();
}

function convertRealtimeToMessage(
  msg: ChatRealtimeMessageResponse,
  currentUserId?: string,
): ChatMessageResponse {
  return {
    publicId: msg.publicId,
    senderUserId: msg.senderUserId,
    senderName: msg.senderName,
    messageText: msg.messageText,
    type: msg.type,
    sentAtUtc: msg.sentAtUtc,
    isMine: msg.senderUserId === currentUserId,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ChatPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversationResponse | null>(null);
  const [messageText, setMessageText] = useState('');

  // Direct dialog
  const [isDirectDialogOpen, setIsDirectDialogOpen] = useState(false);
  const [selectedEngineerUserId, setSelectedEngineerUserId] = useState<string>('');
  const [directDialogError, setDirectDialogError] = useState<string | null>(null);

  // Group dialog
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupParticipantIds, setGroupParticipantIds] = useState('');
  const [groupDialogError, setGroupDialogError] = useState<string | null>(null);

  // Scroll ref for auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Queries ────────────────────────────────────────────────────
  const conversationQueryParams = useMemo(
    () => ({ pageNumber: 1, pageSize: 30, search: search.trim() || undefined }),
    [search],
  );

  const {
    data: conversationsData,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['chat-conversations', conversationQueryParams],
    queryFn: () => getMyConversations(conversationQueryParams),
  });

  const selectedConversationPublicId = selectedConversation?.publicId;

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['chat-messages', selectedConversationPublicId],
    queryFn: () =>
      getConversationMessages(selectedConversationPublicId!, {
        pageNumber: 1,
        pageSize: 50,
      }),
    enabled: Boolean(selectedConversationPublicId),
  });

  // Engineers list for autocomplete in direct dialog
  const { data: engineersData } = useQuery({
    queryKey: ['engineers-all'],
    queryFn: () => getEngineers({ pageNumber: 1, pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const engineers = engineersData?.items ?? [];

  // ── Mutations ──────────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: (id: string) => markConversationAsRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationPublicId, text }: { conversationPublicId: string; text: string }) =>
      sendChatMessage(conversationPublicId, { messageText: text }),
    onSuccess: async () => {
      setMessageText('');
      await queryClient.invalidateQueries({
        queryKey: ['chat-messages', selectedConversationPublicId],
      });
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  const createDirectMutation = useMutation({
    mutationFn: (userId: string) => createDirectConversation({ targetUserId: userId }),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setSelectedConversation(conversation);
      setIsDirectDialogOpen(false);
      setSelectedEngineerUserId('');
      setDirectDialogError(null);
    },
    onError: () => setDirectDialogError('Failed to create direct conversation.'),
  });

  const createGroupMutation = useMutation({
    mutationFn: (request: CreateGroupChatRequest) => createGroupConversation(request),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setSelectedConversation(conversation);
      setIsGroupDialogOpen(false);
      setGroupTitle('');
      setGroupParticipantIds('');
      setGroupDialogError(null);
    },
    onError: () => setGroupDialogError('Failed to create group conversation.'),
  });

  // ── SignalR ────────────────────────────────────────────────────
  useEffect(() => {
    const connection = createChatHubConnection({
      onMessageReceived: (message) => {
        void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });

        if (message.conversationPublicId === selectedConversationPublicId) {
          queryClient.setQueryData(
            ['chat-messages', selectedConversationPublicId],
            (current: typeof messagesData | undefined) => {
              if (!current) return current;
              const alreadyExists = current.items.some((i) => i.publicId === message.publicId);
              if (alreadyExists) return current;
              return {
                ...current,
                // Append to end — newest messages at the bottom
                items: [...current.items, convertRealtimeToMessage(message, user?.userId)],
                totalCount: current.totalCount + 1,
              };
            },
          );
          void markReadMutation.mutateAsync(message.conversationPublicId);
        }
      },
      onConversationUpdated: () => {
        void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      },
      onConversationRead: () => {
        void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      },
      onParticipantsChanged: () => {
        void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      },
    });

    void connection.start();
    return () => { void connection.stop(); };
  }, [queryClient, selectedConversationPublicId, user?.userId]);

  // Mark as read when conversation selected
  useEffect(() => {
    if (selectedConversationPublicId) {
      markReadMutation.mutate(selectedConversationPublicId);
    }
  }, [selectedConversationPublicId]);

  // ── Auto scroll to bottom ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.items]);

  // ── Sorted messages (oldest → newest for display) ─────────────
  // API returns newest-first (page 1 = most recent), so we reverse for display
  const sortedMessages = useMemo(() => {
    if (!messagesData?.items) return [];
    // If items are already oldest-first (ascending), use as-is.
    // We detect order by comparing timestamps of first two items.
    const items = messagesData.items;
    if (items.length < 2) return [...items];
    const first = new Date(items[0].sentAtUtc).getTime();
    const second = new Date(items[1].sentAtUtc).getTime();
    // If descending (newest first), reverse so oldest is first
    return first > second ? [...items].reverse() : [...items];
  }, [messagesData?.items]);

  const conversations = conversationsData?.items ?? [];

  // ── Handlers ──────────────────────────────────────────────────
  function handleSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedConversationPublicId || !messageText.trim()) return;
    sendMessageMutation.mutate({
      conversationPublicId: selectedConversationPublicId,
      text: messageText.trim(),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!selectedConversationPublicId || !messageText.trim() || sendMessageMutation.isPending) return;
      sendMessageMutation.mutate({
        conversationPublicId: selectedConversationPublicId,
        text: messageText.trim(),
      });
    }
  }

  function handleCreateDirectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEngineerUserId.trim()) {
      setDirectDialogError('Please select an engineer.');
      return;
    }
    setDirectDialogError(null);
    createDirectMutation.mutate(selectedEngineerUserId.trim());
  }

  function handleCreateGroupSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = groupTitle.trim();
    const participantUserIds = groupParticipantIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!title) { setGroupDialogError('Please enter group title.'); return; }
    if (participantUserIds.length === 0) { setGroupDialogError('Please enter at least one participant.'); return; }
    setGroupDialogError(null);
    createGroupMutation.mutate({ title, participantUserIds });
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Chat"
        subtitle="Direct and group conversations with engineers and admins."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: 2,
          height: 'calc(100vh - 180px)',
          minHeight: 520,
        }}
      >
        {/* ── Conversations sidebar ────────────────────────────── */}
        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          role="navigation"
          aria-label="Conversations list"
        >
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <Tooltip title="New Direct Chat">
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    setSelectedEngineerUserId('');
                    setDirectDialogError(null);
                    setIsDirectDialogOpen(true);
                  }}
                  aria-label="Start new direct conversation"
                >
                  Direct
                </Button>
              </Tooltip>
              <Tooltip title="New Group Chat">
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<GroupAddIcon />}
                  onClick={() => {
                    setGroupTitle('');
                    setGroupParticipantIds('');
                    setGroupDialogError(null);
                    setIsGroupDialogOpen(true);
                  }}
                  aria-label="Create new group conversation"
                >
                  Group
                </Button>
              </Tooltip>
            </Box>

            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Conversation list */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {isConversationsLoading && <LoadingState message="Loading conversations..." />}
            {isConversationsError && (
              <ErrorState
                message="Failed to load conversations."
                onRetry={() => { void refetchConversations(); }}
              />
            )}
            {!isConversationsLoading && !isConversationsError && conversations.length === 0 && (
              <EmptyState title="No conversations" description="Start a direct or group chat." />
            )}
            {!isConversationsLoading && !isConversationsError && conversations.length > 0 && (
              <List disablePadding>
                {conversations.map((conv) => {
                  const isSelected = selectedConversation?.publicId === conv.publicId;
                  const title = getConversationTitle(conv);
                  const initials = getConversationInitials(title);

                  return (
                    <ListItemButton
                      key={conv.publicId}
                      selected={isSelected}
                      onClick={() => setSelectedConversation(conv)}
                      aria-label={`Open conversation: ${title}`}
                      aria-selected={isSelected}
                      sx={{
                        px: 2,
                        py: 1.5,
                        gap: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        alignItems: 'flex-start',
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          '&:hover': { backgroundColor: 'primary.dark' },
                          '& .MuiTypography-root': { color: '#fff !important' },
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: isSelected ? 'rgba(255,255,255,0.25)' : 'primary.main',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        {initials}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Typography
                            noWrap
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: isSelected ? '#fff' : 'text.primary',
                            }}
                          >
                            {title}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            {conv.unreadCount > 0 && (
                              <Badge
                                badgeContent={conv.unreadCount}
                                color={isSelected ? 'default' : 'primary'}
                                sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none' } }}
                                aria-label={`${conv.unreadCount} unread messages`}
                              />
                            )}
                          </Box>
                        </Box>

                        <Typography
                          noWrap
                          variant="body2"
                          sx={{
                            color: isSelected ? 'rgba(255,255,255,0.75)' : 'text.secondary',
                            fontSize: '0.8rem',
                            mt: 0.25,
                          }}
                        >
                          {conv.lastMessage?.messageText ?? 'No messages yet'}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            color: isSelected ? 'rgba(255,255,255,0.55)' : 'text.disabled',
                            display: 'block',
                            mt: 0.25,
                            fontSize: '0.7rem',
                          }}
                        >
                          {formatConversationTime(conv.lastMessageAtUtc)}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        </Paper>

        {/* ── Message area ─────────────────────────────────────── */}
        <Paper
          sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          role="main"
          aria-label="Chat messages"
        >
          {/* No conversation selected */}
          {!selectedConversation && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                Select a conversation
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                Choose a conversation from the left panel to start chatting.
              </Typography>
            </Box>
          )}

          {/* Conversation selected */}
          {selectedConversation && (
            <>
              {/* Conversation header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.75,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                  aria-hidden="true"
                >
                  {getConversationInitials(getConversationTitle(selectedConversation))}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
                    {getConversationTitle(selectedConversation)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {selectedConversation.type === 1 ? 'Direct chat' : `Group chat · ${selectedConversation.participants.length} members`}
                  </Typography>
                </Box>
              </Box>

              {/* Messages container */}
              <Box
                className="chat-messages-container"
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column', // Normal top-to-bottom
                  gap: 1,
                  backgroundColor: 'background.default',
                }}
                role="log"
                aria-label="Messages"
                aria-live="polite"
              >
                {isMessagesLoading && <LoadingState message="Loading messages..." />}
                {isMessagesError && (
                  <ErrorState
                    message="Failed to load messages."
                    onRetry={() => { void refetchMessages(); }}
                  />
                )}
                {!isMessagesLoading && !isMessagesError && sortedMessages.length === 0 && (
                  <EmptyState
                    title="No messages yet"
                    description="Send the first message to start the conversation."
                  />
                )}

                {!isMessagesLoading && !isMessagesError && sortedMessages.map((message, idx) => {
                  const prevMsg = idx > 0 ? sortedMessages[idx - 1] : null;
                  const showSenderName = !message.isMine &&
                    (!prevMsg || prevMsg.senderUserId !== message.senderUserId);

                  return (
                    <Box
                      key={message.publicId}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: message.isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {/* Sender name (group chats) */}
                      {showSenderName && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            mb: 0.5,
                            ml: 0.5,
                            fontSize: '0.72rem',
                          }}
                        >
                          {message.senderName}
                        </Typography>
                      )}

                      {/* Bubble */}
                      <Box
                        sx={{
                          maxWidth: '68%',
                          px: 2,
                          py: 1,
                          borderRadius: message.isMine
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                          backgroundColor: message.isMine ? 'primary.main' : 'background.paper',
                          border: message.isMine ? 'none' : '1px solid',
                          borderColor: 'divider',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                        role="article"
                        aria-label={`${message.isMine ? 'You' : message.senderName}: ${message.messageText}`}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: message.isMine ? '#fff' : 'text.primary',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {message.messageText}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            textAlign: 'right',
                            mt: 0.5,
                            opacity: 0.7,
                            fontSize: '0.68rem',
                            color: message.isMine ? 'rgba(255,255,255,0.75)' : 'text.disabled',
                          }}
                          aria-label={`Sent at ${formatMessageTime(message.sentAtUtc)}`}
                        >
                          {formatMessageTime(message.sentAtUtc)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} aria-hidden="true" />
              </Box>

              <Divider />

              {/* Message input */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-end' }}
              >
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sendMessageMutation.isPending}
                  aria-label="Message input"
                  slotProps={{ input: { style: { fontSize: '0.9rem' } } }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  aria-label="Send message"
                  disabled={sendMessageMutation.isPending || !messageText.trim()}
                  sx={{
                    minWidth: 48,
                    width: 48,
                    height: 40,
                    p: 0,
                    borderRadius: '10px',
                    flexShrink: 0,
                  }}
                >
                  {sendMessageMutation.isPending ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <SendIcon sx={{ fontSize: '1rem' }} />
                  )}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* ── Direct Chat Dialog ─────────────────────────────────── */}
      <Dialog
        open={isDirectDialogOpen}
        onClose={() => {
          if (createDirectMutation.isPending) return;
          setIsDirectDialogOpen(false);
          setSelectedEngineerUserId('');
          setDirectDialogError(null);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="direct-dialog-title"
      >
        <Box component="form" onSubmit={handleCreateDirectSubmit}>
          <DialogTitle id="direct-dialog-title">New Direct Conversation</DialogTitle>
          <DialogContent>
            {directDialogError && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
                {directDialogError}
              </Typography>
            )}

            <Autocomplete
              options={engineers}
              getOptionLabel={(opt) => `${opt.fullName} (${opt.email ?? opt.publicId})`}
              onChange={(_, val) => setSelectedEngineerUserId(val?.publicId ?? '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Engineer"
                  placeholder="Search by name..."
                  sx={{ mt: 1 }}
                />
              )}
              noOptionsText="No engineers found"
              aria-label="Select engineer for direct chat"
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setIsDirectDialogOpen(false);
                setSelectedEngineerUserId('');
                setDirectDialogError(null);
              }}
              disabled={createDirectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createDirectMutation.isPending || !selectedEngineerUserId}
            >
              {createDirectMutation.isPending ? 'Creating...' : 'Start Chat'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ── Group Chat Dialog ──────────────────────────────────── */}
      <Dialog
        open={isGroupDialogOpen}
        onClose={() => {
          if (createGroupMutation.isPending) return;
          setIsGroupDialogOpen(false);
          setGroupTitle('');
          setGroupParticipantIds('');
          setGroupDialogError(null);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="group-dialog-title"
      >
        <Box component="form" onSubmit={handleCreateGroupSubmit}>
          <DialogTitle id="group-dialog-title">New Group Conversation</DialogTitle>
          <DialogContent>
            {groupDialogError && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
                {groupDialogError}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Group Title"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              sx={{ mt: 1, mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Participant User IDs"
              placeholder="id1, id2, id3"
              value={groupParticipantIds}
              onChange={(e) => setGroupParticipantIds(e.target.value)}
              multiline
              minRows={3}
              helperText="Separate multiple IDs with commas"
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setIsGroupDialogOpen(false);
                setGroupTitle('');
                setGroupParticipantIds('');
                setGroupDialogError(null);
              }}
              disabled={createGroupMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}