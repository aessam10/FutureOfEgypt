import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'chat_service.dart';
import 'chat_models.dart';
import 'chat_signalr_client.dart';
import 'widgets/auth_avatar.dart';

class ChatRoomPage extends StatefulWidget {
  final String token;
  final String conversationId;
  final String title;
  final String? avatarUrl;
  final bool canSendMessage;

  const ChatRoomPage({
    super.key,
    required this.token,
    required this.conversationId,
    required this.title,
    this.avatarUrl,
    this.canSendMessage = true,
  });

  @override
  State<ChatRoomPage> createState() => _ChatRoomPageState();
}

class _ChatRoomPageState extends State<ChatRoomPage> {
  late ChatService _chatService;
  late ChatSignalRClient _signalRClient;
  StreamSubscription? _msgSub;
  String? _myUserId;
  
  final _messages = <ChatMessage>[];
  bool _isLoading = true;
  String? _error;

  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;
  late bool _canSendMessage;
  ChatConversation? _conversation;

  @override
  void initState() {
    super.initState();
    _canSendMessage = widget.canSendMessage;
    _myUserId = _getUserIdFromToken(widget.token);
    _chatService = ChatService(token: widget.token);
    _signalRClient = ChatSignalRClient(token: widget.token);
    
    _initChat();
  }

