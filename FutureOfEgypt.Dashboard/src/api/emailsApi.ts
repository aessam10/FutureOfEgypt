import { axiosClient } from './axiosClient';
import type { EmailMessageResponse, SendEmailRequest } from '../types/emails';

export async function sendEmail(request: SendEmailRequest) {
  const response = await axiosClient.post<EmailMessageResponse>(
    '/api/Emails/send',
    request,
  );

  return response.data;
}

export async function getEmails() {
  const response = await axiosClient.get<EmailMessageResponse[]>('/api/Emails');

  return response.data;
}