import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'auth/auth_controller.dart';
import 'screens/account_stub_screen.dart';
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
        ],
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/compte',
        builder: (context, state) => const AccountStubScreen(title: 'Mon espace'),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/compte/profil',
        builder: (context, state) => const AccountStubScreen(title: 'Mon profil'),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/store',
        builder: (context, state) => const AccountStubScreen(
          title: 'Boutique (coins)',
          subtitle: 'Achetez des coins et gérez votre solde sur le site MangAfric avec le même compte.',
        ),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/compte/abonnements',
        builder: (context, state) => const AccountStubScreen(title: 'Mes abonnements'),
      ),
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: '/compte/favoris',
        builder: (context, state) => const AccountStubScreen(title: 'Favoris'),
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
  );
}
