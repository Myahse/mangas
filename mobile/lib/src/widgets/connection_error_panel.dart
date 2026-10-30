import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/api_config.dart';
import '../config/api_discovery.dart';
import '../config/api_endpoint_sheet.dart';
import '../theme.dart';

class ConnectionErrorPanel extends StatelessWidget {
  const ConnectionErrorPanel({
    super.key,
    required this.onRetry,
    this.busy = false,
  });

  final Future<void> Function() onRetry;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: ApiDiscovery.connectionHint(),
      builder: (context, snap) {
        final hint = snap.data ?? '';
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 48, color: AppColors.textMuted),
              const SizedBox(height: 16),
              Text(
                ApiConfig.connectionFailedMessage(),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, height: 1.45),
              ),
              const SizedBox(height: 12),
              Text(
                'URL actuelle : ${ApiConfig.base()}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.4),
              ),
              if (hint.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  hint,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.45),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: busy
                    ? null
                    : () async {
                        await ApiConfig.discoverReachableBaseUrl(force: true);
                        await onRetry();
                      },
                child: Text(busy ? 'Connexion…' : 'Réessayer'),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () => context.push('/telechargements'),
                icon: const Icon(Icons.download_for_offline_outlined),
                label: const Text('Lire mes téléchargements'),
              ),
              if (kDebugMode) ...[
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: busy
                      ? null
                      : () async {
                          await ApiConfig.resetToPlatformDefault();
                          await onRetry();
                        },
                  child: const Text('Réinitialiser (émulateur)'),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: busy
                      ? null
                      : () async {
                          final ok = await showApiEndpointEditor(context);
                          if (ok) await onRetry();
                        },
                  child: const Text('Configurer l’URL (debug)'),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
