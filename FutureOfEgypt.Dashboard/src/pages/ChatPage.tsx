import { useEffect, useMemo, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import {
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
import { createChatHubConnection } from '../signalr/chatHub';
import { useAuth } from '../auth/AuthContext';
import type {
  ChatConversationResponse,
  ChatMessageResponse,
  ChatRealtimeMessageResponse,
  CreateGroupChatRequest,
} from '../types/chat';

function getConversationTitle(conversation: ChatConversationResponse) {
  if (conversation.title) {
    return conversation.title;
  }

  const firstParticipant = conversation.participants[0];

  return firstParticipant?.displayName ?? 'Direct conversation';
}

function convertRealtimeMessageToMessage(
  message: ChatRealtimeMessageResponse,
  currentUserId?: string,
): ChatMessageResponse {
  return {
    publicId: message.publicId,
    senderUserId: message.senderUserId,
    senderName: message.senderName,
    messageText: message.messageText,
    type: message.type,
    sentAtUtc: message.sentAtUtc,
    isMine: message.senderUserId === currentUserId,
  };
}

export function ChatPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversationResponse | null>(null);
  const [messageText, setMessageText] = useState('');

  const [isDirectDialogOpen, setIsDirectDialogOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [directDialogError, setDirectDialogError] = useState<string | null>(null);

  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupParticipantIds, setGroupParticipantIds] = useState('');
  const [groupDialogError, setGroupDialogError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      pageNumber: 1,
      pageSize: 30,
      search: search.trim() || undefined,
    }),
    [search],
  );

  const {
    data: conversationsData,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['chat-conversations', queryParams],
    queryFn: () => getMyConversations(queryParams),
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

  const markReadMutation = useMutation({
    mutationFn: (conversationPublicId: string) =>
      markConversationAsRead(conversationPublicId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({
      conversationPublicId,
      text,
    }: {
      conversationPublicId: string;
      text: string;
    }) =>
      sendChatMessage(conversationPublicId, {
        messageText: text,
      }),
    onSuccess: async () => {
      setMessageText('');
      await queryClient.invalidateQueries({
        queryKey: ['chat-messages', selectedConversationPublicId],
      });
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  const createDirectMutation = useMutation({
    mutationFn: (userId: string) =>
      createDirectConversation({
        targetUserId: userId,
      }),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setSelectedConversation(conversation);
      setIsDirectDialogOpen(false);
      setTargetUserId('');
      setDirectDialogError(null);
    },
    onError: () => {
      setDirectDialogError('Failed to create direct conversation.');
    },
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
    onError: () => {
      setGroupDialogError('Failed to create group conversation.');
    },
  });

  useEffect(() => {
    const connection = createChatHubConnection({
      onMessageReceived: (message) => {
        void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });

        if (message.conversationPublicId === selectedConversationPublicId) {
          queryClient.setQueryData(
            ['chat-messages', selectedConversationPublicId],
            (current: typeof messagesData | undefined) => {
              if (!current) {
                return current;
              }

              const alreadyExists = current.items.some(
                (item) => item.publicId === message.publicId,
              );

              if (alreadyExists) {
                return current;
              }

              return {
                ...current,
                items: [
                  convertRealtimeMessageToMessage(message, user?.userId),
                  ...current.items,
                ],
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

    return () => {
      void connection.stop();
    };
}, [queryClient, selectedConversationPublicId, user?.userId]);

  useEffect(() => {
    if (selectedConversationPublicId) {
      markReadMutation.mutate(selectedConversationPublicId);
    }
  }, [selectedConversationPublicId]);

  const conversations = conversationsData?.items ?? [];
  const messages = messagesData?.items ?? [];

  function handleSelectConversation(conversation: ChatConversationResponse) {
    setSelectedConversation(conversation);
  }

  function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedConversationPublicId) {
      return;
    }

    const text = messageText.trim();

    if (!text) {
      return;
    }

    sendMessageMutation.mutate({
      conversationPublicId: selectedConversationPublicId,
      text,
    });
  }

  function handleOpenDirectDialog() {
    setTargetUserId('');
    setDirectDialogError(null);
    setIsDirectDialogOpen(true);
  }

  function handleCloseDirectDialog() {
    if (createDirectMutation.isPending) {
      return;
    }

    setIsDirectDialogOpen(false);
    setTargetUserId('');
    setDirectDialogError(null);
  }

  function handleCreateDirectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userId = targetUserId.trim();

    if (!userId) {
      setDirectDialogError('Please enter target user id.');
      return;
    }

    setDirectDialogError(null);
    createDirectMutation.mutate(userId);
  }

  function handleOpenGroupDialog() {
    setGroupTitle('');
    setGroupParticipantIds('');
    setGroupDialogError(null);
    setIsGroupDialogOpen(true);
  }

  function handleCloseGroupDialog() {
    if (createGroupMutation.isPending) {
      return;
    }

    setIsGroupDialogOpen(false);
    setGroupTitle('');
    setGroupParticipantIds('');
    setGroupDialogError(null);
  }

  function parseParticipantIds(value: string) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function handleCreateGroupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = groupTitle.trim();
    const participantUserIds = parseParticipantIds(groupParticipantIds);

    if (!title) {
      setGroupDialogError('Please enter group title.');
      return;
    }

    if (participantUserIds.length === 0) {
      setGroupDialogError('Please enter at least one participant user id.');
      return;
    }

    setGroupDialogError(null);

    createGroupMutation.mutate({
      title,
      participantUserIds,
    });
  }

  return (
    <>
      <PageHeader
        title="Chat"
        subtitle="Direct and group conversations with engineers and admins."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' },
          gap: 2,
          height: 'calc(100vh - 180px)',
          minHeight: 560,
        }}
      >
        <Paper sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                fullWidth
                size="small"
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleOpenDirectDialog}
              >
                Direct
              </Button>

              <Button
                fullWidth
                size="small"
                variant="outlined"
                startIcon={<GroupAddIcon />}
                onClick={handleOpenGroupDialog}
              >
                Group
              </Button>
            </Box>

            <TextField
              fullWidth
              placeholder="Search conversations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {isConversationsLoading && (
              <LoadingState message="Loading conversations..." />
            )}

            {isConversationsError && (
              <ErrorState
                message="Failed to load conversations."
                onRetry={() => {
                  void refetchConversations();
                }}
              />
            )}

            {!isConversationsLoading &&
              !isConversationsError &&
              conversations.length === 0 && (
                <EmptyState
                  title="No conversations"
                  description="No direct or group conversations found."
                />
              )}

            {!isConversationsLoading &&
              !isConversationsError &&
              conversations.length > 0 && (
                <List disablePadding>
                  {conversations.map((conversation) => {
                    const selected =
                      selectedConversation?.publicId === conversation.publicId;

                    return (
                      <ListItemButton
                        key={conversation.publicId}
                        selected={selected}
                        onClick={() => handleSelectConversation(conversation)}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          alignItems: 'flex-start',
                        }}
                      >
<Box sx={{ width: '100%', minWidth: 0 }}>
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1,
      minWidth: 0,
    }}
  >
    <Typography sx={{ fontWeight: 700 }} noWrap>
      {getConversationTitle(conversation)}
    </Typography>

    {conversation.unreadCount > 0 && (
      <Badge color="primary" badgeContent={conversation.unreadCount} />
    )}
  </Box>

  <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
    {conversation.lastMessage?.messageText ?? 'No messages yet'}
  </Typography>

  <Typography
    variant="caption"
    color="text.secondary"
    sx={{ display: 'block', mt: 0.5 }}
  >
    {new Date(conversation.lastMessageAtUtc).toLocaleString()}
  </Typography>
</Box>
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
          </Box>
        </Paper>

        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {!selectedConversation && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                textAlign: 'center',
              }}
            >
              <Box>
                <Typography variant="h6">Select a conversation</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Choose a direct or group chat from the left side.
                </Typography>
              </Box>
            </Box>
          )}

          {selectedConversation && (
            <>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6">
                  {getConversationTitle(selectedConversation)}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {selectedConversation.type === 1 ? 'Direct chat' : 'Group chat'}
                </Typography>
              </Box>

              <Divider />

              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  gap: 1.5,
                  bgcolor: '#f8fafc',
                }}
              >
                {isMessagesLoading && <LoadingState message="Loading messages..." />}

                {isMessagesError && (
                  <ErrorState
                    message="Failed to load messages."
                    onRetry={() => {
                      void refetchMessages();
                    }}
                  />
                )}

                {!isMessagesLoading &&
                  !isMessagesError &&
                  messages.length === 0 && (
                    <EmptyState
                      title="No messages yet"
                      description="Start the conversation by sending a message."
                    />
                  )}

                {!isMessagesLoading &&
                  !isMessagesError &&
                  messages.map((message) => (
                    <Box
                      key={message.publicId}
                      sx={{
                        display: 'flex',
                        justifyContent: message.isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '70%',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: message.isMine ? 'primary.main' : 'background.paper',
                          color: message.isMine ? 'primary.contrastText' : 'text.primary',
                          boxShadow: 1,
                        }}
                      >
                        {!message.isMine && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontWeight: 700,
                              mb: 0.5,
                            }}
                          >
                            {message.senderName}
                          </Typography>
                        )}

                        <Typography variant="body2">{message.messageText}</Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.75,
                            opacity: 0.8,
                            textAlign: 'right',
                          }}
                        >
                          {new Date(message.sentAtUtc).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
              </Box>

              <Divider />

              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 2,
                  display: 'flex',
                  gap: 1,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  disabled={sendMessageMutation.isPending}
                />

                <Button
                  type="submit"
                  variant="contained"
                  endIcon={
                    sendMessageMutation.isPending ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                  disabled={sendMessageMutation.isPending || !messageText.trim()}
                >
                  Send
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>

      <Dialog
        open={isDirectDialogOpen}
        onClose={handleCloseDirectDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleCreateDirectSubmit}>
          <DialogTitle>New Direct Conversation</DialogTitle>

          <DialogContent>
            {directDialogError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {directDialogError}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Target User Id"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
              sx={{ mt: 1 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Paste the target user id for now. User search dropdown will be added later.
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseDirectDialog} disabled={createDirectMutation.isPending}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={createDirectMutation.isPending}>
              {createDirectMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={isGroupDialogOpen}
        onClose={handleCloseGroupDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleCreateGroupSubmit}>
          <DialogTitle>New Group Conversation</DialogTitle>

          <DialogContent>
            {groupDialogError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {groupDialogError}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Group Title"
              value={groupTitle}
              onChange={(event) => setGroupTitle(event.target.value)}
              sx={{ mt: 1, mb: 2 }}
            />

            <TextField
              fullWidth
              label="Participant User Ids"
              placeholder="id1, id2, id3"
              value={groupParticipantIds}
              onChange={(event) => setGroupParticipantIds(event.target.value)}
              multiline
              minRows={3}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Separate multiple user ids with commas.
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseGroupDialog} disabled={createGroupMutation.isPending}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}