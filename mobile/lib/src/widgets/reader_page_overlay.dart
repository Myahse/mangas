import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../theme.dart';

double _pct(Object? v) => (v is num ? v.toDouble() : double.tryParse('$v') ?? 0) / 100;

/// One reader page with the community translation drawn over its bubbles and the cultural-note
/// dots. Boxes are percentages of the image, so they are placed on the image as actually shown
/// (BoxFit.contain may leave margins when a page is not exactly the box's aspect ratio).
class ReaderPageImage extends StatelessWidget {
  const ReaderPageImage({
    super.key,
    required this.url,
    this.bubbles = const [],
    this.notes = const [],
    this.peeked = const {},
    this.onTapBubble,
    this.onTapNote,
  });

  final String url;
  final List<Map<String, dynamic>> bubbles;
  final List<Map<String, dynamic>> notes;

  /// Bubbles tapped to see the original artwork underneath.
  final Set<String> peeked;
  final ValueChanged<String>? onTapBubble;
  final ValueChanged<Map<String, dynamic>>? onTapNote;

  @override
  Widget build(BuildContext context) {
    if (bubbles.isEmpty && notes.isEmpty) {
      return CachedNetworkImage(imageUrl: url, fit: BoxFit.contain);
    }
    return CachedNetworkImage(
      imageUrl: url,
      imageBuilder: (context, provider) => _Overlaid(provider: provider, page: this),
    );
  }
}

class _Overlaid extends StatefulWidget {
  const _Overlaid({required this.provider, required this.page});

  final ImageProvider provider;
  final ReaderPageImage page;

  @override
  State<_Overlaid> createState() => _OverlaidState();
}

class _OverlaidState extends State<_Overlaid> {
  Size? _imageSize;
  ImageStream? _stream;
  late final ImageStreamListener _listener = ImageStreamListener((info, _) {
    if (mounted) setState(() => _imageSize = Size(info.image.width.toDouble(), info.image.height.toDouble()));
  });

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _resolve();
  }

  @override
  void didUpdateWidget(_Overlaid old) {
    super.didUpdateWidget(old);
    if (old.provider != widget.provider) _resolve();
  }

  void _resolve() {
    final stream = widget.provider.resolve(createLocalImageConfiguration(context));
    if (stream.key == _stream?.key) return;
    _stream?.removeListener(_listener);
    _stream = stream..addListener(_listener);
  }

  @override
  void dispose() {
    _stream?.removeListener(_listener);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final page = widget.page;
    return LayoutBuilder(builder: (context, box) {
      final boxSize = box.biggest;
      final img = _imageSize;
      // Where the image actually sits inside the box.
      final rect = img == null
          ? Offset.zero & boxSize
          : Alignment.center.inscribe(applyBoxFit(BoxFit.contain, img, boxSize).destination, Offset.zero & boxSize);

      return Stack(
        children: [
          Positioned.fill(child: Image(image: widget.provider, fit: BoxFit.contain)),
          if (img != null) ...[
            for (final b in page.bubbles) _bubble(b, rect),
            for (final n in page.notes) _noteDot(n, rect),
          ],
        ],
      );
    });
  }

  Widget _bubble(Map<String, dynamic> b, Rect rect) {
    final id = '${b['id']}';
    final w = _pct(b['w']) * rect.width;
    final h = _pct(b['h']) * rect.height;
    final peek = widget.page.peeked.contains(id);
    return Positioned(
      left: rect.left + _pct(b['x']) * rect.width,
      top: rect.top + _pct(b['y']) * rect.height,
      width: w,
      height: h,
      child: GestureDetector(
        onTap: () => widget.page.onTapBubble?.call(id),
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 150),
          opacity: peek ? 0.08 : 1,
          child: Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(w < 60 ? 6 : 14)),
            // Wraps to the bubble's width, then shrinks until it fits its height.
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: SizedBox(
                width: (w - 6).clamp(1, double.infinity),
                child: Text(
                  '${b['text'] ?? ''}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.black, fontSize: 13, fontWeight: FontWeight.w600, height: 1.15),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _noteDot(Map<String, dynamic> n, Rect rect) {
    const size = 24.0;
    final left = rect.left + (_pct(n['x']) + _pct(n['w'])) * rect.width - size / 2;
    final top = rect.top + _pct(n['y']) * rect.height - size / 2;
    return Positioned(
      left: left.clamp(rect.left, rect.right - size),
      top: top.clamp(rect.top, rect.bottom - size),
      width: size,
      height: size,
      child: Semantics(
        button: true,
        label: 'Note culturelle : ${n['title'] ?? ''}',
        child: GestureDetector(
          onTap: () => widget.page.onTapNote?.call(n),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: const [BoxShadow(color: Color(0x55000000), blurRadius: 4)],
            ),
            child: const Text('i', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13)),
          ),
        ),
      ),
    );
  }
}
