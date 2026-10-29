import 'dart:convert';
import 'dart:io';

import 'package:archive/archive_io.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../auth/auth_controller.dart';
import '../config/api_config.dart';
import '../data/catalog_service.dart';

/// Bundle format sent phone to phone: a zip holding `manifest.json` + `pages/NNN.<ext>`.
const String kBundleFormat = 'mangafric-chapter';
const int kBundleVersion = 1;

/// Upper bounds checked on import, so a malformed or hostile bundle cannot fill the phone.
const int _maxPages = 400;
const int _maxBundleBytes = 300 * 1024 * 1024;
const Set<String> _imageExts = {'jpg', 'jpeg', 'png', 'webp', 'gif'};

final OfflineStore offlineStore = OfflineStore();

class OfflineChapter {
  const OfflineChapter({
    required this.slug,
    required this.mangaTitle,
    required this.author,
    required this.chapterNumber,
    required this.chapterTitle,
    required this.pageFiles,
    required this.lite,
    required this.savedAt,
    this.cover,
    this.receivedFrom,
  });

  final String slug;
  final String mangaTitle;
  final String author;
  final int chapterNumber;
  final String chapterTitle;
  /// File names under the chapter's `pages/` folder, in reading order.
  final List<String> pageFiles;
  final bool lite;
  final DateTime savedAt;
  /// `cover.<ext>` in the chapter folder, when the cover was saved.
  final String? cover;
  /// Name of the phone that sent the chapter; null when downloaded in this app.
  final String? receivedFrom;

  String get id => offlineId(slug, chapterNumber);
  bool get isReceived => receivedFrom != null;

  Map<String, dynamic> toJson() => {
        'format': kBundleFormat,
        'version': kBundleVersion,
        'slug': slug,
        'mangaTitle': mangaTitle,
        'author': author,
        'chapterNumber': chapterNumber,
        'chapterTitle': chapterTitle,
        'pages': pageFiles,
        'lite': lite,
        'savedAt': savedAt.toIso8601String(),
        if (cover != null) 'cover': cover,
        if (receivedFrom != null) 'receivedFrom': receivedFrom,
      };

  factory OfflineChapter.fromJson(Map<String, dynamic> j) {
    return OfflineChapter(
      slug: '${j['slug'] ?? ''}',
      mangaTitle: '${j['mangaTitle'] ?? ''}',
      author: '${j['author'] ?? ''}',
      chapterNumber: (j['chapterNumber'] as num?)?.toInt() ?? 0,
      chapterTitle: '${j['chapterTitle'] ?? ''}',
      pageFiles: (j['pages'] as List<dynamic>? ?? const []).map((e) => '$e').toList(),
      lite: j['lite'] == true,
      savedAt: DateTime.tryParse('${j['savedAt'] ?? ''}') ?? DateTime.now(),
      cover: j['cover'] is String ? j['cover'] as String : null,
      receivedFrom: j['receivedFrom'] is String ? j['receivedFrom'] as String : null,
    );
  }

  OfflineChapter copyWith({String? receivedFrom, DateTime? savedAt}) => OfflineChapter(
        slug: slug,
        mangaTitle: mangaTitle,
        author: author,
        chapterNumber: chapterNumber,
        chapterTitle: chapterTitle,
        pageFiles: pageFiles,
        lite: lite,
        savedAt: savedAt ?? this.savedAt,
        cover: cover,
        receivedFrom: receivedFrom ?? this.receivedFrom,
      );
}

String offlineId(String slug, int chapter) => '${_safeName(slug)}__$chapter';

String _safeName(String s) => s.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');

class OfflineException implements Exception {
  OfflineException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Chapters saved on the phone: `<app documents>/offline/<id>/manifest.json` + `pages/`.
class OfflineStore extends ChangeNotifier {
  Directory? _root;

  Future<Directory> _rootDir() async {
    if (_root != null) return _root!;
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/offline');
    await dir.create(recursive: true);
    return _root = dir;
  }

  Future<Directory> chapterDir(String id) async => Directory('${(await _rootDir()).path}/$id');

  Future<File> pageFile(OfflineChapter c, String name) async =>
      File('${(await chapterDir(c.id)).path}/pages/$name');

  Future<File?> coverFile(OfflineChapter c) async =>
      c.cover == null ? null : File('${(await chapterDir(c.id)).path}/${c.cover}');

