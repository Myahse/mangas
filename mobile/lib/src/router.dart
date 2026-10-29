import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'auth/auth_controller.dart';
import 'screens/account_section_screen.dart';
import 'screens/become_creator_screen.dart';
import 'screens/contact_screen.dart';
import 'screens/downloads_screen.dart';
import 'screens/not_found_screen.dart';
import 'screens/offline_reader_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/reset_password_screen.dart';
import 'screens/store_screen.dart';
import 'screens/explore_screen.dart';
import 'screens/home_screen.dart';
import 'screens/manga_detail_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/reader_screen.dart';
import 'screens/register_screen.dart';
import 'screens/shell_screen.dart';
import 'screens/splash_screen.dart';
import 'startup.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter(StartupController startup) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: Listenable.merge([startup, authController]),
    redirect: (context, state) {
      if (!startup.ready) {
        return state.matchedLocation == '/splash' ? null : '/splash';
      }
      if (!startup.onboardingDone) {
        if (state.matchedLocation == '/onboarding') return null;
        return '/onboarding';
      }
      if (state.matchedLocation == '/splash' || state.matchedLocation == '/onboarding') {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ReaderShellScreen(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/explore',
                builder: (context, state) => const ExploreScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/compte',
                builder: (context, state) => const AccountSectionScreen(title: 'Mon espace', embedded: true),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/store',
                builder: (context, state) => const StoreScreen(embedded: true),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/contact',
                builder: (context, state) => const ContactScreen(embedded: true),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/telechargements',
        builder: (context, state) => const DownloadsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/telechargements/recevoir',
        builder: (context, state) => const ShareReceiveScreen(),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/telechargements/:id',
        builder: (context, state) => OfflineReaderScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/telechargements/:id/envoyer',
        builder: (context, state) => ShareSendScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/register',
        pageBuilder: (context, state) => CustomTransitionPage<void>(
          key: state.pageKey,
          child: const RegisterScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
            return FadeTransition(
              opacity: curved,
              child: SlideTransition(
                position: Tween<Offset>(begin: const Offset(0, 0.03), end: Offset.zero).animate(curved),
                child: child,
              ),
            );
          },
        ),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/compte/profil',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/compte/abonnements',
        builder: (context, state) => const AccountSectionScreen(title: 'Mes abonnements'),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/compte/favoris',
        builder: (context, state) => const AccountSectionScreen(title: 'Mes favoris'),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/compte/devenir-createur',
        builder: (context, state) => const BecomeCreatorScreen(),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/reset-password',
        builder: (context, state) {
          final token = state.uri.queryParameters['token'];
          return ResetPasswordScreen(token: token);
        },
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/manga/:slug',
        builder: (context, state) {
          final slug = state.pathParameters['slug']!;
          return MangaDetailScreen(slug: slug);
        },
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/manga/:slug/chapter/:chapter',
        builder: (context, state) {
          final slug = state.pathParameters['slug']!;
          final ch = int.tryParse(state.pathParameters['chapter'] ?? '') ?? 1;
          return ReaderScreen(slug: slug, chapter: ch);
        },
      ),
    ],
    errorBuilder: (context, state) => const NotFoundScreen(),
  );
}
