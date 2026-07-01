export interface ChatParticipantResponse {
  userId: string;
  displayName: string;
  email?: string | null;
  profileImageUrl?: string | null;
  role: number;
  isAvailable: boolean;
}

export interface ChatMessagePreviewResponse {
  publicId: string;
  senderUserId: string;
  senderName: string;
  messageText: string;
  profileImageUrl?: string | null;
  sentAtUtc: string;
}

export interface ChatConversationResponse {
  publicId: string;
  title?: string | null;
  type: number;
  lastMessageAtUtc: string;
  unreadCount: number;
  lastMessage?: ChatMessagePreviewResponse | null;
  participants: ChatParticipantResponse[];
  canSendMessage: boolean;
  isMuted: boolean;
  mutedUntilUtc?: string | null;
  isArchived: boolean;
}

export interface ChatMessageResponse {
  publicId: string;
  senderUserId: string;
  senderName: string;
  messageText: string;
  type: number;
  profileImageUrl?: string | null;
  sentAtUtc: string;
  isMine: boolean;
}

export interface ChatRealtimeMessageResponse {
  publicId: string;
  conversationPublicId: string;
  senderUserId: string;
  senderName: string;
  messageText: string;
  type: number;
  profileImageUrl?: string | null;
  sentAtUtc: string;
}

export interface CreateDirectChatRequest {
  targetUserId: string;
}

export interface CreateGroupChatRequest {
  title: string;
  participantUserIds: string[];
}

export interface SendChatMessageRequest {
  messageText: string;
}

export interface ChatUserSearchResponse {
  userId: string;
  displayName: string;
  email?: string | null;
  profileImageUrl?: string | null;
  isAvailable?: boolean;
}

export interface AddChatParticipantsRequest {
  userIds: string[];
}