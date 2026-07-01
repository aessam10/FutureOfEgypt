import { useEffect, useMemo, useRef, useState } from 'react';
import { axiosClient } from '../api/axiosClient';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Badge,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Menu,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { AuthAvatar } from '../components/AuthAvatar';
import {
  createDirectConversation,
  getConversation,
  getConversationMessages,
  getMyConversations,
  markConversationAsRead,
  searchChatUsers,
  sendChatMessage,
  muteConversation,
  unmuteConversation,
  archiveConversation,
  unarchiveConversation,
} from '../api/chatApi';
import { createChatHubConnection } from '../signalr/chatHub';
import { useAuth } from '../auth/AuthContext';
import type {
  ChatConversationResponse,
  ChatMessageResponse,
  ChatRealtimeMessageResponse
} from '../types/chat';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getConversationTitle(conversation: ChatConversationResponse, currentUserId?: string): string {
  if (conversation.type === 1) { // Direct
    const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
    return otherParticipant?.displayName ?? 'User';
  }
  if (conversation.title) return conversation.title;
  return 'Group Chat';
}

function getConversationAvatarUrl(conversation: ChatConversationResponse, currentUserId?: string): string | null | undefined {
  if (conversation.type === 1) { // Direct
    const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
    return otherParticipant?.profileImageUrl;
  }
  return null; // Group could have an icon later
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
    profileImageUrl: msg.profileImageUrl,
    isMine: msg.senderUserId === currentUserId,
  };
}

// ─── Image Preview Modal ─────────────────────────────────────────────────────
function ImagePreviewModal({
  open,
  onClose,
  url,
  name
}: {
  open: boolean;
  onClose: () => void;
  url?: string | null;
  name: string;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    async function fetchImage() {
      if (!url) return;
      try {
        const response = await axiosClient.get(url, { responseType: 'blob' });
        if (!isMounted) return;
        const blob = response.data;
        objectUrl = URL.createObjectURL(blob);
        setImgSrc(objectUrl);
      } catch (err) {
        console.error('Failed to load full image preview:', err);
      }
    }

    if (open && url) {
      fetchImage();
    } else {
      setImgSrc(null);
    }

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, url]);

  if (!url || !imgSrc) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          style: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          },
        },
      }}
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
            zIndex: 10,
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
        <img
          src={imgSrc}
          alt={name}
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            borderRadius: '4px',
            display: 'block',
          }}
        />
      </Box>
    </Dialog>
  );
}

// ─── Profile Preview Modal ───────────────────────────────────────────────────
function ProfilePreviewModal({
  open,
  onClose,
  name,
  role,
  url
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  role?: string;
  url?: string | null;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Profile</span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pb: 4 }}>
        <AuthAvatar name={name} url={url} size="2xl" className="mb-4 shadow-lg" />
        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>{name}</Typography>
        {role && <Typography variant="body2" color="text.secondary">{role}</Typography>}
      </DialogContent>
    </Dialog>
  );
}

