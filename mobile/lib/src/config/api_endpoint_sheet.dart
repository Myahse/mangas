import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../data/catalog_service.dart';
import '../theme.dart';
import 'api_config.dart';

/// Dev-only API URL editor. Hidden in release builds.
Future<bool> showApiEndpointEditor(BuildContext context) async {
  if (!kDebugMode) return false;

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
                          'URL du serveur (debug)',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  TextField(
                    controller: controller,
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                    decoration: const InputDecoration(labelText: 'URL', border: OutlineInputBorder()),
                    onChanged: (v) => setModal(() => preview = ApiConfig.normalizeToApiV1Root(v)),
                  ),
                  const SizedBox(height: 8),
                  Text('Aperçu : $preview', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
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
                        await ApiConfig.discoverReachableBaseUrl(force: true);
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
