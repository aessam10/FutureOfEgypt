import 'package:flutter/material.dart';
import 'chat_service.dart';
import 'chat_models.dart';
import 'chat_room_page.dart';
import 'widgets/auth_avatar.dart';

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
  List<ChatUserSearch>? _searchedUsers;
  bool _isLoading = true;
  bool _isSearchingUsers = false;
  bool _showArchived = false;
  String? _error;
  
  final TextEditingController _searchController = TextEditingController();

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
      final conversations = await _chatService.getMyConversations(archived: _showArchived);
      setState(() {
        _conversations = conversations;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _searchPeople(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchedUsers = null;
      });
      return;
    }

    setState(() {
      _isSearchingUsers = true;
      _error = null;
    });

    try {
      final users = await _chatService.searchUsers(query);
      setState(() {
        _searchedUsers = users;
        _isSearchingUsers = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to search users';
        _isSearchingUsers = false;
      });
    }
  }

  Future<void> _createDirectAndOpen(String targetUserId) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (c) => const Center(child: CircularProgressIndicator()),
      );
      
      final conv = await _chatService.createDirectConversation(targetUserId);
      
      if (mounted) {
        Navigator.pop(context); // close loader
        
        final title = conv.title ?? 'Support';
        
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ChatRoomPage(
              token: widget.token,
              conversationId: conv.publicId,
              title: title,
              avatarUrl: _getConversationAvatarUrl(conv),
              canSendMessage: conv.canSendMessage,
            ),
          ),
        );
        _searchController.clear();
        _searchedUsers = null;
        _loadConversations();
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // close loader
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  String _getConversationTitle(ChatConversation conv) {
    if (conv.type == 1) { // Direct
      final other = conv.participants.where((p) => p.userId != widget.engineerId).firstOrNull;
      return other?.displayName ?? 'User';
    }
    return conv.title ?? 'Group Chat';
  }

  String? _getConversationAvatarUrl(ChatConversation conv) {
    if (conv.type == 1) {
      final other = conv.participants.where((p) => p.userId != widget.engineerId).firstOrNull;
      return other?.profileImageUrl;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final bool isSearching = _searchController.text.trim().isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadConversations,
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Theme.of(context).appBarTheme.backgroundColor ?? Theme.of(context).primaryColor,
            child: Column(
              children: [
                if (!isSearching) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      FilterChip(
                        label: const Text('Active'),
                        selected: !_showArchived,
                        onSelected: (val) {
                          if (val && _showArchived) {
                            setState(() { _showArchived = false; });
                            _loadConversations();
                          }
                        },
                      ),
                      const SizedBox(width: 8),
                      FilterChip(
                        label: const Text('Archived'),
                        selected: _showArchived,
                        onSelected: (val) {
                          if (val && !_showArchived) {
                            setState(() { _showArchived = true; });
                            _loadConversations();
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    _searchPeople(val);
                    setState(() {});
                  },
              decoration: InputDecoration(
                hintText: 'Search people or conversations...',
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                suffixIcon: isSearching ? IconButton(
                  icon: const Icon(Icons.clear, color: Colors.grey),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {
                      _searchedUsers = null;
                    });
                  },
                ) : null,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
              ),
            ),
          ],
        ),
      ),
      Expanded(
            child: isSearching ? _buildSearchResults() : _buildConversationsList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    if (_isSearchingUsers) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_searchedUsers == null || _searchedUsers!.isEmpty) {
      return const Center(
        child: Text('No people found', style: TextStyle(color: Colors.grey, fontSize: 16)),
      );
    }

    return ListView.builder(
      itemCount: _searchedUsers!.length,
      itemBuilder: (context, index) {
        final user = _searchedUsers![index];
        return ListTile(
          leading: AuthAvatar(
            name: user.displayName,
            url: user.profileImageUrl,
            token: widget.token,
            radius: 24,
          ),
          title: Text(
            user.displayName,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          subtitle: Text(user.email ?? 'No email'),
          onTap: () => _createDirectAndOpen(user.userId),
        );
      },
    );
  }

  Widget _buildConversationsList() {
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
          final title = _getConversationTitle(conv);
          final avatarUrl = _getConversationAvatarUrl(conv);
          final preview = conv.lastMessage?.messageText ?? 'No messages yet';
          final hasUnread = conv.unreadCount > 0;

          return ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            leading: AuthAvatar(
              name: title,
              url: avatarUrl,
              token: widget.token,
              radius: 26,
            ),
            title: Text(
              title,
              style: TextStyle(
                fontWeight: hasUnread ? FontWeight.bold : FontWeight.w600,
                fontSize: 16,
              ),
            ),
            subtitle: Text(
              preview,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontWeight: hasUnread ? FontWeight.w600 : FontWeight.normal,
                color: hasUnread ? Colors.black87 : Colors.grey.shade600,
              ),
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (conv.isMuted)
                  const Icon(Icons.volume_off, size: 16, color: Colors.grey),
                if (hasUnread) ...[
                  if (conv.isMuted) const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(color: Colors.blue, shape: BoxShape.circle),
                    child: Text(
                      '${conv.unreadCount}',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            ),
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChatRoomPage(
                    token: widget.token,
                    conversationId: conv.publicId,
                    title: title,
                    avatarUrl: avatarUrl,
                    canSendMessage: conv.canSendMessage,
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
