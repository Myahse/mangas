import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/wallet_service.dart';
import '../theme.dart';
import '../widgets/account_page_layout.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key, this.token});

  final String? token;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscure = true;
  bool _busy = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final token = (widget.token ?? '').trim();
    final pwd = _password.text;
    final confirm = _confirm.text;
    if (token.isEmpty) {
      setState(() => _error = 'Lien invalide ou expiré.');
      return;
    }
    if (pwd.length < 8) {
      setState(() => _error = 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (pwd != confirm) {
      setState(() => _error = 'Les mots de passe ne correspondent pas.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _success = null;
    });
    try {
      await walletService.resetPassword(token: token, newPassword: pwd);
      setState(() => _success = 'Mot de passe mis à jour. Vous pouvez vous connecter.');
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasToken = (widget.token ?? '').trim().isNotEmpty;

    return AccountPageLayout(
      title: 'Réinitialiser le mot de passe',
      lead: hasToken ? 'Choisissez un nouveau mot de passe pour votre compte.' : 'Ce lien est invalide ou incomplet.',
      child: AccountCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!hasToken)
              const Text('Ouvrez le lien reçu par email pour réinitialiser votre mot de passe.', style: TextStyle(color: AppColors.textSecondary, height: 1.4))
            else ...[
              TextField(
                controller: _password,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: 'Nouveau mot de passe',
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _confirm,
                obscureText: _obscure,
                decoration: const InputDecoration(labelText: 'Confirmer le mot de passe'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.accentDark, fontWeight: FontWeight.w600)),
              ],
              if (_success != null) ...[
                const SizedBox(height: 12),
                Text(_success!, style: const TextStyle(color: AppColors.textSecondary, height: 1.4)),
              ],
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _busy || _success != null ? null : _submit,
                child: Text(_busy ? 'Mise à jour…' : 'Mettre à jour'),
              ),
            ],
            const SizedBox(height: 12),
            TextButton(onPressed: () => context.go('/home'), child: const Text('Retour à l’accueil')),
          ],
        ),
      ),
    );
  }
}
