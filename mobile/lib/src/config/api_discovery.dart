import 'dart:async';
import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:http/http.dart' as http;

import 'api_config.dart';

/// Probes candidate API roots and picks the first that responds to `/health`.
abstract final class ApiDiscovery {
  static bool? _androidPhysicalDevice;

  static Future<bool> get isAndroidPhysicalDevice async {
    if (!Platform.isAndroid) return false;
    if (_androidPhysicalDevice != null) return _androidPhysicalDevice!;
    try {
      final info = await DeviceInfoPlugin().androidInfo;
      _androidPhysicalDevice = info.isPhysicalDevice;
    } catch (_) {
      // If detection fails, assume emulator so 10.0.2.2 stays available.
      _androidPhysicalDevice = false;
    }
    return _androidPhysicalDevice!;
  }

  /// Build ordered list of API roots to try (no trailing slash).
  static Future<List<String>> candidateRoots({
    String? savedOverride,
    String? fromEnvironment,
    String? lanHost,
  }) async {
    final seen = <String>{};
    final out = <String>[];

    void add(String? raw) {
      if (raw == null || raw.trim().isEmpty) return;
      final n = ApiConfig.normalizeToApiV1Root(raw);
      if (n.isEmpty || seen.contains(n)) return;
      seen.add(n);
      out.add(n);
    }

    add(fromEnvironment);

    final lan = (lanHost ?? '').trim();
    final physical = Platform.isAndroid ? await isAndroidPhysicalDevice : false;

    // Emulator: always try the host loopback alias first (before any saved bad URL).
    if (Platform.isAndroid && !physical) {
      add('http://10.0.2.2:8088');
    }

    add(savedOverride);

    if (lan.isNotEmpty) {
      if (lan.startsWith('http://') || lan.startsWith('https://')) {
        add(lan);
      } else {
        add('http://$lan:8088');
      }
    }

    if (Platform.isAndroid) {
      if (physical) {
        if (lan.isNotEmpty) {
          for (final u in List<String>.from(out)) {
            if (u.contains('localhost') || u.contains('127.0.0.1') || u.contains('10.0.2.2')) {
              add(u.replaceAll('localhost', lan).replaceAll('127.0.0.1', lan).replaceAll('10.0.2.2', lan));
            }
          }
        }
      }
    } else if (Platform.isIOS) {
      add('http://127.0.0.1:8088');
    } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      add('http://127.0.0.1:8088');
      add('http://localhost:8088');
      add(ApiConfig.platformDefaultRoot());
    }

    return out;
  }

  static Future<bool> pingHealth(String apiRoot) async {
    try {
      final uri = Uri.parse('${apiRoot.replaceAll(RegExp(r'/+$'), '')}/health');
      final res = await http.get(uri).timeout(const Duration(seconds: 5));
      return res.statusCode >= 200 && res.statusCode < 300;
    } on SocketException {
      return false;
    } on TimeoutException {
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<String?> findReachableRoot(List<String> candidates) async {
    for (final c in candidates) {
      if (await pingHealth(c)) return c;
    }
    return null;
  }

  static Future<String> connectionHint() async {
    if (Platform.isAndroid && await isAndroidPhysicalDevice) {
      final lan = ApiConfig.lanHostFromEnvironment();
      if (lan.isEmpty) {
        return 'Sur un téléphone physique, le backend doit être joignable via l’IP Wi‑Fi de votre PC.\n'
            'Relancez avec :\n'
            'flutter run --dart-define=MANGAFRIC_LAN_HOST=192.168.x.x\n'
            '(même réseau Wi‑Fi, backend sur le port 8088)';
      }
      return 'Vérifiez que le backend tourne sur $lan:8088 et que le pare-feu Windows autorise le port 8088.';
    }
    if (Platform.isAndroid) {
      return 'Émulateur Android : le backend doit écouter sur votre PC (port 8088). URL attendue : http://10.0.2.2:8088/api/v1';
    }
    return 'Vérifiez que le backend Spring est démarré (port 8088) et accessible à ${ApiConfig.base()}';
  }
}
