import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:just_audio/just_audio.dart';

import '../offline/offline_store.dart';
import '../theme.dart';

/// Speech languages for the phone's voices. Most phones only have French and English voices; for
/// the other languages a step falls back to silent reading at the pace of the text.
const _speechTags = {
  'orig': 'fr-FR',
  'en': 'en-US',
  'sw': 'sw',
  'yo': 'yo',
  'ha': 'ha',
  'ee': 'ee',
  'ff': 'ff',
  'wo': 'wo',
  'ln': 'ln',
  'bm': 'bm',
};

/// Reading time when nothing can be heard: about 3 words per second, at least 1.8 s.
Duration silentDuration(String text) {
  final words = text.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
  return Duration(milliseconds: words * 330 < 1800 ? 1800 : words * 330);
}

/// Griot mode: tells the chapter bubble by bubble, like the website's GriotBar. Each step plays the
/// recorded voice, else a voice of the phone for that language, else waits for the reading time;
/// then moves on. [onStep] lets the reader scroll to and highlight the bubble.
class GriotBar extends StatefulWidget {
  const GriotBar({super.key, required this.steps, required this.lang, required this.onStep, required this.onClose});

  final List<Map<String, dynamic>> steps;
  final String lang;
  final ValueChanged<int> onStep;
  final VoidCallback onClose;

  @override
  State<GriotBar> createState() => _GriotBarState();
}

class _GriotBarState extends State<GriotBar> {
  final AudioPlayer _audio = AudioPlayer();
  final FlutterTts _tts = FlutterTts();
  Timer? _timer;
  StreamSubscription<PlayerState>? _audioSub;
  int _index = 0;
  bool _playing = true;
  String _source = '';

  /// Bumped on every step change, pause or close: a callback from an older run must do nothing.
  int _run = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  @override
  void dispose() {
    _run++;
    _stopAll();
    _audio.dispose();
    super.dispose();
  }

  void _stopAll() {
    _timer?.cancel();
    _audioSub?.cancel();
    _audioSub = null;
    _audio.stop();
    _tts.stop();
  }

  Map<String, dynamic> get _step => widget.steps[_index];

  void _go(int index) {
    if (index < 0 || index >= widget.steps.length) return;
    setState(() => _index = index);
    _start();
  }

  void _togglePlay() {
    setState(() => _playing = !_playing);
    _start();
  }

  void _start() {
    final run = ++_run;
    _stopAll();
    widget.onStep(_index);
    if (!_playing) return;
    bool alive() => mounted && run == _run;

    void next() {
      if (!alive()) return;
      if (_index < widget.steps.length - 1) {
        _go(_index + 1);
      } else {
        setState(() => _playing = false);
      }
    }

    void silent() {
      if (!alive()) return;
      setState(() => _source = 'Lecture silencieuse');
      _timer = Timer(silentDuration('${_step['text'] ?? ''}'), next);
    }

    Future<void> speak() async {
      if (!alive()) return;
      final tag = _speechTags[widget.lang.isEmpty ? 'orig' : widget.lang];
      try {
        if (tag == null || await _tts.isLanguageAvailable(tag) != true) return silent();
        if (!alive()) return;
        await _tts.setLanguage(tag);
        _tts.setCompletionHandler(() => next());
        _tts.setErrorHandler((_) => silent());
        setState(() => _source = 'Voix de synthèse');
        final r = await _tts.speak('${_step['text'] ?? ''}');
        if (r != 1) silent();
      } catch (_) {
        silent();
      }
    }

    final audioUrl = '${_step['audioUrl'] ?? ''}'.trim();
    if (audioUrl.isEmpty) {
      speak();
      return;
    }
    setState(() => _source = 'Voix enregistrée');
    () async {
      try {
        await _audio.setUrl(OfflineStore.resolveMediaUrl(audioUrl).toString());
        if (!alive()) return;
        _audioSub = _audio.playerStateStream.listen((s) {
          if (s.processingState == ProcessingState.completed) next();
        });
        await _audio.play();
      } catch (_) {
        speak();
      }
    }();
  }

  @override
  Widget build(BuildContext context) {
    final step = _step;
    final muted = Colors.white.withValues(alpha: 0.6);
    return Material(
      color: Colors.black.withValues(alpha: 0.92),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'MODE GRIOT · Bulle ${_index + 1}/${widget.steps.length} · page ${step['page']}${_source.isEmpty ? '' : ' · $_source'}',
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${step['text'] ?? ''}',
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 15, height: 1.35),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    tooltip: 'Bulle précédente',
                    onPressed: _index == 0 ? null : () => _go(_index - 1),
                    icon: Icon(Icons.skip_previous, color: _index == 0 ? muted.withValues(alpha: 0.3) : Colors.white),
                  ),
                  IconButton.filled(
                    tooltip: _playing ? 'Pause' : 'Lecture',
                    style: IconButton.styleFrom(backgroundColor: AppColors.primary),
                    onPressed: _togglePlay,
                    icon: Icon(_playing ? Icons.pause : Icons.play_arrow, color: Colors.white),
                  ),
                  IconButton(
                    tooltip: 'Bulle suivante',
                    onPressed: _index >= widget.steps.length - 1 ? null : () => _go(_index + 1),
                    icon: Icon(
                      Icons.skip_next,
                      color: _index >= widget.steps.length - 1 ? muted.withValues(alpha: 0.3) : Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    tooltip: 'Quitter le mode griot',
                    onPressed: () {
                      _run++;
                      _stopAll();
                      widget.onClose();
                    },
                    icon: Icon(Icons.close, color: muted),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
