import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '../auth/tokenStorage';
import type { ChatRealtimeMessageResponse } from '../types/chat';

const apiBaseURL = import.meta.env.VITE_API_BASE_URL as string;
const hubBaseURL = apiBaseURL.replace(/\/api\/?$/, '');

export interface ChatHubHandlers {
  onMessageReceived?: (message: ChatRealtimeMessageResponse) => void;
  onConversationUpdated?: (event: unknown) => void;
  onConversationRead?: (event: unknown) => void;
  onParticipantsChanged?: (event: unknown) => void;
}

export function createChatHubConnection(handlers: ChatHubHandlers) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${hubBaseURL}/hubs/chat`, {
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