import 'package:flutter/material.dart';

import '../theme/creator_theme.dart';
import '../services/creator_api.dart';

class StatsTab extends StatefulWidget {
  const StatsTab({super.key, required this.onRefreshParent});
  final VoidCallback onRefreshParent;

  @override
  State<StatsTab> createState() => _StatsTabState();
}

class _StatsTabState extends State<StatsTab> {
  CreatorStats? _stats;
  Map<String, dynamic>? _finance;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stats = await creatorApi.stats();
      Map<String, dynamic>? fin;
      try {
        fin = await creatorApi.financeDashboard();
      } catch (_) {}
      if (mounted) {
        setState(() {
          _stats = stats;
          _finance = fin;
          _loading = false;
        });
        widget.onRefreshParent();
      }
    } catch (e) {
      if (mounted) setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Widget _card(String label, String value, Color color, IconData icon) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: CreatorColors.border)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(backgroundColor: color.withValues(alpha: 0.12), child: Icon(icon, color: color)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 12, color: CreatorColors.textMuted, fontWeight: FontWeight.w600)),
                  Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Tableau de bord', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text('Lecteurs, vues, finance', style: TextStyle(color: CreatorColors.textMuted)),
          const SizedBox(height: 16),
          if (_loading) const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())),
          if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
          if (_stats != null) ...[
            _card('Lecteurs / déblocages', '${_stats!.totalReaders}', CreatorColors.accent, Icons.people),
            const SizedBox(height: 10),
            _card('Vues manga', '${_stats!.totalMangaViews}', CreatorColors.primary, Icons.visibility),
            const SizedBox(height: 10),
            _card('Vues épisodes', '${_stats!.totalEpisodeViews}', const Color(0xFF9333EA), Icons.play_circle_outline),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _card('Mangas', '${_stats!.publishedMangaCount}', CreatorColors.primaryDark, Icons.library_books)),
              ],
            ),
            const SizedBox(height: 10),
            _card('Épisodes publiés', '${_stats!.publishedEpisodeCount}', CreatorColors.accent, Icons.article),
            if (_finance != null) ...[
              const SizedBox(height: 20),
              const Text('Finance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              _card(
                'Solde disponible',
                '${_finance!['availableBalance'] ?? 0} ${_finance!['currency'] ?? 'XOF'}',
                const Color(0xFFD4AF37),
                Icons.account_balance_wallet_outlined,
              ),
            ],
          ],
        ],
      ),
    );
  }
}
