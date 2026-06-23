import 'dart:async';
import 'package:signalr_netcore/signalr_client.dart';
import '../../core/network/api_client.dart';
import 'chat_models.dart';

class ChatSignalRClient {
  HubConnection? _hubConnection;
  final String token;

  final _messageController = StreamController<ChatRealtimeMessage>.broadcast();
  Stream<ChatRealtimeMessage> get onMessageReceived => _messageController.stream;

  ChatSignalRClient({required this.token});

  Future<void> connect() async {
    if (_hubConnection != null && _hubConnection!.state == HubConnectionState.Connected) {
      return;
    }

    final hubUrl = ApiClient.baseUrl.replaceFirst('/api', '/hubs/chat');

    _hubConnection = HubConnectionBuilder()
        .withUrl(hubUrl, options: HttpConnectionOptions(
          accessTokenFactory: () async => token,
        ))
        .withAutomaticReconnect()
        .build();

    _hubConnection!.on('messageReceived', _handleMessageReceived);
    // Other events like 'conversationUpdated', 'messageRead' could be handled if needed.

    try {
      await _hubConnection!.start();
    } catch (e) {
      // Ignore
    }
  }

  void _handleMessageReceived(List<Object?>? arguments) {
    if (arguments != null && arguments.isNotEmpty) {
      final data = arguments[0] as Map<String, dynamic>;
      final msg = ChatRealtimeMessage.fromJson(data);
      _messageController.add(msg);
    }
  }

  Future<void> joinConversation(String conversationId) async {
    if (_hubConnection != null && _hubConnection!.state == HubConnectionState.Connected) {
      try {
        await _hubConnection!.invoke('JoinConversation', args: [conversationId]);
      } catch (e) {
        // Ignore
      }
    }
  }

  Future<void> dispose() async {
    if (_hubConnection != null) {
      await _hubConnection!.stop();
      _hubConnection = null;
    }
    _messageController.close();
  }
}
