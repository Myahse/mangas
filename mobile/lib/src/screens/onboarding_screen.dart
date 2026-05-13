import 'package:flutter/material.dart';

import '../startup.dart';
import '../theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _slides = [
    _Slide(
      icon: Icons.auto_stories_rounded,
      title: 'Bienvenue sur MangAfric',
      body: 'Découvrez des mangas et webtoons africains et francophones, mis à jour régulièrement.',
    ),
    _Slide(
      icon: Icons.phone_android_rounded,
      title: 'Lisez partout',
      body: 'Lecture plein écran, défilement vertical et navigation simple entre chapitres.',
    ),
    _Slide(
      icon: Icons.explore_rounded,
      title: 'Explorez',
      body: 'Parcourez par genre et repérez les tendances comme sur le site.',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final last = _page == _slides.length - 1;
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, i) {
                  final s = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 32),
                        Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                          ),
                          child: Icon(s.icon, size: 40, color: AppColors.primary),
                        ),
                        const SizedBox(height: 28),
                        Text(
                          s.title,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          s.body,
                          style: const TextStyle(fontSize: 16, height: 1.45, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (i) {
                      final active = i == _page;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 6,
                        width: active ? 22 : 6,
                        decoration: BoxDecoration(
                          color: active ? AppColors.primary : AppColors.border,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 20),
                  if (last)
                    FilledButton(
                      onPressed: () => appStartup.setOnboardingDone(),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        minimumSize: const Size(double.infinity, 52),
                      ),
                      child: const Text('Commencer', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    )
                  else
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => appStartup.setOnboardingDone(),
                            child: const Text('Passer'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: () => _controller.nextPage(
                              duration: const Duration(milliseconds: 280),
                              curve: Curves.easeOut,
                            ),
                            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                            child: const Text('Suivant'),
                          ),
                        ),
                      ],
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

class _Slide {
  const _Slide({required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;
}
