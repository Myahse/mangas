import 'package:flutter/material.dart';

import 'src/auth/auth_controller.dart';
import 'src/config/api_config.dart';
import 'src/screens/creator_shell.dart';
import 'src/screens/login_screen.dart';
import 'src/theme/creator_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.loadSavedBaseUrl();
  await authController.load();
  runApp(const MangafriqCreatorApp());
}

class MangafriqCreatorApp extends StatelessWidget {
  const MangafriqCreatorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MangAfric Studio',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: CreatorColors.primary),
        scaffoldBackgroundColor: CreatorColors.bgLight,
        useMaterial3: true,
      ),
      home: ListenableBuilder(
        listenable: authController,
        builder: (context, _) {
          return authController.isAuthenticated ? const CreatorShell() : const LoginScreen();
        },
      ),
    );
  }
}
