import 'package:flutter/material.dart';
import 'chat_service.dart';
import 'chat_models.dart';
import 'chat_room_page.dart';

class ChatListPage extends StatefulWidget {
  final String token;
  final String engineerId;

  const ChatListPage({
    super.key,
    required this.token,
    required this.engineerId,
  });

  @override
  State<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends State<ChatListPage> {
  late ChatService _chatService;
  List<ChatConversation>? _conversations;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _chatService = ChatService(token: widget.token);
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final conversations = await _chatService.getMyConversations();
      setState(() {
        _conversations = conversations;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load conversations';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadConversations,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
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
              onPressed: _loadConversations,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_conversations == null || _conversations!.isEmpty) {
      return const Center(
        child: Text('No messages yet', style: TextStyle(color: Colors.grey, fontSize: 16)),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadConversations,
      child: ListView.builder(
        itemCount: _conversations!.length,
        itemBuilder: (context, index) {
          final conv = _conversations![index];
          final title = conv.title ?? 'Support';
          final preview = conv.lastMessage?.messageText ?? 'No messages yet';
          final hasUnread = conv.unreadCount > 0;

          return ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.blue.shade100,
              child: Text(title[0].toUpperCase()),
            ),
            title: Text(
              title,
              style: TextStyle(fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal),
            ),
            subtitle: Text(
              preview,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal),
            ),
            trailing: hasUnread
                ? Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    child: Text(
                      '${conv.unreadCount}',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  )
                : null,
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChatRoomPage(
                    token: widget.token,
                    conversationId: conv.publicId,
                    title: title,
                  ),
                ),
              );
              // Refresh when coming back
              _loadConversations();
            },
          );
        },
      ),
    );
  }
}
