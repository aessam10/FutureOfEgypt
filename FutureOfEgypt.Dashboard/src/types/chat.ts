export interface ChatParticipantResponse {
  userId: string;
  displayName: string;
  email?: string | null;
  role: number;
}

export interface ChatMessagePreviewResponse {
  publicId: string;
  senderUserId: string;
  senderName: string;
  messageText: string;
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
}

export interface ChatMessageResponse {
  publicId: string;
  senderUserId: string;
  senderName: string;
  messageText: string;
  type: number;
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
}

export interface AddChatParticipantsRequest {
  userIds: string[];
}