  Future<void> _initChat() async {
    await _loadMessages();
    
    try {
      final conv = await _chatService.getConversation(widget.conversationId);
      if (mounted) {
        setState(() {
          _canSendMessage = conv.canSendMessage;
          _conversation = conv;
        });
      }
    } catch (_) {
      debugPrint('Failed to refresh conversation state');
    }

    await _signalRClient.connect();
    await _signalRClient.joinConversation(widget.conversationId);
    
    _msgSub = _signalRClient.onMessageReceived.listen((msg) {
      if (msg.conversationPublicId == widget.conversationId) {
        if (!_messages.any((m) => m.publicId.trim().toLowerCase() == msg.publicId.trim().toLowerCase())) {
          final isMine = _isMyMessage(msg.senderUserId);
          setState(() {
            _messages.add(ChatMessage(
              publicId: msg.publicId,
              senderUserId: msg.senderUserId,
              senderName: msg.senderName,
              messageText: msg.messageText,
              type: msg.type,
              profileImageUrl: msg.profileImageUrl,
              sentAtUtc: msg.sentAtUtc,
              isMine: isMine,
            ));
            _sortMessagesOldestToNewest();
          });
          _scrollToBottom();
          _chatService.markAsRead(widget.conversationId).catchError((_) {});
        }
      }
    });

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
        _sortMessagesOldestToNewest();
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

  bool _isMyMessage(String? senderId) {
    if (_myUserId == null || senderId == null) return false;
    return _myUserId!.trim().toLowerCase() == senderId.trim().toLowerCase();
  }

  void _sortMessagesOldestToNewest() {
    _messages.sort((a, b) => a.sentAtUtc.compareTo(b.sentAtUtc));
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    setState(() => _isSending = true);
    try {
      _textController.clear();
      await _chatService.sendMessage(widget.conversationId, text);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to send message')),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _muteConversation() async {
    try {
      final conv = await _chatService.muteConversation(widget.conversationId);
      if (mounted) setState(() => _conversation = conv);
    } catch (_) {}
  }

  Future<void> _unmuteConversation() async {
    try {
      final conv = await _chatService.unmuteConversation(widget.conversationId);
      if (mounted) setState(() => _conversation = conv);
    } catch (_) {}
  }

  Future<void> _archiveConversation() async {
    try {
      await _chatService.archiveConversation(widget.conversationId);
      if (mounted) Navigator.pop(context);
    } catch (_) {}
  }

  Future<void> _unarchiveConversation() async {
    try {
      final conv = await _chatService.unarchiveConversation(widget.conversationId);
      if (mounted) setState(() => _conversation = conv);
    } catch (_) {}
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
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            AuthAvatar(
              name: widget.title,
              url: widget.avatarUrl,
              token: widget.token,
              radius: 18,
            ),
            const SizedBox(width: 12),
            Text(widget.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            if (_conversation?.isMuted == true)
              const Padding(
                padding: EdgeInsets.only(left: 8.0),
                child: Icon(Icons.volume_off, size: 18, color: Colors.grey),
              ),
          ],
        ),
        elevation: 0.5,
        actions: [
          if (_conversation != null)
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'mute':
                    _muteConversation();
                    break;
                  case 'unmute':
                    _unmuteConversation();
                    break;
                  case 'archive':
                    _archiveConversation();
                    break;
                  case 'unarchive':
                    _unarchiveConversation();
                    break;
                }
              },
              itemBuilder: (context) => [
                if (_conversation!.isMuted)
                  const PopupMenuItem(value: 'unmute', child: Text('Unmute Conversation'))
                else
                  const PopupMenuItem(value: 'mute', child: Text('Mute Conversation')),
                if (_conversation!.isArchived)
                  const PopupMenuItem(value: 'unarchive', child: Text('Unarchive Conversation'))
                else
                  const PopupMenuItem(value: 'archive', child: Text('Archive Conversation')),
              ],
            ),
        ],
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
        final isMine = _myUserId != null ? _isMyMessage(msg.senderUserId) : msg.isMine;
        
        final prevMsg = index > 0 ? _messages[index - 1] : null;
        final nextMsg = index < _messages.length - 1 ? _messages[index + 1] : null;
        
        final showAvatar = !isMine && (nextMsg == null || nextMsg.senderUserId != msg.senderUserId);
        final showName = !isMine && (prevMsg == null || prevMsg.senderUserId != msg.senderUserId);

        return Padding(
          padding: EdgeInsets.only(bottom: showAvatar ? 16 : 4),
          child: Row(
            mainAxisAlignment: isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (!isMine) ...[
                if (showAvatar)
                  AuthAvatar(
                    name: msg.senderName,
                    url: msg.profileImageUrl,
                    token: widget.token,
                    radius: 14,
                  )
                else
                  const SizedBox(width: 28),
                const SizedBox(width: 8),
              ],
              
              Flexible(
                child: Column(
                  crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    if (showName)
                      Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 4),
                        child: Text(
                          msg.senderName,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ),
                    
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isMine ? Colors.blue : Colors.white,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(20),
                          topRight: const Radius.circular(20),
                          bottomLeft: Radius.circular(isMine ? 20 : 4),
                          bottomRight: Radius.circular(isMine ? 4 : 20),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 2,
                            offset: const Offset(0, 1),
                          )
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                        children: [
                          Text(
                            msg.messageText,
                            style: TextStyle(
                              color: isMine ? Colors.white : Colors.black87,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatTime(msg.sentAtUtc),
                            style: TextStyle(
                              fontSize: 10,
                              color: isMine ? Colors.white.withOpacity(0.8) : Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              if (isMine) const SizedBox(width: 36), // To balance out the avatar width on the other side
            ],
          ),
        );
      },
    );
  }

  Widget _buildInputArea() {
    if (!_canSendMessage) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        color: Colors.amber.shade100,
        child: Text(
          "This user is unavailable. You cannot send messages.",
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.amber.shade900,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 3,
            offset: const Offset(0, -1),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _textController,
                minLines: 1,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Message...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: Colors.grey.shade100,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                color: Colors.blue,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                onPressed: _isSending ? null : _sendMessage,
                icon: _isSending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final local = time.toLocal();
    final hour = local.hour.toString().padLeft(2, '0');
    final min = local.minute.toString().padLeft(2, '0');
    return '$hour:$min';
  }

  String? _getUserIdFromToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final decoded = utf8.decode(base64Url.decode(normalized));
      final map = jsonDecode(decoded);
      return map['sub'] ?? 
             map['nameid'] ?? 
             map['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    } catch (e) {
      debugPrint('Error parsing token for userId: $e');
      return null;
    }
  }
}
