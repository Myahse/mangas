import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'src/config/api_config.dart';
import 'src/router.dart';
import 'src/startup.dart';
import 'src/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  if (kDebugMode) {
    debugPrint('MangAfric API base → ${ApiConfig.base()} (${ApiConfig.sourceLabel()})');
  }
  runApp(MangafriqReaderApp(router: createRouter(appStartup)));
}

class MangafriqReaderApp extends StatelessWidget {
  const MangafriqReaderApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MangAfric',
      debugShowCheckedModeBanner: false,
      theme: buildLightTheme(),
      routerConfig: router,
    );
  }
}
