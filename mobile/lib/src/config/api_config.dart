import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_discovery.dart';

abstract final class ApiConfig {
  static const String _prefKey = 'mangafriq_reader_api_base_v1';

  static const String _fromEnvironment = String.fromEnvironment(
    'MANGAFRIC_API_BASE_URL',
    defaultValue: '',
  );

  /// Wi‑Fi IP or hostname of the dev machine (physical Android / iOS device on same LAN).
  /// Example: flutter run --dart-define=MANGAFRIC_LAN_HOST=192.168.1.42
  static const String _lanHost = String.fromEnvironment(
    'MANGAFRIC_LAN_HOST',
    defaultValue: '',
  );

  static const String sessionStorageKey = String.fromEnvironment(
    'MANGAFRIC_SESSION_KEY',
    defaultValue: 'MangAfric_session',
  );

  static String? _savedOverride;
  static String? _resolvedBase;

  static String lanHostFromEnvironment() => _lanHost.trim();

  static Future<void> loadSavedBaseUrl() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_prefKey)?.trim();
    if (raw == null || raw.isEmpty) {
      _savedOverride = null;
      return;
    }
    var normalized = normalizeToApiV1Root(raw);

    // Saved localhost/LAN URLs break the Android emulator — drop them.
    if (Platform.isAndroid && !await ApiDiscovery.isAndroidPhysicalDevice) {
      final host = Uri.tryParse(normalized)?.host.toLowerCase() ?? '';
      if (host == 'localhost' || host == '127.0.0.1' || host.startsWith('192.168.')) {
        await sp.remove(_prefKey);
        _savedOverride = null;
        if (kDebugMode) {
          debugPrint('MangAfric API: cleared saved URL unsuitable for emulator ($normalized)');
        }
        return;
      }
    }

    _savedOverride = normalized;
    if (normalized != raw) {
      await sp.setString(_prefKey, normalized);
    }
  }

  /// Tries known API roots (emulator, LAN, saved URL) and locks the first reachable.
  static Future<bool> discoverReachableBaseUrl({bool force = false}) async {
    if (!force && _resolvedBase != null) {
      if (await ApiDiscovery.pingHealth(_resolvedBase!)) return true;
      _resolvedBase = null;
    }

    final candidates = await ApiDiscovery.candidateRoots(
      savedOverride: _savedOverride,
      fromEnvironment: _fromEnvironment,
      lanHost: _lanHost,
    );

    final found = await ApiDiscovery.findReachableRoot(candidates);
    if (found != null) {
      _resolvedBase = found;
      if (kDebugMode) {
        debugPrint('MangAfric API → $found (${sourceLabel()})');
      }
      return true;
    }

    _resolvedBase = candidates.isNotEmpty ? candidates.first : platformDefaultRoot();
    // Emulator fallback: never stay on a dead localhost/LAN URL.
    if (Platform.isAndroid && !await ApiDiscovery.isAndroidPhysicalDevice) {
      _resolvedBase = platformDefaultRoot();
    }
    if (kDebugMode) {
      debugPrint('MangAfric API unreachable; using ${base()}');
    }
    return false;
  }

  static Future<void> saveBaseUrlOverride(String userInput) async {
    final normalized = normalizeToApiV1Root(userInput);
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_prefKey, normalized);
    _savedOverride = normalized;
    _resolvedBase = normalized;
  }

  static Future<void> clearSavedBaseUrlOverride() async {
    _savedOverride = null;
    _resolvedBase = null;
    final sp = await SharedPreferences.getInstance();
    await sp.remove(_prefKey);
    await discoverReachableBaseUrl(force: true);
  }

  /// Resets to emulator/localhost defaults (debug: long-press logo if connection fails).
  static Future<void> resetToPlatformDefault() async {
    await clearSavedBaseUrlOverride();
    _resolvedBase = platformDefaultRoot();
  }

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

  static String normalizeToApiV1Root(String input) {
    var s = input.trim();
    if (s.isEmpty) return '';
    s = s.replaceAll(RegExp(r'/+$'), '');
    if (s.endsWith('/api/v1')) return s;
    if (s.endsWith('/api')) return '$s/v1';
    return '$s/api/v1';
  }

  static String platformDefaultRoot() {
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

  static String base() {
    if (_resolvedBase != null && _resolvedBase!.isNotEmpty) {
      return _resolvedBase!.replaceAll(RegExp(r'/+$'), '');
    }
    if (_savedOverride != null && _savedOverride!.isNotEmpty) {
      return _savedOverride!.replaceAll(RegExp(r'/+$'), '');
    }
    final fromDefine = _fromEnvironment.trim();
    if (fromDefine.isNotEmpty) {
      return normalizeToApiV1Root(fromDefine);
    }
    final lan = _lanHost.trim();
    if (lan.isNotEmpty) {
      if (lan.startsWith('http://') || lan.startsWith('https://')) {
        return normalizeToApiV1Root(lan);
      }
      return 'http://$lan:8088/api/v1';
    }
    return platformDefaultRoot().replaceAll(RegExp(r'/+$'), '');
  }

  static String sourceLabel() {
    if (_resolvedBase != null) return 'détectée';
    if (_savedOverride != null && _savedOverride!.isNotEmpty) return 'enregistrée';
    if (_fromEnvironment.trim().isNotEmpty) return 'dart-define';
    if (_lanHost.trim().isNotEmpty) return 'LAN';
    return 'défaut plateforme';
  }

  static String connectionFailedMessage([String? technical]) {
    return 'Impossible de joindre le serveur MangAfric. Vérifiez que le backend est démarré et que l’appareil est sur le même réseau.';
  }
}
