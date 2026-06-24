import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../core/network/api_client.dart';
import 'chat_models.dart';

class ChatService {
  final String token;

  ChatService({required this.token});

  Future<List<ChatConversation>> getMyConversations() async {
    final endpoint = 'Chat/conversations';
    
    debugPrint('[FOE_CHAT_MOBILE] loading conversation');
    debugPrint('[FOE_CHAT_MOBILE] request url: ${ApiClient.baseUrl}/$endpoint');
    debugPrint('[FOE_CHAT_MOBILE] token exists: ${token.isNotEmpty}');
    debugPrint('[FOE_CHAT_MOBILE] versionCode: ${ApiClient.appVersionCode}');

    final response = await ApiClient.getWithToken(endpoint, token);

    debugPrint('[FOE_CHAT_MOBILE] response status: ${response.statusCode}');

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      List<dynamic> items;
      if (json is Map && json.containsKey('items')) {
        items = json['items'] as List;
      } else if (json is List) {
        items = json;
      } else {
        items = [];
      }
      debugPrint('[FOE_CHAT_MOBILE] parsed conversations count: ${items.length}');
      return items.map((e) => ChatConversation.fromJson(e)).toList();
    } else {
      debugPrint('[FOE_CHAT_MOBILE] response body: ${response.body}');
      if (response.statusCode == 401) {
        throw Exception('Session expired (401)');
      } else if (response.statusCode == 403) {
        throw Exception('Access denied (403)');
      } else {
        throw Exception('Failed to load conversations: HTTP ${response.statusCode}');
      }
    }
  }

  Future<List<ChatMessage>> getMessages(String conversationId) async {
    final endpoint = 'Chat/conversations/$conversationId/messages';
    final response = await ApiClient.getWithToken(endpoint, token);

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final items = json['items'] as List;
      return items.map((e) => ChatMessage.fromJson(e)).toList().reversed.toList();
    } else {
      throw Exception('Failed to load messages');
    }
  }

  Future<void> sendMessage(String conversationId, String text) async {
    final endpoint = 'Chat/conversations/$conversationId/messages';
    final response = await ApiClient.postWithToken(
      endpoint,
      {'messageText': text},
      token,
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Failed to send message');
    }
  }

  Future<void> markAsRead(String conversationId) async {
    final endpoint = 'Chat/conversations/$conversationId/read';
    await ApiClient.postWithToken(endpoint, {}, token);
  }

  Future<List<ChatUserSearch>> searchUsers(String query) async {
    final endpoint = 'Chat/users?search=$query&pageNumber=1&pageSize=20';
    final response = await ApiClient.getWithToken(endpoint, token);

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final items = json['items'] as List;
      return items.map((e) => ChatUserSearch.fromJson(e)).toList();
    } else {
      throw Exception('Failed to search users');
    }
  }

  Future<ChatConversation> createDirectConversation(String targetUserId) async {
    final endpoint = 'Chat/conversations/direct';
    final response = await ApiClient.postWithToken(
      endpoint,
      {'targetUserId': targetUserId},
      token,
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final json = jsonDecode(response.body);
      return ChatConversation.fromJson(json);
    } else {
      throw Exception('Failed to create direct conversation');
    }
  }
}
