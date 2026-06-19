import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '../auth/tokenStorage';
import type { ChatRealtimeMessageResponse } from '../types/chat';

const baseURL = import.meta.env.VITE_API_BASE_URL as string;

export interface ChatHubHandlers {
  onMessageReceived?: (message: ChatRealtimeMessageResponse) => void;
  onConversationUpdated?: (event: unknown) => void;
  onConversationRead?: (event: unknown) => void;
  onParticipantsChanged?: (event: unknown) => void;
}

export function createChatHubConnection(handlers: ChatHubHandlers) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${baseURL}/hubs/chat`, {
      accessTokenFactory: () => getAccessToken() ?? '',
    })
    .withAutomaticReconnect()
    .build();

  if (handlers.onMessageReceived) {
    connection.on('messageReceived', handlers.onMessageReceived);
  }

  if (handlers.onConversationUpdated) {
    connection.on('conversationUpdated', handlers.onConversationUpdated);
  }

  if (handlers.onConversationRead) {
    connection.on('conversationRead', handlers.onConversationRead);
  }

  if (handlers.onParticipantsChanged) {
    connection.on('participantsChanged', handlers.onParticipantsChanged);
  }

  return connection;
}