  Future<List<OfflineChapter>> list() async {
    final root = await _rootDir();
    final out = <OfflineChapter>[];
    await for (final e in root.list()) {
      if (e is! Directory) continue;
      final m = File('${e.path}/manifest.json');
      if (!await m.exists()) continue;
      try {
        out.add(OfflineChapter.fromJson(jsonDecode(await m.readAsString()) as Map<String, dynamic>));
      } catch (_) {}
    }
    out.sort((a, b) => b.savedAt.compareTo(a.savedAt));
    return out;
  }

  Future<OfflineChapter?> get(String id) async {
    final m = File('${(await chapterDir(id)).path}/manifest.json');
    if (!await m.exists()) return null;
    return OfflineChapter.fromJson(jsonDecode(await m.readAsString()) as Map<String, dynamic>);
  }

  Future<bool> isSaved(String slug, int chapter) async => await get(offlineId(slug, chapter)) != null;

  Future<void> delete(String id) async {
    final dir = await chapterDir(id);
    if (await dir.exists()) await dir.delete(recursive: true);
    notifyListeners();
  }

  /// Absolute URL for a page or cover URL from the API (relative `/api/v1/storage/...` or absolute).
  static Uri resolveMediaUrl(String url, {bool lite = false}) {
    final base = Uri.parse(ApiConfig.base());
    var u = Uri.parse(url.trim());
    if (!u.hasScheme) u = base.resolveUri(u);
    if (lite && u.path.contains('/storage/')) {
      u = u.replace(queryParameters: {...u.queryParameters, 'lite': '1'});
    }
    return u;
  }

  /// Downloads a chapter the reader can open: the pages endpoint answers 401/403 for locked
  /// chapters, so only chapters this account has access to ever reach the phone.
  Future<OfflineChapter> download(
    String slug,
    int chapter, {
    bool lite = true,
    void Function(int done, int total)? onProgress,
  }) async {
    final manga = await catalogService.fetchMangaBySlug(slug);
    final pages = await catalogService.fetchPages(slug, chapter);
    if (pages.isEmpty) throw OfflineException('Aucune page pour ce chapitre.');
    var chapterTitle = '';
    try {
      final chapters = await catalogService.fetchChapters(slug);
      chapterTitle = chapters.where((c) => c.number == chapter).firstOrNull?.title ?? '';
    } catch (_) {}

    final id = offlineId(slug, chapter);
    final root = await _rootDir();
    final tmp = Directory('${root.path}/.tmp_$id');
    if (await tmp.exists()) await tmp.delete(recursive: true);
    await Directory('${tmp.path}/pages').create(recursive: true);

    final client = http.Client();
    try {
      final names = <String>[];
      for (var i = 0; i < pages.length; i++) {
        final name = await _fetchTo(client, pages[i].url, '${tmp.path}/pages', (i + 1).toString().padLeft(3, '0'), lite);
        names.add(name);
        onProgress?.call(i + 1, pages.length);
      }
      String? cover;
      if (manga.cover.trim().isNotEmpty) {
        try {
          cover = await _fetchTo(client, manga.cover, tmp.path, 'cover', true);
        } catch (_) {}
      }
      final saved = OfflineChapter(
        slug: slug,
        mangaTitle: manga.title,
        author: manga.author,
        chapterNumber: chapter,
        chapterTitle: chapterTitle,
        pageFiles: names,
        lite: lite,
        savedAt: DateTime.now(),
        cover: cover,
      );
      await File('${tmp.path}/manifest.json').writeAsString(jsonEncode(saved.toJson()));
      final dest = await chapterDir(id);
      if (await dest.exists()) await dest.delete(recursive: true);
      await tmp.rename(dest.path);
      notifyListeners();
      return saved;
    } catch (_) {
      if (await tmp.exists()) await tmp.delete(recursive: true);
      rethrow;
    } finally {
      client.close();
    }
  }

  Future<String> _fetchTo(http.Client client, String url, String dir, String base, bool lite) async {
    final uri = resolveMediaUrl(url, lite: lite);
    final apiHost = Uri.parse(ApiConfig.base()).host;
    final token = authController.user?.token?.trim() ?? '';
    final res = await client.get(uri, headers: {
      // Only our own API gets the token, never a third-party image host.
      if (uri.host == apiHost && token.isNotEmpty) 'Authorization': 'Bearer $token',
    }).timeout(const Duration(seconds: 60));
    if (res.statusCode != 200) {
      throw OfflineException('Téléchargement interrompu (image ${res.statusCode}).');
    }
    final name = '$base.${_extFor(res.headers['content-type'], uri.path)}';
    await File('$dir/$name').writeAsBytes(res.bodyBytes, flush: true);
    return name;
  }

