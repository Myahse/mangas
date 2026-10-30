import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../auth/auth_controller.dart';
import '../data/community_service.dart';
import '../theme.dart';
import 'reader_auth_sheet.dart';

const _maxLength = 500;

String _timeAgo(DateTime? at) {
  if (at == null) return '';
  final s = DateTime.now().difference(at).inSeconds;
  if (s < 60) return 'à l’instant';
  if (s < 3600) return 'il y a ${s ~/ 60} min';
  if (s < 86400) return 'il y a ${s ~/ 3600} h';
  return 'il y a ${s ~/ 86400} j';
}

/// Readers' comments at the end of a chapter (dark reader style): write, like, delete mine; the
/// series' creator can hide any. Same endpoints as the website.
class ChapterComments extends StatefulWidget {
  const ChapterComments({super.key, required this.slug, required this.chapter});

  final String slug;
  final int chapter;

  @override
  State<ChapterComments> createState() => _ChapterCommentsState();
}

class _ChapterCommentsState extends State<ChapterComments> {
  CommentsPage? _page;
  bool _sending = false;
  final _text = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final p = await communityService.fetchComments(widget.slug, widget.chapter);
      if (mounted) setState(() => _page = p);
    } catch (_) {
      if (mounted) setState(() => _page = CommentsPage(true, false, []));
    }
  }

  void _toast(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  Future<void> _send() async {
    final text = _text.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await communityService.postComment(widget.slug, widget.chapter, text);
      _text.clear();
      await _load();
    } catch (e) {
      final msg = e is BackendException ? e.message : '$e';
      _toast(msg.contains('too many') ? 'Doucement : attendez une minute avant de recommenter.' : msg);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _like(ChapterComment c) async {
    if (!authController.isAuthenticated) {
      await showReaderAuthSheet(context);
      return;
    }
    try {
      final r = await communityService.toggleLike(c.id);
      setState(() {
        c.liked = r.liked;
        c.likes = r.likes;
      });
    } catch (_) {}
  }

  Future<void> _delete(ChapterComment c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(c.mine ? 'Supprimer votre commentaire ?' : 'Masquer ce commentaire ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmer')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await communityService.deleteComment(c.id);
      await _load();
    } catch (e) {
      _toast(e is BackendException ? e.message : '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final page = _page;
    final muted = Colors.white.withValues(alpha: 0.55);
    if (page == null) return const SizedBox(height: 40);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('COMMENTAIRES · ${page.items.length}',
            style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        const SizedBox(height: 10),
        if (!page.enabled)
          Text('Le créateur a désactivé les commentaires pour ce chapitre.', style: TextStyle(color: muted, fontSize: 13))
        else if (!authController.isAuthenticated)
          OutlinedButton(onPressed: () => showReaderAuthSheet(context).then((_) => _load()), child: const Text('Se connecter pour commenter'))
        else ...[
          TextField(
            controller: _text,
            maxLength: _maxLength,
            minLines: 1,
            maxLines: 4,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Qu’avez-vous pensé de ce chapitre ?',
              hintStyle: TextStyle(color: muted),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.06),
              counterStyle: TextStyle(color: muted),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(onPressed: _sending ? null : _send, child: Text(_sending ? 'Envoi…' : 'Publier')),
          ),
        ],
        if (page.items.isEmpty && page.enabled)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text('Soyez le premier à donner votre avis.', style: TextStyle(color: muted, fontSize: 13)),
          ),
        for (final c in page.items)
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.fromLTRB(12, 10, 4, 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.04),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(c.author, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13))),
                    Text(_timeAgo(c.createdAt), style: TextStyle(color: muted, fontSize: 11)),
                    const SizedBox(width: 8),
                  ],
                ),
                const SizedBox(height: 4),
                Text(c.text, style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 14, height: 1.4)),
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: () => _like(c),
                      icon: Icon(c.liked ? Icons.favorite : Icons.favorite_border, size: 16,
                          color: c.liked ? AppColors.primary : muted),
                      label: Text(c.likes > 0 ? '${c.likes}' : '', style: TextStyle(color: muted)),
                    ),
                    if (c.mine || page.canModerate)
                      IconButton(
                        tooltip: c.mine ? 'Supprimer' : 'Masquer',
                        onPressed: () => _delete(c),
                        icon: Icon(Icons.delete_outline, size: 18, color: muted),
                      ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}
