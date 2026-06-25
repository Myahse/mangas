import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_exceptions.dart';
import '../config/api_config.dart';
import '../config/api_endpoint_sheet.dart';
import '../theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  int _step = 2;
  bool _busy = false;
  String? _submitError;
  String _referralCode = '';
  String _apiBase = ApiConfig.base();

  final _favoriteGenres = TextEditingController();
  String _readingFrequency = 'weekly';

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  bool _readRef = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_readRef) return;
    _readRef = true;
    final ref = GoRouterState.of(context).uri.queryParameters['ref']?.trim() ?? '';
    if (ref.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _referralCode = ref);
      });
    }
  }

  @override
  void dispose() {
    _favoriteGenres.dispose();
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  bool get _canContinueStep2 => _favoriteGenres.text.trim().isNotEmpty;

  bool get _canFinish =>
      _name.text.trim().isNotEmpty &&
      _email.text.trim().isNotEmpty &&
      _password.text.trim().length >= 6;

  String get _title => _step == 2 ? 'Vos préférences de lecture' : 'Informations du compte';

  Future<void> _finish() async {
    if (!_canFinish || _busy) return;
    setState(() {
      _busy = true;
      _submitError = null;
    });
    try {
      await authController.registerAndSignIn(
        name: _name.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        profile: {
          'favoriteGenres': _favoriteGenres.text.trim(),
          'readingFrequency': _readingFrequency,
        },
        referralCode: _referralCode.isEmpty ? null : _referralCode,
      );
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      setState(() => _submitError = mapAuthErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
              child: Row(
                children: [
                  TextButton.icon(
                    onPressed: () {
                      if (_step == 2) {
                        context.pop();
                      } else {
                        setState(() => _step = 2);
                      }
                    },
                    icon: const Icon(Icons.chevron_left),
                    label: const Text('Retour'),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () async {
                            final ok = await showApiEndpointEditor(context);
                            if (!mounted) return;
                            if (ok) setState(() => _apiBase = ApiConfig.base());
                          },
                    child: const Text('Serveur'),
                  ),
                  RichText(
                    text: const TextSpan(
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark),
                      children: [
                        TextSpan(text: 'Mang'),
                        TextSpan(text: 'Afrik', style: TextStyle(color: AppColors.primary)),
                      ],
                    ),
                  ),
                  const Spacer(flex: 2),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'API: $_apiBase',
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 8),
                    Center(
                      child: RichText(
                        text: const TextSpan(
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.textDark),
                          children: [
                            TextSpan(text: 'Mang'),
                            TextSpan(text: 'Afrik', style: TextStyle(color: AppColors.primary)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(_title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    Text(
                      _step == 2
                          ? 'Quelques questions rapides pour personnaliser votre expérience.'
                          : 'Dernière étape : vos identifiants de connexion.',
                      style: TextStyle(color: AppColors.textSecondary, height: 1.35),
                    ),
                    const SizedBox(height: 24),
                    if (_submitError != null) ...[
                      Text(_submitError!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 12),
                    ],
                    if (_step == 2) ...[
                      TextField(
                        controller: _favoriteGenres,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: 'Genres préférés',
                          border: OutlineInputBorder(),
                          hintText: 'Ex: Shonen, Romance, Aventure',
                        ),
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        initialValue: _readingFrequency,
                        decoration: const InputDecoration(
                          labelText: 'Fréquence de lecture',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'daily', child: Text('Tous les jours')),
                          DropdownMenuItem(value: 'weekly', child: Text('Chaque semaine')),
                          DropdownMenuItem(value: 'sometimes', child: Text('De temps en temps')),
                        ],
                        onChanged: (v) => setState(() => _readingFrequency = v ?? 'weekly'),
                      ),
                    ] else ...[
                      TextField(
                        controller: _name,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: 'Nom',
                          border: OutlineInputBorder(),
                          hintText: 'Votre nom',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _email,
                        onChanged: (_) => setState(() {}),
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          border: OutlineInputBorder(),
                          hintText: 'vous@exemple.com',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _password,
                        onChanged: (_) => setState(() {}),
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Mot de passe',
                          border: OutlineInputBorder(),
                          hintText: 'Minimum 6 caractères',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Vous pourrez personnaliser ces choix plus tard.',
                        style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                      ),
                    ],
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
              child: Row(
                children: [
                  TextButton.icon(
                    onPressed: () {
                      if (_step == 2) {
                        context.pop();
                      } else {
                        setState(() => _step = 2);
                      }
                    },
                    icon: const Icon(Icons.chevron_left),
                    label: const Text('Retour'),
                  ),
                  const Spacer(),
                  if (_step < 3)
                    FilledButton(
                      onPressed: !_canContinueStep2 ? null : () => setState(() => _step = 3),
                      style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                      child: const Text('Continuer'),
                    )
                  else
                    FilledButton(
                      onPressed: (!_canFinish || _busy) ? null : _finish,
                      style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                      child: Text(_busy ? 'Création…' : 'Créer mon compte'),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
