import '../api/api_client.dart';

class MustChangePasswordException implements Exception {
  MustChangePasswordException({required this.email, required this.currentPassword});
  final String email;
  final String currentPassword;
}

String mapAuthErrorMessage(Object err) {
  if (err is BackendException) return err.message;
  final raw = err is Exception ? err.toString() : '$err';
  final msg = raw.toLowerCase();

  if (err is MustChangePasswordException) {
    return 'Vous devez changer votre mot de passe avant de continuer.';
  }
  if (msg.contains('account not found')) {
    return "Compte introuvable. Vous pouvez créer un compte avec cet email.";
  }
  if (msg.contains('invalid credentials') || msg.contains('email is invalid')) {
    return "Email ou mot de passe incorrect.";
  }
  if (msg.contains('email is required') || msg.contains('password is required') || msg.contains('payload is required')) {
    return 'Merci de remplir email et mot de passe.';
  }
  if (msg.contains('account is disabled')) {
    return 'Ce compte est désactivé.';
  }
  if (msg.contains('account has no password')) {
    return 'Ce compte ne permet pas la connexion par mot de passe.';
  }
  if (msg.contains('email already exists')) {
    return 'This email is already in use';
  }
  if (raw.startsWith('exception: ')) return raw.substring('exception: '.length);
  return raw.isEmpty ? 'Connexion impossible.' : raw;
}
