import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/models.dart';
import '../theme.dart';

/// Matches front/src/components/common/MangaCard.jsx (default variant).
class MangaCard extends StatelessWidget {
  const MangaCard({super.key, required this.manga, this.variant = MangaCardVariant.grid});

  final Manga manga;
  final MangaCardVariant variant;

  @override
  Widget build(BuildContext context) {
    if (variant == MangaCardVariant.list) {
      return _ListCard(manga: manga);
    }
    return _GridCard(manga: manga);
  }
}

enum MangaCardVariant { grid, list }

class _GridCard extends StatelessWidget {
  const _GridCard({required this.manga});

  final Manga manga;

  @override
  Widget build(BuildContext context) {
    final latest = manga.latestChapter;
    final statusKey = manga.status.toLowerCase();

    return Material(
      color: AppColors.bgWhite,
      elevation: 0,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(AppRadii.md),
      child: InkWell(
        onTap: () => context.push('/manga/${manga.slug}'),
        borderRadius: BorderRadius.circular(AppRadii.md),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.md),
            boxShadow: AppShadows.card,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadii.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 2 / 3,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: manga.cover,
                        fit: BoxFit.cover,
                        placeholder: (_, url) => const ColoredBox(color: AppColors.border),
                        errorWidget: (_, url, err) => const ColoredBox(color: AppColors.border),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star, size: 11, color: AppColors.primary),
                                const SizedBox(width: 3),
                                Text(
                                  '${manga.rating}',
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: statusBadgeBg(statusKey),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            manga.status,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: statusBadgeFg(statusKey),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        manga.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: AppColors.textDark,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: manga.genres.take(2).map((g) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primaryDark.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: Text(
                              g,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 7),
                      Row(
                        children: [
                          const Icon(Icons.schedule, size: 11, color: AppColors.textMuted),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              latest.number > 0
                                  ? 'Ch. ${latest.number} · ${latest.date}'
                                  : 'Aucun chapitre',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                                fontWeight: FontWeight.w500,
                              ),
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
        ),
      ),
    );
  }
}

class _ListCard extends StatelessWidget {
  const _ListCard({required this.manga});

  final Manga manga;

  @override
  Widget build(BuildContext context) {
    final latest = manga.latestChapter;
    return Material(
      color: AppColors.bgWhite,
      borderRadius: BorderRadius.circular(AppRadii.sm),
      child: InkWell(
        onTap: () => context.push('/manga/${manga.slug}'),
        borderRadius: BorderRadius.circular(AppRadii.sm),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.sm),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(5),
                child: CachedNetworkImage(
                  imageUrl: manga.cover,
                  width: 42,
                  height: 58,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      manga.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      latest.number > 0 ? 'Ch. ${latest.number} · ${latest.date}' : 'Aucun chapitre',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star, size: 11, color: AppColors.rating),
                  const SizedBox(width: 2),
                  Text('${manga.rating}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
