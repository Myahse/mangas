import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_exceptions.dart';
import '../theme.dart';

/// Web-style auth modal (front/src/components/auth/AuthModal.jsx).
Future<void> showReaderAuthDialog(BuildContext context) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Connexion',
    barrierColor: Colors.black.withValues(alpha: 0.45),
    transitionDuration: const Duration(milliseconds: 220),
    pageBuilder: (ctx, anim1, anim2) {
      return const Center(
        child: _AuthModalPanel(),
      );
    },
    transitionBuilder: (context, anim, _, child) {
      final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
      return BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10 * anim.value, sigmaY: 10 * anim.value),
        child: FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.96, end: 1).animate(curved),
            child: child,
          ),
        ),
      );
    },
  );
}

Future<void> showReaderAuthSheet(BuildContext context) => showReaderAuthDialog(context);

class _AuthModalPanel extends StatelessWidget {
  const _AuthModalPanel();

  @override
  Widget build(BuildContext context) {
    final maxH = MediaQuery.sizeOf(context).height -
        MediaQuery.paddingOf(context).top -
        MediaQuery.paddingOf(context).bottom -
        24;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: 520,
          constraints: BoxConstraints(maxWidth: 520, maxHeight: maxH),
          decoration: BoxDecoration(
            color: AppColors.bgWhite,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.14),
                blurRadius: 40,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: const _ReaderAuthSheetBody(),
        ),
      ),
    );
  }
}

class _ReaderAuthSheetBody extends StatefulWidget {
  const _ReaderAuthSheetBody();

  @override
  State<_ReaderAuthSheetBody> createState() => _ReaderAuthSheetBodyState();
}

class _ReaderAuthSheetBodyState extends State<_ReaderAuthSheetBody> with SingleTickerProviderStateMixin {
  bool _showLoginForm = false;
  bool _busy = false;
  bool _showPassword = false;
  bool _forcePw = false;
  String _error = '';
  bool _forgotSent = false;

  late final AnimationController _formAnimController;
  late final Animation<double> _formFade;
  late final Animation<Offset> _formSlide;

  final _email = TextEditingController();
  final _password = TextEditingController();
  final _newPassword = TextEditingController();

  static const _fieldMaxWidth = 300.0;

  @override
  void initState() {
    super.initState();
    _formAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _formFade = CurvedAnimation(parent: _formAnimController, curve: Curves.easeOut);
    _formSlide = Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero).animate(_formFade);
  }

  @override
  void dispose() {
    _formAnimController.dispose();
    _email.dispose();
    _password.dispose();
    _newPassword.dispose();
    super.dispose();
  }

  void _openLoginForm() {
    setState(() {
      _showLoginForm = true;
      _error = '';
      _forgotSent = false;
    });
    _formAnimController.forward(from: 0);
  }

  Future<void> _primaryAction() async {
    setState(() {
      _error = '';
      _forgotSent = false;
    });

    if (!_showLoginForm) {
      _openLoginForm();
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

  void _goRegister() {
    Navigator.of(context).pop();
    context.push('/register');
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 62, 16, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              _AuthBrand(),
              const SizedBox(height: 14),
              const Text(
                'Connectez-vous pour reprendre votre lecture.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 14),
              if (!_showLoginForm) ...[
                _AuthPrimaryButton(
                  label: 'Se connecter avec Email',
                  enabled: !_busy,
                  compact: true,
                  onPressed: _primaryAction,
                ),
                const SizedBox(height: 4),
              ],
              AnimatedSize(
                duration: const Duration(milliseconds: 320),
                curve: Curves.ease,
                alignment: Alignment.topCenter,
                clipBehavior: Clip.hardEdge,
                child: _showLoginForm
                    ? FadeTransition(
                        opacity: _formFade,
                        child: SlideTransition(
                          position: _formSlide,
                          child: Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Center(
                              child: ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: _fieldMaxWidth),
                                child: _buildLoginForm(),
                              ),
                            ),
                          ),
                        ),
                      )
                    : const SizedBox(width: double.infinity),
              ),
              if (_showLoginForm) ...[
                const SizedBox(height: 14),
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: _fieldMaxWidth),
                    child: _AuthPrimaryButton(
                      label: _busy ? 'Connexion…' : 'Se connecter',
                      enabled: !_busy,
                      onPressed: _primaryAction,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Center(
                child: Container(
                  width: _fieldMaxWidth,
                  height: 1,
                  color: AppColors.textDark.withValues(alpha: 0.16),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    'Pas encore de compte ?',
                    style: TextStyle(
                      color: AppColors.textDark.withValues(alpha: 0.75),
                      fontSize: 15,
                    ),
                  ),
                  TextButton(
                    onPressed: _busy ? null : _goRegister,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primaryDark,
                      textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    child: const Text('Créer un compte'),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'MangAfric © ${DateTime.now().year} — Conditions d’utilisation et Politique de confidentialité.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.35,
                  color: AppColors.textDark.withValues(alpha: 0.45),
                ),
              ),
            ],
          ),
        ),
        Positioned(
          top: 12,
          right: 12,
          child: _AuthCloseButton(onPressed: () => Navigator.of(context).pop()),
        ),
      ],
    );
  }

  Widget _buildLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _AuthField(
          label: 'Email',
          child: TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            style: _inputStyle,
            textInputAction: TextInputAction.next,
            decoration: _inputDecoration('Entrez votre email'),
          ),
        ),
        const SizedBox(height: 12),
        _AuthField(
          label: _forcePw ? 'Ancien mot de passe' : 'Mot de passe',
          child: _AuthPasswordField(
            controller: _password,
            hint: _forcePw ? 'Entrez votre ancien mot de passe' : 'Entrez votre mot de passe',
            showPassword: _showPassword,
            onToggle: () => setState(() => _showPassword = !_showPassword),
          ),
        ),
        if (_forcePw) ...[
          const SizedBox(height: 12),
          _AuthField(
            label: 'Nouveau mot de passe',
            child: _AuthPasswordField(
              controller: _newPassword,
              hint: 'Minimum 6 caractères',
              showPassword: _showPassword,
              onToggle: () => setState(() => _showPassword = !_showPassword),
            ),
          ),
        ],
        if (_error.isNotEmpty) ...[
          const SizedBox(height: 12),
          _AuthError(message: _error),
        ],
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: _busy ? null : _forgot,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              padding: const EdgeInsets.symmetric(horizontal: 0),
            ),
            child: const Text('Mot de passe oublié ?'),
          ),
        ),
        if (_forgotSent)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Si ce compte existe, un lien de réinitialisation a été envoyé à votre email.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.35),
            ),
          ),
      ],
    );
  }

  static const _inputStyle = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w500,
    color: AppColors.textDark,
  );

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: AppColors.bgWhite,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    );
  }
}

