class AppNotification {
  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
    this.data = const {},
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final bool read;
  final DateTime? createdAt;
  final Map<String, dynamic> data;

  factory AppNotification.fromJson(Map<String, dynamic> j) {
    DateTime? at;
    final raw = j['createdAt'];
    if (raw != null) {
      try {
        at = DateTime.parse('$raw');
      } catch (_) {}
    }
    return AppNotification(
      id: '${j['id'] ?? ''}',
      type: '${j['type'] ?? 'INFO'}',
      title: '${j['title'] ?? ''}',
      body: '${j['body'] ?? ''}',
      read: j['read'] == true,
      createdAt: at,
      data: j['data'] is Map ? Map<String, dynamic>.from(j['data'] as Map) : const {},
    );
  }

  String? get mangaSlug {
    final s = data['slug'];
    return s == null ? null : '$s'.trim();
  }

  int? get chapter {
    final c = data['chapter'];
    if (c is num) return c.toInt();
    return int.tryParse('$c');
  }

  IconHint get iconHint {
    switch (type) {
      case 'NEW_MANGA':
      case 'NEW_CHAPTER':
        return IconHint.manga;
      case 'ANNOUNCEMENT':
        return IconHint.announce;
      case 'PAYMENT':
        return IconHint.payment;
      case 'SUBSCRIPTION':
        return IconHint.subscription;
      case 'READERS':
        return IconHint.readers;
      default:
        return IconHint.info;
    }
  }
}

enum IconHint { manga, announce, payment, subscription, readers, info }
