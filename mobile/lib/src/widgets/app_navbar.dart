import 'package:flutter/foundation.dart';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../notifications/notification_controller.dart';
import '../theme.dart';
import '../config/api_endpoint_sheet.dart';
import '../widgets/reader_auth_sheet.dart';

/// Compact top bar: logo, search, notifications, account.
class AppNavbar extends StatelessWidget implements PreferredSizeWidget {
  const AppNavbar({
    super.key,
    required this.onSearch,
    required this.onHome,
  });

  final VoidCallback onSearch;
  final VoidCallback onHome;

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: authController,
      builder: (context, _) {
        final authed = authController.isAuthenticated;

        return ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.navBg.withValues(alpha: 0.92),
                border: const Border(bottom: BorderSide(color: AppColors.navBorder)),
                boxShadow: AppShadows.nav,
              ),
              child: SafeArea(
                bottom: false,
                child: SizedBox(
                  height: 56,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Row(
                      children: [
                        InkWell(
                          onTap: onHome,
                          onLongPress: kDebugMode
                              ? () async {
                                  await showApiEndpointEditor(context);
                                }
                              : null,
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                            child: Image.asset(
                              'assets/images/magafrik-logo.png',
                              height: 40,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => _textLogo(),
                            ),
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          tooltip: 'Rechercher',
                          icon: const Icon(Icons.search, size: 22),
                          onPressed: onSearch,
                        ),
                        if (authed)
                          ListenableBuilder(
                            listenable: notificationController,
                            builder: (context, _) {
                              final unread = notificationController.unreadCount;
                              return IconButton(
                                tooltip: 'Notifications',
                                onPressed: () => context.push('/notifications'),
                                icon: Badge(
                                  isLabelVisible: unread > 0,
                                  label: Text(unread > 99 ? '99+' : '$unread'),
                                  child: const Icon(Icons.notifications_outlined, size: 22),
                                ),
                              );
                            },
                          ),
                        if (!authed)
                          TextButton(
                            onPressed: () => showReaderAuthDialog(context),
                            child: const Text('Connexion'),
                          )
                        else
                          PopupMenuButton<String>(
                            tooltip: 'Menu compte',
                            offset: const Offset(0, 44),
                            icon: const Icon(Icons.more_vert, size: 22),
                            onSelected: (value) {
                              switch (value) {
                                case 'logout':
                                  authController.logout();
                                case 'profil':
                                  context.push('/compte/profil');
                                case 'abos':
                                  context.push('/compte/abonnements');
                                case 'fav':
                                  context.push('/compte/favoris');
                              }
                            },
                            itemBuilder: (context) => const [
                              PopupMenuItem(value: 'profil', child: Text('Mon profil')),
                              PopupMenuItem(value: 'abos', child: Text('Mes abonnements')),
                              PopupMenuItem(value: 'fav', child: Text('Favoris')),
                              PopupMenuDivider(),
                              PopupMenuItem(value: 'logout', child: Text('Déconnexion')),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _textLogo() {
    return RichText(
      text: const TextSpan(
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        children: [
          TextSpan(text: 'Mang', style: TextStyle(color: AppColors.textDark)),
          TextSpan(text: 'Afrik', style: TextStyle(color: AppColors.primary)),
        ],
      ),
    );
  }
}