class _AuthBrand extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/images/magafrik-logo.png',
      height: 64,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => RichText(
        text: const TextSpan(
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.02),
          children: [
            TextSpan(text: 'Mang', style: TextStyle(color: AppColors.textDark)),
            TextSpan(text: 'Afrik', style: TextStyle(color: AppColors.primary)),
          ],
        ),
      ),
    );
  }
}

class _AuthCloseButton extends StatefulWidget {
  const _AuthCloseButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  State<_AuthCloseButton> createState() => _AuthCloseButtonState();
}

class _AuthCloseButtonState extends State<_AuthCloseButton> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: widget.onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: _hover ? AppColors.textDark.withValues(alpha: 0.06) : Colors.transparent,
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.close, size: 22, color: AppColors.textDark.withValues(alpha: 0.45)),
        ),
      ),
    );
  }
}

class _AuthField extends StatelessWidget {
  const _AuthField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark.withValues(alpha: 0.75),
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}

class _AuthPasswordField extends StatelessWidget {
  const _AuthPasswordField({
    required this.controller,
    required this.hint,
    required this.showPassword,
    required this.onToggle,
  });

  final TextEditingController controller;
  final String hint;
  final bool showPassword;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: !showPassword,
      style: _ReaderAuthSheetBodyState._inputStyle,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: AppColors.bgWhite,
        contentPadding: const EdgeInsets.fromLTRB(12, 11, 44, 11),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        suffixIcon: IconButton(
          onPressed: onToggle,
          icon: Icon(showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
          color: AppColors.textDark.withValues(alpha: 0.55),
        ),
      ),
    );
  }
}

class _AuthError extends StatelessWidget {
  const _AuthError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFEF4444).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.18)),
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Color(0xFF991B1B),
          fontWeight: FontWeight.w700,
          fontSize: 14,
        ),
      ),
    );
  }
}

class _AuthPrimaryButton extends StatefulWidget {
  const _AuthPrimaryButton({
    required this.label,
    required this.enabled,
    required this.onPressed,
    this.compact = false,
  });

  final String label;
  final bool enabled;
  final VoidCallback onPressed;
  final bool compact;

  @override
  State<_AuthPrimaryButton> createState() => _AuthPrimaryButtonState();
}

class _AuthPrimaryButtonState extends State<_AuthPrimaryButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.enabled;
    final height = widget.compact ? 42.0 : 48.0;
    final radius = widget.compact ? 10.0 : 12.0;

    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
      onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
      onTapCancel: () => setState(() => _pressed = false),
      onTap: enabled ? widget.onPressed : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        curve: Curves.ease,
        width: widget.compact ? null : double.infinity,
        height: height,
        padding: widget.compact ? const EdgeInsets.symmetric(horizontal: 18) : null,
        transform: Matrix4.translationValues(0, enabled && _pressed ? -1 : 0, 0),
        decoration: BoxDecoration(
          color: enabled
              ? (_pressed ? AppColors.primaryDark : AppColors.primary)
              : AppColors.primary.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(radius),
          boxShadow: widget.compact
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.14),
                    blurRadius: 28,
                    offset: const Offset(0, 10),
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          widget.label,
          style: TextStyle(
            color: Colors.white,
            fontWeight: widget.compact ? FontWeight.w700 : FontWeight.w800,
            fontSize: widget.compact ? 14 : 15,
          ),
        ),
      ),
    );
  }
}