// ─── Header Menu Component ───────────────────────────────────────────────────
function ConversationHeaderMenu({
  conversation,
  onMute,
  onUnmute,
  onArchive,
  onUnarchive
}: {
  conversation: ChatConversationResponse;
  onMute: () => void;
  onUnmute: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleClick} size="small" sx={{ color: 'text.secondary' }}>
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { handleClose(); conversation.isMuted ? onUnmute() : onMute(); }}>
          {conversation.isMuted ? 'Unmute Conversation' : 'Mute Conversation'}
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); conversation.isArchived ? onUnarchive() : onArchive(); }}>
          {conversation.isArchived ? 'Unarchive Conversation' : 'Archive Conversation'}
        </MenuItem>
      </Menu>
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ChatPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversationResponse | null>(null);
  const [messageText, setMessageText] = useState('');
  
  const [previewProfile, setPreviewProfile] = useState<{name: string, role?: string, url?: string | null} | null>(null);
  const [imagePreview, setImagePreview] = useState<{name: string, url: string | null} | null>(null);

  // Scroll ref for auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Queries ────────────────────────────────────────────────────
  const {
    data: conversationsData,
    isLoading: isConversationsLoading,
  } = useQuery({
    queryKey: ['chat-conversations', debouncedSearch, showArchived],
    queryFn: () => getMyConversations({ page: 1, limit: 50, search: debouncedSearch.trim() || undefined, archived: showArchived }),
  });

  const {
    data: usersSearchData,
    isLoading: isUsersSearchLoading,
  } = useQuery({
    queryKey: ['chat-users', debouncedSearch],
    queryFn: () => searchChatUsers({ pageNumber: 1, pageSize: 20, search: debouncedSearch.trim() || undefined }),
    enabled: debouncedSearch.trim().length > 0, // only search users if there's a search term
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

  const { data: latestConversationData } = useQuery({
    queryKey: ['chat-conversation', selectedConversationPublicId],
    queryFn: () => getConversation(selectedConversationPublicId!),
    enabled: Boolean(selectedConversationPublicId),
  });

  // Use the fetched single conversation data if available to keep state fresh.
  const activeConversation = latestConversationData || selectedConversation;

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
      setShowArchived(false);
      setSearch(''); // clear search
    },
  });

  const muteMutation = useMutation({
    mutationFn: (id: string) => muteConversation(id, undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      if (selectedConversationPublicId) {
        await queryClient.invalidateQueries({ queryKey: ['chat-conversation', selectedConversationPublicId] });
      }
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: (id: string) => unmuteConversation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      if (selectedConversationPublicId) {
        await queryClient.invalidateQueries({ queryKey: ['chat-conversation', selectedConversationPublicId] });
      }
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveConversation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setSelectedConversation(null);
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => unarchiveConversation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setSelectedConversation(null);
    },
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
                items: [...current.items, convertRealtimeToMessage(message, user?.userId)],
                totalCount: current.totalCount + 1,
              };
            },
          );
          void markReadMutation.mutateAsync(message.conversationPublicId);
        }
      },
      onConversationUpdated: () => void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] }),
      onConversationRead: () => void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] }),
      onParticipantsChanged: () => void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] }),
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

  const sortedMessages = useMemo(() => {
    if (!messagesData?.items) return [];
    const items = messagesData.items;
    if (items.length < 2) return [...items];
    const first = new Date(items[0].sentAtUtc).getTime();
    const second = new Date(items[1].sentAtUtc).getTime();
    return first > second ? [...items].reverse() : [...items];
  }, [messagesData?.items]);

  const conversations = conversationsData?.items ?? [];
  const searchedUsers = usersSearchData?.items ?? [];

  const showUsersList = debouncedSearch.trim().length > 0;

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

  function handleUserClick(targetUserId: string) {
    createDirectMutation.mutate(targetUserId);
  }

  function openPreview(name: string, url: string | null | undefined, role?: string | number) {
    let roleStr = typeof role === 'number' ? getRoleName(role) : role;
    setPreviewProfile({ name, url, role: roleStr });
  }

  function openImagePreview(name: string, url: string | null | undefined) {
    if (!url) return;
    setImagePreview({ name, url });
  }

  function getRoleName(roleNum: number) {
    if (roleNum === 1) return 'Owner';
    if (roleNum === 2) return 'Admin';
    if (roleNum === 3) return 'Member';
    return '';
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Connect with your team instantly"
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: 0,
          height: 'calc(100vh - 180px)',
          minHeight: 520,
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
        }}
      >
        {/* ── Conversations sidebar ────────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#f8fafc',
          }}
          role="navigation"
        >
          {/* Header */}
          <Box sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ToggleButtonGroup
              value={showArchived ? 'archived' : 'active'}
              exclusive
              onChange={(_, value) => {
                if (value !== null) {
                  setShowArchived(value === 'archived');
                  setSelectedConversation(null);
                }
              }}
              aria-label="conversation status"
              size="small"
              fullWidth
            >
              <ToggleButton value="active" aria-label="active conversations">
                Active
              </ToggleButton>
              <ToggleButton value="archived" aria-label="archived conversations">
                Archived
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField
              fullWidth
              size="small"
              placeholder="Search people or conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: '#fff'
                }
              }}
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

          {/* List Area */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {isConversationsLoading && !showUsersList && <LoadingState message="Loading..." />}
            
            {/* Conversations Section */}
            {conversations.length > 0 && (
               <List disablePadding>
                {showUsersList && <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary', fontWeight: 600 }}>CONVERSATIONS</Typography>}
                {conversations.map((conv) => {
                  const isSelected = selectedConversation?.publicId === conv.publicId;
                  const title = getConversationTitle(conv, user?.userId);
                  const avatarUrl = getConversationAvatarUrl(conv, user?.userId);

                  return (
                    <ListItemButton
                      key={conv.publicId}
                      selected={isSelected}
                      onClick={() => setSelectedConversation(conv)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        gap: 1.5,
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
                        },
                      }}
                    >
                      <AuthAvatar 
                        name={title} 
                        url={avatarUrl} 
                        size="lg" 
                        onClick={(e: any) => {
                          e.stopPropagation();
                          openImagePreview(title, avatarUrl);
                        }}
                      />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography noWrap sx={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.95rem', color: '#1e293b' }}>
                            {title}
                          </Typography>
                          {conv.unreadCount > 0 && (
                            <Badge
                              badgeContent={conv.unreadCount}
                              color="primary"
                              sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none' } }}
                            />
                          )}
                          {conv.isMuted && (
                            <VolumeOffIcon sx={{ ml: 1, fontSize: 16, color: 'text.disabled' }} />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography noWrap sx={{ color: conv.unreadCount > 0 ? 'text.primary' : 'text.secondary', fontSize: '0.85rem', fontWeight: conv.unreadCount > 0 ? 600 : 400 }}>
                            {conv.lastMessage?.messageText ?? 'No messages yet'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0, ml: 1 }}>
                            {formatConversationTime(conv.lastMessageAtUtc)}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItemButton>
                  );
                })}
              </List>
            )}

            {/* People Section */}
            {showUsersList && (
              <List disablePadding sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary', fontWeight: 600 }}>PEOPLE</Typography>
                
                {isUsersSearchLoading && <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>}
                
                {!isUsersSearchLoading && searchedUsers.length === 0 && (
                   <Typography variant="body2" sx={{ px: 2, py: 2, color: 'text.disabled', textAlign: 'center' }}>
                     No people found
                   </Typography>
                )}

                {searchedUsers.map((u) => (
                  <ListItemButton
                    key={u.userId}
                    onClick={() => handleUserClick(u.userId)}
                    sx={{ px: 2, py: 1, gap: 1.5 }}
                  >
                    <AuthAvatar 
                      name={u.displayName} 
                      url={u.profileImageUrl} 
                      size="md" 
                      onClick={(e: any) => {
                        e.stopPropagation();
                        openImagePreview(u.displayName, u.profileImageUrl);
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                        {u.displayName}
                      </Typography>
                    </Box>
                  </ListItemButton>
                ))}
              </List>
            )}

            {!isConversationsLoading && conversations.length === 0 && !showUsersList && (
              <EmptyState title="No conversations" description="Search people to start a chat" />
            )}
          </Box>
        </Box>

        {/* ── Message area ─────────────────────────────────────── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#fff' }}>
          {!selectedConversation && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, gap: 2 }}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <SendIcon sx={{ fontSize: 36, ml: -0.5 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155' }}>Your Messages</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', maxWidth: 300 }}>
                Select a conversation or search for someone to start chatting.
              </Typography>
            </Box>
          )}

          {selectedConversation && (
            <>
              {/* Active Header */}
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
                <AuthAvatar 
                  name={getConversationTitle(activeConversation!, user?.userId)} 
                  url={getConversationAvatarUrl(activeConversation!, user?.userId)} 
                  size="xl"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    openImagePreview(getConversationTitle(activeConversation!, user?.userId), getConversationAvatarUrl(activeConversation!, user?.userId));
                  }}
                />
                <Box 
                  onClick={() => openPreview(getConversationTitle(activeConversation!, user?.userId), getConversationAvatarUrl(activeConversation!, user?.userId))}
                  sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, flex: 1 }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center' }}>
                    {getConversationTitle(activeConversation!, user?.userId)}
                    {activeConversation!.isMuted && <VolumeOffIcon sx={{ ml: 1, fontSize: 18, color: 'text.disabled' }} />}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {activeConversation!.type === 1 ? 'Direct chat' : `Group chat · ${activeConversation!.participants.length} members`}
                  </Typography>
                </Box>
                
                {/* Header Menu */}
                <Box>
                  <ConversationHeaderMenu
                    conversation={activeConversation!}
                    onMute={() => muteMutation.mutate(activeConversation!.publicId)}
                    onUnmute={() => unmuteMutation.mutate(activeConversation!.publicId)}
                    onArchive={() => archiveMutation.mutate(activeConversation!.publicId)}
                    onUnarchive={() => unarchiveMutation.mutate(activeConversation!.publicId)}
                  />
                </Box>
              </Box>

              {/* Messages container */}
              <Box className="chat-messages-container" sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f8fafc' }}>
                {isMessagesLoading && <LoadingState message="Loading..." />}
                {isMessagesError && <ErrorState message="Failed to load messages." onRetry={() => { void refetchMessages(); }} />}
                {!isMessagesLoading && !isMessagesError && sortedMessages.length === 0 && (
                  <EmptyState title="No messages yet" description="Say hello!" />
                )}

                {!isMessagesLoading && !isMessagesError && sortedMessages.map((message, idx) => {
                  const prevMsg = idx > 0 ? sortedMessages[idx - 1] : null;
                  const showSenderName = !message.isMine && (!prevMsg || prevMsg.senderUserId !== message.senderUserId) && activeConversation!.type !== 1;
                  const showAvatar = !message.isMine && (idx === sortedMessages.length - 1 || sortedMessages[idx + 1].senderUserId !== message.senderUserId);

                  return (
                    <Box key={message.publicId} sx={{ display: 'flex', flexDirection: 'column', alignItems: message.isMine ? 'flex-end' : 'flex-start', mb: showAvatar ? 1 : 0 }}>
                      {showSenderName && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, ml: 5, fontSize: '0.75rem' }}>
                          {message.senderName}
                        </Typography>
                      )}
                      
                      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, maxWidth: '75%' }}>
                        {!message.isMine && (
                          <Box sx={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && (
                              <AuthAvatar 
                                name={message.senderName} 
                                url={message.profileImageUrl} 
                                size="sm" 
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  openImagePreview(message.senderName, message.profileImageUrl);
                                }}
                              />
                            )}
                          </Box>
                        )}
                        
                        <Box sx={{
                          px: 2.5,
                          py: 1.25,
                          borderRadius: message.isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                          backgroundColor: message.isMine ? '#3b82f6' : '#fff',
                          color: message.isMine ? '#fff' : '#1e293b',
                          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                          border: message.isMine ? 'none' : '1px solid #e2e8f0',
                        }}>
                          <Typography variant="body1" sx={{ lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                            {message.messageText}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, fontSize: '0.7rem', color: message.isMine ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}>
                            {formatMessageTime(message.sentAtUtc)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* Notice */}
              {!activeConversation!.canSendMessage && (
                <Box sx={{ px: 3, py: 1.5, bgcolor: '#fff3cd', color: '#856404', textAlign: 'center', borderTop: '1px solid #ffeeba' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    This user is unavailable. You can no longer send messages.
                  </Typography>
                </Box>
              )}

              {/* Message input */}
              <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, px: 3, display: 'flex', gap: 2, alignItems: 'center', bgcolor: '#fff', borderTop: '1px solid', borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sendMessageMutation.isPending || !activeConversation!.canSendMessage}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 4,
                      backgroundColor: '#f1f5f9',
                      '& fieldset': { border: 'none' },
                    }
                  }}
                />
                <IconButton
                  type="submit"
                  disabled={sendMessageMutation.isPending || !messageText.trim() || !activeConversation!.canSendMessage}
                  sx={{
                    bgcolor: messageText.trim() ? '#3b82f6' : '#e2e8f0',
                    color: '#fff',
                    p: 1.5,
                    '&:hover': { bgcolor: messageText.trim() ? '#2563eb' : '#e2e8f0' },
                    '&.Mui-disabled': { color: '#94a3b8', bgcolor: '#f1f5f9' }
                  }}
                >
                  {sendMessageMutation.isPending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                </IconButton>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {previewProfile && (
        <ProfilePreviewModal 
          open={!!previewProfile} 
          onClose={() => setPreviewProfile(null)} 
          name={previewProfile.name} 
          role={previewProfile.role} 
          url={previewProfile.url} 
        />
      )}

      {imagePreview && (
        <ImagePreviewModal
          open={!!imagePreview}
          onClose={() => setImagePreview(null)}
          name={imagePreview.name}
          url={imagePreview.url}
        />
      )}
    </>
  );
}