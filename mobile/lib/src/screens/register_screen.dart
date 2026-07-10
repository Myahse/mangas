import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_exceptions.dart';
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

  final _favoriteGenres = TextEditingController();
  String _readingFrequency = 'weekly';

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  bool _readRef = false;

  static const _stepAnimDuration = Duration(milliseconds: 220);
  static const _fieldMaxWidth = 320.0;

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

  String get _subtitle => _step == 2
      ? 'Quelques questions rapides pour personnaliser votre expérience.'
      : 'Dernière étape : vos identifiants de connexion.';

  void _goBack() {
    if (_step == 2) {
      context.pop();
    } else {
      setState(() {
        _step = 2;
        _submitError = null;
      });
    }
  }

  void _goNext() {
    if (!_canContinueStep2) return;
    setState(() {
      _step = 3;
      _submitError = null;
    });
  }

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
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            children: [
              _RegisterTopBar(onBack: _goBack),
              const SizedBox(height: 12),
              _AnimatedStepHeader(
                step: _step,
                title: _title,
                subtitle: _subtitle,
              ),
              const SizedBox(height: 22),
              Expanded(
                child: SingleChildScrollView(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: _fieldMaxWidth),
                      child: AnimatedSwitcher(
                        duration: _stepAnimDuration,
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeInCubic,
                        transitionBuilder: (child, animation) {
                          final slide = Tween<Offset>(
                            begin: const Offset(0.04, 0),
                            end: Offset.zero,
                          ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic));
                          return FadeTransition(
                            opacity: animation,
                            child: SlideTransition(position: slide, child: child),
                          );
                        },
                        child: _step == 2 ? _buildStep2Fields() : _buildStep3Fields(),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: _fieldMaxWidth),
                  child: _step < 3
                      ? _RegisterPrimaryButton(
                          label: 'Continuer',
                          enabled: _canContinueStep2,
                          onPressed: _goNext,
                        )
                      : _RegisterPrimaryButton(
                          label: _busy ? 'Création…' : 'Créer mon compte',
                          enabled: _canFinish && !_busy,
                          onPressed: _finish,
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep2Fields() {
    return Column(
      key: const ValueKey('step2'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_submitError != null) ...[
          _RegisterHint(message: _submitError!, isError: true),
          const SizedBox(height: 14),
        ],
        _RegisterField(
          label: 'Genres préférés',
          child: TextField(
            controller: _favoriteGenres,
            onChanged: (_) => setState(() {}),
            style: _fieldTextStyle,
            decoration: _fieldDecoration('Ex: Shonen, Romance, Aventure'),
          ),
        ),
        const SizedBox(height: 14),
        _RegisterField(
          label: 'Fréquence de lecture',
          child: DropdownButtonFormField<String>(
            initialValue: _readingFrequency,
            style: _fieldTextStyle,
            decoration: _fieldDecoration(null),
            borderRadius: BorderRadius.circular(12),
            items: const [
              DropdownMenuItem(value: 'daily', child: Text('Tous les jours')),
              DropdownMenuItem(value: 'weekly', child: Text('Chaque semaine')),
              DropdownMenuItem(value: 'sometimes', child: Text('De temps en temps')),
            ],
            onChanged: (v) => setState(() => _readingFrequency = v ?? 'weekly'),
          ),
        ),
      ],
    );
  }

  Widget _buildStep3Fields() {
    return Column(
      key: const ValueKey('step3'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_submitError != null) ...[
          _RegisterHint(message: _submitError!, isError: true),
          const SizedBox(height: 14),
        ],
        _RegisterField(
          label: 'Nom',
          child: TextField(
            controller: _name,
            onChanged: (_) => setState(() {}),
            style: _fieldTextStyle,
            textInputAction: TextInputAction.next,
            decoration: _fieldDecoration('Votre nom'),
          ),
        ),
        const SizedBox(height: 14),
        _RegisterField(
          label: 'Email',
          child: TextField(
            controller: _email,
            onChanged: (_) => setState(() {}),
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            style: _fieldTextStyle,
            textInputAction: TextInputAction.next,
            decoration: _fieldDecoration('vous@exemple.com'),
          ),
        ),
        const SizedBox(height: 14),
        _RegisterField(
          label: 'Mot de passe',
          child: TextField(
            controller: _password,
            onChanged: (_) => setState(() {}),
            obscureText: true,
            style: _fieldTextStyle,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _finish(),
            decoration: _fieldDecoration('Minimum 6 caractères'),
          ),
        ),
        const SizedBox(height: 14),
        const _RegisterHint(
          message: 'Vous pourrez personnaliser ces choix plus tard.',
        ),
      ],
    );
  }

  static const _fieldTextStyle = TextStyle(
    fontWeight: FontWeight.w600,
    fontSize: 15,
    color: AppColors.textDark,
  );

  InputDecoration _fieldDecoration(String? hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: AppColors.bgWhite,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primaryDark, width: 1.5),
      ),
    );
  }
}

