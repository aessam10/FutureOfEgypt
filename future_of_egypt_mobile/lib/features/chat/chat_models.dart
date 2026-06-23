class ChatConversation {
  final String publicId;
  final String? title;
  final int type;
  final DateTime lastMessageAtUtc;
  final int unreadCount;
  final ChatMessagePreview? lastMessage;
  final List<ChatParticipant> participants;

  ChatConversation({
    required this.publicId,
    this.title,
    required this.type,
    required this.lastMessageAtUtc,
    required this.unreadCount,
    this.lastMessage,
    required this.participants,
  });

  factory ChatConversation.fromJson(Map<String, dynamic> json) {
    return ChatConversation(
      publicId: json['publicId'],
      title: json['title'],
      type: json['type'],
      lastMessageAtUtc: DateTime.parse(json['lastMessageAtUtc']).toLocal(),
      unreadCount: json['unreadCount'] ?? 0,
      lastMessage: json['lastMessage'] != null ? ChatMessagePreview.fromJson(json['lastMessage']) : null,
      participants: (json['participants'] as List?)?.map((x) => ChatParticipant.fromJson(x)).toList() ?? [],
    );
  }
}

class ChatParticipant {
  final String userId;
  final String displayName;
  final String? email;
  final int role;

  ChatParticipant({
    required this.userId,
    required this.displayName,
    this.email,
    required this.role,
  });

  factory ChatParticipant.fromJson(Map<String, dynamic> json) {
    return ChatParticipant(
      userId: json['userId'],
      displayName: json['displayName'],
      email: json['email'],
      role: json['role'] ?? 0,
    );
  }
}

class ChatMessagePreview {
  final String publicId;
  final String senderUserId;
  final String senderName;
  final String messageText;
  final DateTime sentAtUtc;

  ChatMessagePreview({
    required this.publicId,
    required this.senderUserId,
    required this.senderName,
    required this.messageText,
    required this.sentAtUtc,
  });

  factory ChatMessagePreview.fromJson(Map<String, dynamic> json) {
    return ChatMessagePreview(
      publicId: json['publicId'],
      senderUserId: json['senderUserId'],
      senderName: json['senderName'],
      messageText: json['messageText'],
      sentAtUtc: DateTime.parse(json['sentAtUtc']).toLocal(),
    );
  }
}

class ChatMessage {
  final String publicId;
  final String senderUserId;
  final String senderName;
  final String messageText;
  final int type;
  final DateTime sentAtUtc;
  final bool isMine;

  ChatMessage({
    required this.publicId,
    required this.senderUserId,
    required this.senderName,
    required this.messageText,
    required this.type,
    required this.sentAtUtc,
    required this.isMine,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      publicId: json['publicId'],
      senderUserId: json['senderUserId'],
      senderName: json['senderName'],
      messageText: json['messageText'],
      type: json['type'] ?? 0,
      sentAtUtc: DateTime.parse(json['sentAtUtc']).toLocal(),
      isMine: json['isMine'] ?? false,
    );
  }
}

class ChatRealtimeMessage {
  final String publicId;
  final String conversationPublicId;
  final String senderUserId;
  final String senderName;
  final String messageText;
  final int type;
  final DateTime sentAtUtc;

  ChatRealtimeMessage({
    required this.publicId,
    required this.conversationPublicId,
    required this.senderUserId,
    required this.senderName,
    required this.messageText,
    required this.type,
    required this.sentAtUtc,
  });

  factory ChatRealtimeMessage.fromJson(Map<String, dynamic> json) {
    return ChatRealtimeMessage(
      publicId: json['publicId'],
      conversationPublicId: json['conversationPublicId'],
      senderUserId: json['senderUserId'],
      senderName: json['senderName'],
      messageText: json['messageText'],
      type: json['type'] ?? 0,
      sentAtUtc: DateTime.parse(json['sentAtUtc']).toLocal(),
    );
  }
}
