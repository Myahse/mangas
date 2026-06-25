import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

abstract final class ApiConfig {
  static const String _prefKey = 'mangafriq_creator_api_base_v1';

  static const String _fromEnvironment = String.fromEnvironment(
    'MANGAFRIC_API_BASE_URL',
    defaultValue: '',
  );

  static const String sessionStorageKey = String.fromEnvironment(
    'MANGAFRIC_SESSION_KEY',
    defaultValue: 'MangAfric_creator_session',
  );

  static String? _savedOverride;

  static Future<void> loadSavedBaseUrl() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_prefKey)?.trim();
    if (raw == null || raw.isEmpty) {
      _savedOverride = null;
      return;
    }
    _savedOverride = normalizeToApiV1Root(raw);
  }

  static Future<void> saveBaseUrlOverride(String userInput) async {
    final normalized = normalizeToApiV1Root(userInput);
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_prefKey, normalized);
    _savedOverride = normalized;
  }

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
      default:
        return 'http://127.0.0.1:8088/api/v1';
    }
  }

  static String base() {
    if (_savedOverride != null && _savedOverride!.isNotEmpty) return _savedOverride!;
    final fromDefine = _fromEnvironment.trim();
    if (fromDefine.isNotEmpty) return fromDefine.replaceAll(RegExp(r'/+$'), '');
    return _defaultBaseForPlatform().replaceAll(RegExp(r'/+$'), '');
  }
}