class _RegisterTopBar extends StatelessWidget {
  const _RegisterTopBar({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _RegisterGhostIconButton(onPressed: onBack),
        const Expanded(child: Center(child: _RegisterBrand(compact: true))),
        const SizedBox(width: 42, height: 42),
      ],
    );
  }
}

class _RegisterGhostIconButton extends StatefulWidget {
  const _RegisterGhostIconButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  State<_RegisterGhostIconButton> createState() => _RegisterGhostIconButtonState();
}

class _RegisterGhostIconButtonState extends State<_RegisterGhostIconButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.ease,
        width: 42,
        height: 42,
        transform: Matrix4.translationValues(0, _pressed ? -1 : 0, 0),
        decoration: BoxDecoration(
          color: AppColors.bgWhite.withValues(alpha: 0.92),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.black.withValues(alpha: 0.10)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: const Icon(Icons.chevron_left, size: 22, color: AppColors.textDark),
      ),
    );
  }
}

class _RegisterBrand extends StatelessWidget {
  const _RegisterBrand({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final logoHeight = compact ? 44.0 : 52.0;
    return Image.asset(
      'assets/images/magafrik-logo.png',
      height: logoHeight,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => RichText(
        text: TextSpan(
          style: TextStyle(
            fontSize: compact ? 30 : 34,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.02,
            color: AppColors.textDark,
          ),
          children: const [
            TextSpan(text: 'Mang'),
            TextSpan(text: 'Afrik', style: TextStyle(color: AppColors.primary)),
          ],
        ),
      ),
    );
  }
}

class _AnimatedStepHeader extends StatelessWidget {
  const _AnimatedStepHeader({
    required this.step,
    required this.title,
    required this.subtitle,
  });

  final int step;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 220),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) {
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(animation),
            child: child,
          ),
        );
      },
      child: Column(
        key: ValueKey(step),
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: AppColors.textDark,
              letterSpacing: -0.02,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w700,
              fontSize: 15,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}

class _RegisterField extends StatelessWidget {
  const _RegisterField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: AppColors.textDark,
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}

class _RegisterHint extends StatelessWidget {
  const _RegisterHint({required this.message, this.isError = false});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: 1,
      duration: const Duration(milliseconds: 200),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isError
              ? AppColors.primaryDark.withValues(alpha: 0.08)
              : AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isError
                ? AppColors.primaryDark.withValues(alpha: 0.25)
                : AppColors.primary.withValues(alpha: 0.18),
          ),
        ),
        child: Text(
          message,
          style: TextStyle(
            color: isError ? AppColors.primaryDark : AppColors.textSecondary,
            fontWeight: FontWeight.w700,
            fontSize: 14,
            height: 1.35,
          ),
        ),
      ),
    );
  }
}

class _RegisterPrimaryButton extends StatefulWidget {
  const _RegisterPrimaryButton({
    required this.label,
    required this.enabled,
    required this.onPressed,
  });

  final String label;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  State<_RegisterPrimaryButton> createState() => _RegisterPrimaryButtonState();
}

class _RegisterPrimaryButtonState extends State<_RegisterPrimaryButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.enabled;
    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
      onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
      onTapCancel: () => setState(() => _pressed = false),
      onTap: enabled ? widget.onPressed : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.ease,
        width: double.infinity,
        height: 44,
        transform: Matrix4.translationValues(0, enabled && _pressed ? -1 : 0, 0),
        decoration: BoxDecoration(
          color: enabled
              ? (_pressed ? AppColors.primaryDark : AppColors.primary)
              : AppColors.primary.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.center,
        child: Text(
          widget.label,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 15,
          ),
        ),
      ),
    );
  }
}
