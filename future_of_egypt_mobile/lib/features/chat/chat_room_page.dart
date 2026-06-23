import 'dart:async';
import 'package:flutter/material.dart';
import 'chat_service.dart';
import 'chat_models.dart';
import 'chat_signalr_client.dart';

class ChatRoomPage extends StatefulWidget {
  final String token;
  final String conversationId;
  final String title;

  const ChatRoomPage({
    super.key,
    required this.token,
    required this.conversationId,
    required this.title,
  });

  @override
  State<ChatRoomPage> createState() => _ChatRoomPageState();
}

class _ChatRoomPageState extends State<ChatRoomPage> {
  late ChatService _chatService;
  late ChatSignalRClient _signalRClient;
  StreamSubscription? _msgSub;
  
  final _messages = <ChatMessage>[];
  bool _isLoading = true;
  String? _error;

  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _chatService = ChatService(token: widget.token);
    _signalRClient = ChatSignalRClient(token: widget.token);
    
    _initChat();
  }

  Future<void> _initChat() async {
    await _loadMessages();
    
    await _signalRClient.connect();
    await _signalRClient.joinConversation(widget.conversationId);
    
    _msgSub = _signalRClient.onMessageReceived.listen((msg) {
      if (msg.conversationPublicId == widget.conversationId) {
        // Prevent duplicate if we already have it (from sending it ourselves)
        if (!_messages.any((m) => m.publicId == msg.publicId)) {
          setState(() {
            _messages.add(ChatMessage(
              publicId: msg.publicId,
              senderUserId: msg.senderUserId,
              senderName: msg.senderName,
              messageText: msg.messageText,
              type: msg.type,
              sentAtUtc: msg.sentAtUtc,
              isMine: false, // In reality, we could check senderUserId against our own
            ));
          });
          _scrollToBottom();
          _chatService.markAsRead(widget.conversationId).catchError((_) {});
        }
      }
    });

    // Mark as read when entering
    _chatService.markAsRead(widget.conversationId).catchError((_) {});
  }

  Future<void> _loadMessages() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final msgs = await _chatService.getMessages(widget.conversationId);
      setState(() {
        _messages.clear();
        _messages.addAll(msgs);
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _error = 'Failed to load messages';
        _isLoading = false;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    setState(() => _isSending = true);
    try {
      _textController.clear();
      await _chatService.sendMessage(widget.conversationId, text);
      // Wait for SignalR to echo it back, or we could optimistically add it.
      // The backend SignalR sends messageReceived to the whole group, including sender.
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to send message')),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _signalRClient.dispose();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(child: _buildMessagesArea()),
            _buildInputArea(),
          ],
        ),
      ),
    );
  }

  Widget _buildMessagesArea() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadMessages,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_messages.isEmpty) {
      return const Center(
        child: Text('No messages yet', style: TextStyle(color: Colors.grey)),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final msg = _messages[index];
        final isMine = msg.isMine;

        return Align(
          alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isMine ? Colors.blue : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(20),
            ),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!isMine)
                  Text(
                    msg.senderName,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
                    ),
                  ),
                if (!isMine) const SizedBox(height: 4),
                Text(
                  msg.messageText,
                  style: TextStyle(
                    color: isMine ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatTime(msg.sentAtUtc),
                  style: TextStyle(
                    fontSize: 10,
                    color: isMine ? Colors.white70 : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.2),
            spreadRadius: 1,
            blurRadius: 3,
            offset: const Offset(0, -1),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey.shade100,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          FloatingActionButton(
            mini: true,
            elevation: 0,
            onPressed: _isSending ? null : _sendMessage,
            child: _isSending
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final local = time.toLocal();
    final hour = local.hour.toString().padLeft(2, '0');
    final min = local.minute.toString().padLeft(2, '0');
    return '$hour:$min';
  }
}
