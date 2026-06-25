import 'package:flutter/material.dart';

import '../theme/creator_theme.dart';
import '../services/creator_api.dart';

class EpisodesTab extends StatefulWidget {
  const EpisodesTab({super.key});

  @override
  State<EpisodesTab> createState() => _EpisodesTabState();
}

class _EpisodesTabState extends State<EpisodesTab> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await creatorApi.publishedEpisodes();
      if (mounted) setState(() {
        _items = list;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _items = [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Épisodes publiés', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          if (_loading) const Center(child: CircularProgressIndicator()),
          if (!_loading && _items.isEmpty)
            Text('Aucun épisode — publiez depuis le panneau web.', style: TextStyle(color: CreatorColors.textMuted)),
          ..._items.map((e) {
            final stats = e['stats'];
            final views = stats is Map ? stats['views'] ?? 0 : 0;
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: CreatorColors.border)),
              child: ListTile(
                title: Text('${e['seriesTitle'] ?? ''} — ${e['episodeTitle'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('$views vues'),
                leading: const CircleAvatar(child: Icon(Icons.article, color: CreatorColors.primary)),
              ),
            );
          }),
        ],
      ),
    );
  }
}