  static String _extFor(String? contentType, String path) {
    final ct = (contentType ?? '').toLowerCase();
    if (ct.contains('png')) return 'png';
    if (ct.contains('webp')) return 'webp';
    if (ct.contains('gif')) return 'gif';
    if (ct.contains('jpeg') || ct.contains('jpg')) return 'jpg';
    final dot = path.lastIndexOf('.');
    final ext = dot >= 0 ? path.substring(dot + 1).toLowerCase() : '';
    return _imageExts.contains(ext) ? ext : 'jpg';
  }

  /// Zips a saved chapter into one file for sending (stored, not deflated: images are already compressed).
  Future<File> exportBundle(OfflineChapter c) async {
    final dir = await chapterDir(c.id);
    final tmp = await getTemporaryDirectory();
    final out = File('${tmp.path}/${c.id}.mangafric.zip');
    if (await out.exists()) await out.delete();
    final enc = ZipFileEncoder();
    enc.create(out.path, level: ZipFileEncoder.store);
    final manifest = c.copyWith().toJson()..remove('receivedFrom');
    enc.addArchiveFile(ArchiveFile.string('manifest.json', jsonEncode(manifest)));
    if (c.cover != null) await enc.addFile(File('${dir.path}/${c.cover}'), c.cover!);
    for (final p in c.pageFiles) {
      await enc.addFile(File('${dir.path}/pages/$p'), 'pages/$p');
    }
    await enc.close();
    return out;
  }

  /// Checks and unpacks a received bundle into the offline folder.
  Future<OfflineChapter> importBundle(File zip, {required String from}) async {
    if (await zip.length() > _maxBundleBytes) throw OfflineException('Fichier trop volumineux.');
    final archive = ZipDecoder().decodeStream(InputFileStream(zip.path));
    final manifestEntry = archive.findFile('manifest.json');
    if (manifestEntry == null) throw OfflineException('Ce fichier n’est pas un chapitre MangAfric.');
    final Map<String, dynamic> j;
    try {
      j = jsonDecode(utf8.decode(manifestEntry.content)) as Map<String, dynamic>;
    } catch (_) {
      throw OfflineException('Chapitre illisible.');
    }
    if (j['format'] != kBundleFormat || (j['version'] as num?)?.toInt() != kBundleVersion) {
      throw OfflineException('Format de chapitre non reconnu. Mettez l’application à jour.');
    }
    final c = OfflineChapter.fromJson(j).copyWith(receivedFrom: from, savedAt: DateTime.now());
    final validName = RegExp(r'^[A-Za-z0-9_-]{1,40}\.([a-z]{3,4})$');
    bool okFile(String n) {
      final m = validName.firstMatch(n);
      return m != null && _imageExts.contains(m.group(1));
    }

    if (c.slug.isEmpty || c.chapterNumber <= 0 || c.pageFiles.isEmpty || c.pageFiles.length > _maxPages) {
      throw OfflineException('Chapitre incomplet.');
    }
    if (!c.pageFiles.every(okFile) || (c.cover != null && !okFile(c.cover!))) {
      throw OfflineException('Chapitre invalide.');
    }

    final root = await _rootDir();
    final tmp = Directory('${root.path}/.tmp_${c.id}');
    if (await tmp.exists()) await tmp.delete(recursive: true);
    await Directory('${tmp.path}/pages').create(recursive: true);
    try {
      for (final p in c.pageFiles) {
        final entry = archive.findFile('pages/$p');
        if (entry == null) throw OfflineException('Page manquante dans le chapitre reçu.');
        await File('${tmp.path}/pages/$p').writeAsBytes(entry.content, flush: true);
      }
      if (c.cover != null) {
        final entry = archive.findFile(c.cover!);
        if (entry != null) await File('${tmp.path}/${c.cover}').writeAsBytes(entry.content);
      }
      await File('${tmp.path}/manifest.json').writeAsString(jsonEncode(c.toJson()));
      final dest = await chapterDir(c.id);
      if (await dest.exists()) await dest.delete(recursive: true);
      await tmp.rename(dest.path);
    } catch (_) {
      if (await tmp.exists()) await tmp.delete(recursive: true);
      rethrow;
    }
    notifyListeners();
    return c;
  }
}
