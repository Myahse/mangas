import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../auth/auth_controller.dart';
import '../data/community_service.dart';
import '../theme.dart';
import 'reader_auth_sheet.dart';

/// "À vous de choisir la suite": one free vote, results once voted, extra votes cost coins.
/// Same rules as the website's PollCard. Shows nothing when the chapter has no poll.
class ChapterPollCard extends StatefulWidget {
  const ChapterPollCard({super.key, required this.slug, required this.chapter});

  final String slug;
  final int chapter;

  @override
  State<ChapterPollCard> createState() => _ChapterPollCardState();
}

class _ChapterPollCardState extends State<ChapterPollCard> {
  ChapterPoll? _poll;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await communityService.fetchPoll(widget.slug, widget.chapter);
      if (mounted) setState(() => _poll = p);
    } catch (_) {}
  }

  Future<void> _vote(String optionId, {int extra = 0}) async {
    if (!authController.isAuthenticated) {
      await showReaderAuthSheet(context);
      if (authController.isAuthenticated) await _load();
      return;
    }
    setState(() => _busy = true);
    try {
      final next = await communityService.vote(_poll!.id, optionId, extraVotes: extra);
      if (!mounted) return;
      setState(() => _poll = next);
      if (extra > 0) _toast('+$extra voix pour votre choix.');
    } catch (e) {
      final msg = e is BackendException ? e.message : '$e';
      _toast(msg.contains('insufficient') ? 'Pas assez de coins pour voter encore.' : msg);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _toast(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    final poll = _poll;
    if (poll == null) return const SizedBox.shrink();
    final muted = Colors.white.withValues(alpha: 0.55);
    final voted = poll.myVotes > 0;
    final total = poll.totalVotes;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(poll.open ? 'À VOUS DE CHOISIR LA SUITE' : 'LES LECTEURS ONT CHOISI',
              style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          Text(poll.question, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          for (final o in poll.options) _option(poll, o, voted, total),
          if (total != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('$total vote${total > 1 ? 's' : ''}${voted ? ' · dont ${poll.myVotes} de vous' : ''}',
                  style: TextStyle(color: muted, fontSize: 12)),
            ),
          if (poll.open && !authController.isAuthenticated)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Connectez-vous pour voter.', style: TextStyle(color: muted, fontSize: 12)),
            ),
          if (poll.open && voted && poll.myOptionId != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: OutlinedButton(
                onPressed: _busy ? null : () => _vote(poll.myOptionId!, extra: 1),
                child: Text('+1 voix pour mon choix (${poll.boostCost} coins)'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _option(ChapterPoll poll, Map<String, dynamic> o, bool voted, int? total) {
    final id = '${o['id']}';
    final votes = (o['votes'] as num?)?.toInt() ?? 0;
    final pct = total != null && total > 0 ? votes / total : 0.0;
    final highlighted = poll.myOptionId == id || poll.winnerOptionId == id;
    final enabled = poll.open && !voted && !_busy;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: enabled ? () => _vote(id) : null,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            height: 44,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: highlighted ? AppColors.primary : Colors.white.withValues(alpha: 0.15),
                width: highlighted ? 1.5 : 1,
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              children: [
                if (total != null)
                  FractionallySizedBox(
                    widthFactor: pct,
                    heightFactor: 1,
                    child: Container(color: AppColors.primary.withValues(alpha: 0.22)),
                  ),
                Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text('${o['label'] ?? ''}',
                            maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 14)),
                      ),
                      if (total != null)
                        Text('${(pct * 100).round()}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
