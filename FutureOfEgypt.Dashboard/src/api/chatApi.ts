import { axiosClient } from './axiosClient';
import type { PagedResponse } from '../types/common';
import type {
  AddChatParticipantsRequest,
  ChatConversationResponse,
  ChatMessageResponse,
  ChatUserSearchResponse,
  CreateDirectChatRequest,
  CreateGroupChatRequest,
  SendChatMessageRequest,
} from '../types/chat';

export interface GetChatConversationsParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export interface GetChatMessagesParams {
  pageNumber: number;
  pageSize: number;
}

export interface SearchChatUsersParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export async function getMyConversations(params: GetChatConversationsParams) {
  const response = await axiosClient.get<PagedResponse<ChatConversationResponse>>(
    '/api/Chat/conversations',
    {
      params,
    },
  );

  return response.data;
}

export async function createDirectConversation(request: CreateDirectChatRequest) {
  const response = await axiosClient.post<ChatConversationResponse>(
    '/api/Chat/conversations/direct',
    request,
  );

  return response.data;
}

export async function createGroupConversation(request: CreateGroupChatRequest) {
  const response = await axiosClient.post<ChatConversationResponse>(
    '/api/Chat/conversations/group',
    request,
  );

  return response.data;
}

export async function getConversationMessages(
  conversationPublicId: string,
  params: GetChatMessagesParams,
) {
  const response = await axiosClient.get<PagedResponse<ChatMessageResponse>>(
    `/api/Chat/conversations/${conversationPublicId}/messages`,
    {
      params,
    },
  );

  return response.data;
}

export async function sendChatMessage(
  conversationPublicId: string,
  request: SendChatMessageRequest,
) {
  const response = await axiosClient.post<ChatMessageResponse>(
    `/api/Chat/conversations/${conversationPublicId}/messages`,
    request,
  );

  return response.data;
}

export async function markConversationAsRead(conversationPublicId: string) {
  await axiosClient.post(`/api/Chat/conversations/${conversationPublicId}/read`);
}

export async function searchChatUsers(params: SearchChatUsersParams) {
  const response = await axiosClient.get<PagedResponse<ChatUserSearchResponse>>(
    '/api/Chat/users',
    {
      params,
    },
  );

  return response.data;
}

export async function addChatParticipants(
  conversationPublicId: string,
  request: AddChatParticipantsRequest,
) {
  await axiosClient.post(
    `/api/Chat/conversations/${conversationPublicId}/participants`,
    request,
  );
}

export async function removeChatParticipant(
  conversationPublicId: string,
  targetUserId: string,
) {
  await axiosClient.delete(
    `/api/Chat/conversations/${conversationPublicId}/participants/${targetUserId}`,
  );
}