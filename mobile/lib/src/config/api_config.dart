import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';


abstract final class ApiConfig {
  static const String _prefKey = 'mangafriq_reader_api_base_v1';

  static const String _fromEnvironment = String.fromEnvironment(
    'MANGAFRIC_API_BASE_URL',
    defaultValue: '',
  );

  static const String sessionStorageKey = String.fromEnvironment(
    'MANGAFRIC_SESSION_KEY',
    defaultValue: 'MangAfric_session',
  );

  static String? _savedOverride;

  /// Call from [StartupController.init] before any HTTP request.
  static Future<void> loadSavedBaseUrl() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_prefKey)?.trim();
    if (raw == null || raw.isEmpty) {
      _savedOverride = null;
      return;
    }
    final normalized = normalizeToApiV1Root(raw);
    _savedOverride = normalized;
    if (normalized != raw) {
      await sp.setString(_prefKey, normalized);
    }
  }

  static Future<void> saveBaseUrlOverride(String userInput) async {
    final normalized = normalizeToApiV1Root(userInput);
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_prefKey, normalized);
    _savedOverride = normalized;
  }

  static Future<void> clearSavedBaseUrlOverride() async {
    _savedOverride = null;
    final sp = await SharedPreferences.getInstance();
    await sp.remove(_prefKey);
  }

  /// Returns an error message, or null if the input is acceptable.
  static String? validateApiRootInput(String input) {
    final n = normalizeToApiV1Root(input);
    if (n.isEmpty) return 'Saisissez une URL.';
    final u = Uri.tryParse(n);
    if (u == null || (u.scheme != 'http' && u.scheme != 'https')) {
      return 'L’URL doit commencer par http:// ou https://';
    }
    if (!u.hasAuthority || u.host.isEmpty) return 'Hôte manquant dans l’URL.';
    return null;
  }

  /// Ensures the root ends with `/api/v1` (no trailing slash).
  static String normalizeToApiV1Root(String input) {
    var s = input.trim();
    if (s.isEmpty) return '';
    s = s.replaceAll(RegExp(r'/+$'), '');
    if (s.endsWith('/api/v1')) return s;
    if (s.endsWith('/api')) return '$s/v1';
    return '$s/api/v1';
  }

  static String _defaultBaseForPlatform() {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'http://10.0.2.2:8088/api/v1';
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        return 'http://127.0.0.1:8088/api/v1';
      default:
        return 'http://localhost:8088/api/v1';
    }
  }

  /// Resolved API root including `/api/v1`, no trailing slash.
  static String base() {
    if (_savedOverride != null && _savedOverride!.isNotEmpty) {
      return _savedOverride!;
    }
    final fromDefine = _fromEnvironment.trim();
    if (fromDefine.isNotEmpty) {
      return fromDefine.replaceAll(RegExp(r'/+$'), '');
    }
    return _defaultBaseForPlatform().replaceAll(RegExp(r'/+$'), '');
  }

  /// Short label for debug logs / UI.
  static String sourceLabel() {
    if (_savedOverride != null && _savedOverride!.isNotEmpty) return 'enregistrée';
    if (_fromEnvironment.trim().isNotEmpty) return 'dart-define';
    return 'défaut plateforme';
  }

  static String connectionFailedMessage([String? technical]) {
    final url = base();
    final extra = technical == null || technical.isEmpty ? '' : '\nDétail: $technical';
    return 'Impossible de joindre l’API à\n$url$extra\n\n'
        '• Vérifiez que le backend tourne (port 8088, server.address=0.0.0.0).\n'
        '• Émulateur Android : l’hôte est 10.0.2.2 (défaut).\n'
        '• Téléphone sur le Wi‑Fi : 10.0.2.2 ne fonctionne pas — utilisez l’IP du PC, '
        'ex. http://192.168.1.10:8088 (l’app ajoute /api/v1). Menu ⋮ puis URL du serveur.\n'
        '• Pare-feu Windows : autorisez le port 8088 en entrée.\n'
        '• Production : URL HTTPS complète avec /api/v1.';
  }
}
