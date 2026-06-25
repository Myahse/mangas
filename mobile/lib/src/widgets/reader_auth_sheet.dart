import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_exceptions.dart';
import '../config/api_config.dart';
import '../config/api_endpoint_sheet.dart';
import '../theme.dart';

Future<void> showReaderAuthSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: AppColors.bgWhite,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
      child: const _ReaderAuthSheetBody(),
    ),
  );
}

class _ReaderAuthSheetBody extends StatefulWidget {
  const _ReaderAuthSheetBody();

  @override
  State<_ReaderAuthSheetBody> createState() => _ReaderAuthSheetBodyState();
}

class _ReaderAuthSheetBodyState extends State<_ReaderAuthSheetBody> {
  bool _showForm = false;
  bool _busy = false;
  bool _showPassword = false;
  bool _forcePw = false;
  String _error = '';
  bool _forgotSent = false;
  String _apiBase = ApiConfig.base();

  final _email = TextEditingController();
  final _password = TextEditingController();
  final _newPassword = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _newPassword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = '';
      _forgotSent = false;
    });

    if (!_showForm) {
      setState(() => _showForm = true);
      return;
    }

    final email = _email.text.trim();
    final pw = _password.text;

    if (!_forcePw) {
      if (email.isEmpty || pw.isEmpty) {
        setState(() => _error = 'Veuillez saisir votre email et votre mot de passe.');
        return;
      }
    } else {
      if (pw.isEmpty || _newPassword.text.trim().length < 6) {
        setState(() => _error = 'Veuillez saisir votre ancien mot de passe et un nouveau (min. 6 caractères).');
        return;
      }
    }

    setState(() => _busy = true);
    try {
      if (_forcePw) {
        await authController.changePassword(
          email: email,
          oldPassword: pw,
          newPassword: _newPassword.text.trim(),
        );
        await authController.login(email: email, password: _newPassword.text.trim());
        if (!mounted) return;
        Navigator.of(context).pop();
      } else {
        await authController.login(email: email, password: pw);
        if (!mounted) return;
        Navigator.of(context).pop();
      }
    } on MustChangePasswordException catch (e) {
      setState(() {
        _forcePw = true;
        _email.text = e.email;
        _password.text = e.currentPassword;
        _newPassword.clear();
        _error = mapAuthErrorMessage(e);
      });
    } catch (e) {
      setState(() => _error = mapAuthErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgot() async {
    setState(() {
      _error = '';
      _forgotSent = false;
    });
    final email = _email.text.trim();
    if (email.isEmpty) {
      setState(() => _error = 'Veuillez saisir votre email.');
      return;
    }
    setState(() => _busy = true);
    try {
      await authController.forgotPassword(email);
      setState(() => _forgotSent = true);
    } catch (e) {
      setState(() => _error = mapAuthErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Spacer(),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
                tooltip: 'Fermer',
              ),
            ],
          ),
          Center(
            child: RichText(
              text: const TextSpan(
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textDark),
                children: [
                  TextSpan(text: 'Mang'),
                  TextSpan(text: 'Afrik', style: TextStyle(color: AppColors.primary)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Connectez-vous pour reprendre votre lecture.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.bgLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE7E7E7)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.cloud_outlined, size: 18, color: AppColors.textMuted),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Serveur', style: TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text(
                        _apiBase,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Source: ${ApiConfig.sourceLabel()}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          final ok = await showApiEndpointEditor(context);
                          if (!context.mounted) return;
                          if (ok) {
                            setState(() => _apiBase = ApiConfig.base());
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('URL du serveur mise à jour.')),
                            );
                          }
                        },
                  child: const Text('Modifier'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (!_showForm)
            FilledButton(
              onPressed: _busy ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary, padding: const EdgeInsets.symmetric(vertical: 14)),
              child: const Text('Se connecter avec Email'),
            ),
          if (_showForm) ...[
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
                hintText: 'Entrez votre email',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: !_showPassword,
              decoration: InputDecoration(
                labelText: _forcePw ? 'Ancien mot de passe' : 'Mot de passe',
                border: const OutlineInputBorder(),
                hintText: _forcePw ? 'Entrez votre ancien mot de passe' : 'Entrez votre mot de passe',
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _showPassword = !_showPassword),
                  icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                ),
              ),
            ),
            if (_forcePw) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _newPassword,
                obscureText: !_showPassword,
                decoration: const InputDecoration(
                  labelText: 'Nouveau mot de passe',
                  border: OutlineInputBorder(),
                  hintText: 'Minimum 6 caractères',
                ),
              ),
            ],
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(_error, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: _busy ? null : _forgot,
                child: const Text('Mot de passe oublié ?'),
              ),
            ),
            if (_forgotSent)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Si ce compte existe, un lien de réinitialisation a été envoyé à votre email.',
                  style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
              ),
            FilledButton(
              onPressed: _busy ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary, padding: const EdgeInsets.symmetric(vertical: 14)),
              child: Text(_busy ? 'Connexion…' : 'Se connecter'),
            ),
          ],
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Pas encore de compte ? ', style: TextStyle(color: AppColors.textMuted)),
              TextButton(
                onPressed: _busy
                    ? null
                    : () {
                        Navigator.of(context).pop();
                        context.push('/register');
                      },
                child: const Text('Créer un compte'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
