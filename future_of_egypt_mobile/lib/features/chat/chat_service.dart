import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/network/api_client.dart';
import 'chat_models.dart';

class ChatService {
  final String token;

  ChatService({required this.token});

  Future<List<ChatConversation>> getMyConversations() async {
    final url = ApiClient.baseUrl.replaceFirst('/api', '/api/Chat/conversations');
    final response = await http.get(
      Uri.parse(url),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final items = json['items'] as List;
      return items.map((e) => ChatConversation.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load conversations');
    }
  }

  Future<List<ChatMessage>> getMessages(String conversationId) async {
    final url = ApiClient.baseUrl.replaceFirst('/api', '/api/Chat/conversations/$conversationId/messages');
    final response = await http.get(
      Uri.parse(url),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final items = json['items'] as List;
      return items.map((e) => ChatMessage.fromJson(e)).toList().reversed.toList();
    } else {
      throw Exception('Failed to load messages');
    }
  }

  Future<void> sendMessage(String conversationId, String text) async {
    final url = ApiClient.baseUrl.replaceFirst('/api', '/api/Chat/conversations/$conversationId/messages');
    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'messageText': text}),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Failed to send message');
    }
  }

  Future<void> markAsRead(String conversationId) async {
    final url = ApiClient.baseUrl.replaceFirst('/api', '/api/Chat/conversations/$conversationId/read');
    await http.post(
      Uri.parse(url),
      headers: {'Authorization': 'Bearer $token'},
    );
  }
}
