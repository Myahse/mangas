import 'package:flutter/material.dart';

import '../data/catalog_service.dart';
import '../theme.dart';
import 'api_config.dart';

/// Returns `true` if the user saved a new URL (caller may reload data).
Future<bool> showApiEndpointEditor(BuildContext context) async {
  final initial = ApiConfig.base();
  final controller = TextEditingController(text: initial);
  var preview = ApiConfig.normalizeToApiV1Root(controller.text);

  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: AppColors.bgWhite,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) {
      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
        child: StatefulBuilder(
          builder: (ctx, setModal) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'URL du serveur',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  Text(
                    'Racine de l’API (sans ou avec /api/v1). Ex. http://192.168.1.10:8088',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: controller,
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      labelText: 'URL',
                      border: OutlineInputBorder(),
                      hintText: 'http://192.168.1.10:8088',
                    ),
                    onChanged: (v) => setModal(() => preview = ApiConfig.normalizeToApiV1Root(v)),
                  ),
                  const SizedBox(height: 8),
                  Text('Aperçu : $preview', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: () async {
                      final err = ApiConfig.validateApiRootInput(controller.text);
                      if (err != null) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
                        return;
                      }
                      try {
                        await ApiConfig.saveBaseUrlOverride(controller.text);
                        await catalogService.pingHealth();
                        if (ctx.mounted) Navigator.pop(ctx, true);
                      } catch (e) {
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('$e'), duration: const Duration(seconds: 8)),
                        );
                      }
                    },
                    child: const Text('Enregistrer et tester'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () async {
                      await ApiConfig.clearSavedBaseUrlOverride();
                      if (ctx.mounted) Navigator.pop(ctx, true);
                    },
                    child: const Text('Réinitialiser (défaut plateforme / dart-define)'),
                  ),
                ],
              ),
            );
          },
        ),
      );
    },
  );

  controller.dispose();
  return saved == true;
}
