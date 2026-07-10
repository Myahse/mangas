import '../api/api_client.dart';
import '../auth/auth_controller.dart';

bool isAuthError(Object error) {
  if (error is BackendException) {
    final code = error.statusCode;
    return code == 401 || code == 403;
  }
  final msg = error.toString().toLowerCase();
  return msg.contains('unauthorized') || msg.contains('non autorisé');
}

/// Clears stale session after a 401/403 from a protected endpoint.
Future<void> handleApiAuthError(Object error) async {
  if (!isAuthError(error)) return;
  await authController.logout();
}

String friendlyApiError(Object error, {bool authRequired = false}) {
  if (isAuthError(error)) {
    return authRequired
        ? 'Votre session a expiré. Reconnectez-vous pour continuer.'
        : 'Connexion requise pour accéder à cette page.';
  }
  return error.toString().replaceFirst('Exception: ', '');
}
