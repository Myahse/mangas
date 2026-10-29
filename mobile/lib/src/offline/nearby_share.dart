import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:nearby_connections/nearby_connections.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

import 'offline_store.dart';

/// Phone-to-phone chapter transfer over Google Nearby Connections (Bluetooth to find the
/// other phone, then Wi-Fi Direct / hotspot for the file; no internet needed). Android only:
/// the plugin has no iOS side.
///
/// Protocol: the receiver advertises, the sender discovers and connects. Once connected the
/// sender sends a BYTES header `{"format": "mangafric-chapter", ...}` then the zip as a FILE payload.
const String kNearbyServiceId = 'com.mangafriq.app.mangafriq_reader.share';

bool get nearbySupported => !kIsWeb && Platform.isAndroid;

class NearbyPeer {
  const NearbyPeer(this.id, this.name);
  final String id;
  final String name;
}

/// Asks for the radios Nearby needs; returns a French message when something is missing.
Future<String?> ensureNearbyPermissions() async {
  if (!nearbySupported) return 'Le partage sans internet est disponible sur Android pour le moment.';
  final sdk = (await DeviceInfoPlugin().androidInfo).version.sdkInt;
  final wanted = <Permission>[
    if (sdk < 33) Permission.locationWhenInUse,
    if (sdk >= 31) ...[Permission.bluetoothScan, Permission.bluetoothAdvertise, Permission.bluetoothConnect],
    if (sdk >= 33) Permission.nearbyWifiDevices,
  ];
  final res = await wanted.request();
  if (res.values.any((s) => !s.isGranted)) {
    return 'Autorisez « Appareils à proximité »${sdk < 33 ? ' et la localisation' : ''} pour partager sans internet.';
  }
  if (sdk < 33 && !await Permission.locationWhenInUse.serviceStatus.isEnabled) {
    return 'Activez la localisation du téléphone pour trouver les appareils proches.';
  }
  return null;
}

String _nickname() {
  // Shown on the other phone; Android does not give apps the device name anymore.
  return 'Lecteur MangAfric';
}

/// Sending side: lists nearby receivers and pushes one chapter to the chosen one.
class NearbySender extends ChangeNotifier {
  NearbySender(this.chapter);

  final OfflineChapter chapter;
  final _nearby = Nearby();
  final List<NearbyPeer> peers = [];
  String status = 'Recherche des téléphones proches…';
  double? progress;
  bool done = false;
  bool failed = false;
  String? _peerId;
  int? _filePayloadId;

  Future<void> start() async {
    final err = await ensureNearbyPermissions();
    if (err != null) return _fail(err);
    try {
      await _nearby.startDiscovery(
        _nickname(),
        Strategy.P2P_POINT_TO_POINT,
        serviceId: kNearbyServiceId,
        onEndpointFound: (id, name, serviceId) {
          if (peers.any((p) => p.id == id)) return;
          peers.add(NearbyPeer(id, name));
          notifyListeners();
        },
        onEndpointLost: (id) {
          peers.removeWhere((p) => p.id == id);
          notifyListeners();
        },
      );
    } catch (e) {
      _fail('Impossible de lancer la recherche ($e).');
    }
  }

  Future<void> sendTo(NearbyPeer peer) async {
    _peerId = peer.id;
    status = 'Connexion à ${peer.name}… Acceptez sur l’autre téléphone.';
    notifyListeners();
    try {
      await _nearby.requestConnection(
        _nickname(),
        peer.id,
        onConnectionInitiated: (id, info) {
          _nearby.acceptConnection(
            id,
            onPayLoadRecieved: (_, _) {},
            onPayloadTransferUpdate: (_, u) {
              if (u.id != _filePayloadId) return;
              if (u.totalBytes > 0) progress = u.bytesTransferred / u.totalBytes;
              if (u.status == PayloadStatus.SUCCESS) {
                done = true;
                progress = 1;
                status = 'Chapitre envoyé !';
              } else if (u.status == PayloadStatus.FAILURE || u.status == PayloadStatus.CANCELED) {
                _fail('Envoi interrompu.');
                return;
              }
              notifyListeners();
            },
          );
        },
        onConnectionResult: (id, s) {
          if (s == Status.CONNECTED) {
            _send(id);
          } else {
            _fail(s == Status.REJECTED ? 'L’autre téléphone a refusé.' : 'Connexion impossible.');
          }
        },
        onDisconnected: (id) {
          if (!done) _fail('Connexion perdue.');
        },
      );
    } catch (e) {
      _fail('Connexion impossible ($e).');
    }
  }

  Future<void> _send(String id) async {
    try {
      await _nearby.stopDiscovery();
      status = 'Préparation du chapitre…';
      notifyListeners();
      final zip = await offlineStore.exportBundle(chapter);
      final header = {
        'format': kBundleFormat,
        'version': kBundleVersion,
        'mangaTitle': chapter.mangaTitle,
        'chapterNumber': chapter.chapterNumber,
        'bytes': await zip.length(),
      };
      await _nearby.sendBytesPayload(id, Uint8List.fromList(utf8.encode(jsonEncode(header))));
      status = 'Envoi en cours…';
      progress = 0;
      notifyListeners();
      _filePayloadId = await _nearby.sendFilePayload(id, zip.path);
    } catch (e) {
      _fail('Envoi impossible ($e).');
    }
  }

  void _fail(String message) {
    if (done) return;
    failed = true;
    status = message;
    notifyListeners();
  }

  Future<void> stop() async {
    try {
      await _nearby.stopDiscovery();
      if (_peerId != null) await _nearby.stopAllEndpoints();
    } catch (_) {}
  }
}

/// Receiving side: advertises, asks the reader to accept, then imports the bundle.
class NearbyReceiver extends ChangeNotifier {
  final _nearby = Nearby();
  String status = 'En attente d’un envoi… Gardez cet écran ouvert.';
  double? progress;
  bool failed = false;
  OfflineChapter? received;

  /// Set by the screen: shows "accept from X? code Y" and returns the reader's choice.
  Future<bool> Function(String name, String code)? confirm;

  String _peerName = '';
  int? _filePayloadId;
  final Map<int, String> _fileUris = {};
  bool _expecting = false;

  Future<void> start() async {
    final err = await ensureNearbyPermissions();
    if (err != null) return _fail(err);
    try {
      await _nearby.startAdvertising(
        _nickname(),
        Strategy.P2P_POINT_TO_POINT,
        serviceId: kNearbyServiceId,
        onConnectionInitiated: (id, info) async {
          final ok = await (confirm?.call(info.endpointName, info.authenticationToken) ?? Future.value(false));
          if (!ok) {
            await _nearby.rejectConnection(id);
            return;
          }
          _peerName = info.endpointName;
          await _nearby.acceptConnection(id, onPayLoadRecieved: _onPayload, onPayloadTransferUpdate: _onUpdate);
        },
        onConnectionResult: (id, s) {
          if (s == Status.CONNECTED) {
            status = 'Connecté à $_peerName. Réception…';
            notifyListeners();
          }
        },
        onDisconnected: (id) {
          if (received == null && _expecting) _fail('Connexion perdue pendant la réception.');
        },
      );
    } catch (e) {
      _fail('Impossible de se rendre visible ($e).');
    }
  }

  void _onPayload(String id, Payload p) {
    if (p.type == PayloadType.BYTES && p.bytes != null) {
      try {
        final h = jsonDecode(utf8.decode(p.bytes!)) as Map<String, dynamic>;
        if (h['format'] != kBundleFormat) return;
        _expecting = true;
        status = 'Réception de « ${h['mangaTitle']} » ch. ${h['chapterNumber']}…';
        progress = 0;
        notifyListeners();
      } catch (_) {}
    } else if (p.type == PayloadType.FILE && _expecting) {
      _filePayloadId = p.id;
      // ignore: deprecated_member_use
      final where = p.uri ?? p.filePath;
      if (where != null) _fileUris[p.id] = where;
    }
  }

  Future<void> _onUpdate(String id, PayloadTransferUpdate u) async {
    if (u.id != _filePayloadId) return;
    if (u.status == PayloadStatus.IN_PROGRESS && u.totalBytes > 0) {
      progress = u.bytesTransferred / u.totalBytes;
      notifyListeners();
    } else if (u.status == PayloadStatus.SUCCESS) {
      await _import(id, u.id);
    } else if (u.status == PayloadStatus.FAILURE || u.status == PayloadStatus.CANCELED) {
      _fail('Réception interrompue.');
    }
  }

  Future<void> _import(String endpointId, int payloadId) async {
    final src = _fileUris[payloadId];
    if (src == null) return _fail('Fichier reçu introuvable.');
    status = 'Ouverture du chapitre…';
    notifyListeners();
    final tmp = await getTemporaryDirectory();
    final dest = File('${tmp.path}/received_$payloadId.zip');
    try {
      if (src.startsWith('content://')) {
        final ok = await _nearby.copyFileAndDeleteOriginal(src, dest.path);
        if (!ok) return _fail('Fichier reçu illisible.');
      } else {
        await File(src).rename(dest.path);
      }
      received = await offlineStore.importBundle(dest, from: _peerName);
      status = 'Chapitre reçu !';
      progress = 1;
      notifyListeners();
    } on OfflineException catch (e) {
      _fail(e.message);
    } catch (e) {
      _fail('Import impossible ($e).');
    } finally {
      if (await dest.exists()) await dest.delete();
      await _nearby.disconnectFromEndpoint(endpointId);
    }
  }

  void _fail(String message) {
    failed = true;
    status = message;
    notifyListeners();
  }

  Future<void> stop() async {
    try {
      await _nearby.stopAdvertising();
      await _nearby.stopAllEndpoints();
    } catch (_) {}
  }
}
