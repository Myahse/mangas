import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MangAfriq } from '@/constants/theme';
import MangaCard from '@/src/components/MangaCard/MangaCard';
import { useFetch } from '@/src/hooks/useFetch';
import {
  fetchAllManga,
  fetchFeaturedManga,
  fetchGenres,
  fetchLatestUpdated,
  fetchPopularManga,
} from '@/src/services/api';
import { Manga } from '@/src/types/manga';

import { styles } from './HomeScreen.styles';

function heroPortraitUri(m: Manga): string {
  const h = m.heroCover;
  if (h && (h.startsWith('http://') || h.startsWith('https://'))) return h;
  return m.cover;
}

function statusHeroColors(status: string) {
  const s = status.toLowerCase();
  if (s === 'ongoing') return { bg: 'rgba(34, 197, 94, 0.35)', fg: '#bbf7d0' };
  if (s === 'completed') return { bg: 'rgba(59, 130, 246, 0.35)', fg: '#bfdbfe' };
  if (s === 'hiatus') return { bg: 'rgba(245, 158, 11, 0.35)', fg: '#fde68a' };
  return { bg: 'rgba(255,255,255,0.15)', fg: '#fff' };
}

function HeroSkeleton({ top }: { top: number }) {
  return (
    <View style={[styles.skeletonHero, { marginTop: top }]} />
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: featured, loading: loadingFeatured } = useFetch(fetchFeaturedManga, []);
  const { data: latest, loading: loadingLatest } = useFetch(() => fetchLatestUpdated(8), []);
  const { data: popular, loading: loadingPopular } = useFetch(() => fetchPopularManga(8), []);
  const { data: topManga, loading: loadingTop } = useFetch(() => fetchPopularManga(10), []);
  const { data: allManga, loading: loadingAll } = useFetch(fetchAllManga, []);
  const { data: genres } = useFetch(fetchGenres, []);

  const [heroIndex, setHeroIndex] = useState(0);

  const totalFeatured = featured?.length ?? 0;
  const current = featured?.[heroIndex];

  const goTo = useCallback(
    (index: number) => {
      if (!totalFeatured) return;
      const next = ((index % totalFeatured) + totalFeatured) % totalFeatured;
      setHeroIndex(next);
    },
    [totalFeatured]
  );

  const prev = useCallback(() => goTo(heroIndex - 1), [goTo, heroIndex]);
  const next = useCallback(() => goTo(heroIndex + 1), [goTo, heroIndex]);

  useEffect(() => {
    if (!totalFeatured) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % totalFeatured);
    }, 5000);
    return () => clearInterval(t);
  }, [totalFeatured]);

  useEffect(() => {
    if (totalFeatured && heroIndex >= totalFeatured) setHeroIndex(0);
  }, [totalFeatured, heroIndex]);

  const newSeries = useMemo(() => {
    if (!allManga) return [];
    return [...allManga].sort((a, b) => b.year - a.year).slice(0, 5);
  }, [allManga]);

  const rankStyle = (rank: number) => {
    if (rank === 1) return styles.rankTop1;
    if (rank === 2) return styles.rankTop2;
    if (rank === 3) return styles.rankTop3;
    return undefined;
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loadingFeatured || !featured?.length ? (
          <HeroSkeleton top={0} />
        ) : current ? (
          <View style={styles.hero}>
            <Image
              source={{ uri: current.banner }}
              style={styles.heroBg}
              contentFit="cover"
              transition={200}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.2)', 'transparent']}
              locations={[0, 0.45, 1]}
              style={styles.heroBg}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.88)']}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 280 }}
              pointerEvents="none"
            />
            <View style={[styles.heroInner, { paddingTop: 8 }]}>
              <View style={styles.heroBadges}>
                <View
                  style={[
                    styles.heroGenreTag,
                    { backgroundColor: statusHeroColors(current.status).bg },
                  ]}
                >
                  <Text style={{ color: statusHeroColors(current.status).fg, fontSize: 11, fontWeight: '700' }}>
                    {current.status}
                  </Text>
                </View>
                {current.genres.slice(0, 3).map((g) => (
                  <Text key={g} style={styles.heroGenreTag}>
                    {g}
                  </Text>
                ))}
              </View>

              <Text style={styles.heroTitle} numberOfLines={3}>
                {current.title}
              </Text>

              <View style={styles.heroMeta}>
                <Ionicons name="star" size={14} color={MangAfriq.rating} />
                <Text style={styles.heroMetaText}>{current.rating}</Text>
                <Text style={styles.heroMetaText}>·</Text>
                <Text style={styles.heroMetaText} numberOfLines={1}>
                  {current.author}
                </Text>
                <Text style={styles.heroMetaText}>·</Text>
                <Text style={styles.heroMetaText}>{current.totalChapters} ch.</Text>
                <Text style={styles.heroMetaText}>·</Text>
                <Text style={styles.heroMetaText}>{current.views} vues</Text>
              </View>

              <Text style={styles.heroSynopsis} numberOfLines={4}>
                {current.synopsis}
              </Text>

              <View style={styles.heroButtons}>
                <Link href={`/manga/${current.slug}`} asChild>
                  <Pressable style={({ pressed }) => [styles.heroBtnPrimary, pressed && { opacity: 0.92 }]}>
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.heroBtnText}>Lire maintenant</Text>
                  </Pressable>
                </Link>
                <Link href={`/manga/${current.slug}`} asChild>
                  <Pressable style={({ pressed }) => [styles.heroBtnSecondary, pressed && { opacity: 0.92 }]}>
                    <Ionicons name="book-outline" size={18} color="#fff" />
                    <Text style={styles.heroBtnText}>Voir les détails</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View style={[styles.heroCoverWrap, { bottom: insets.bottom + 100 }]}>
              <Image
                source={{ uri: heroPortraitUri(current) }}
                style={styles.heroCover}
                contentFit="cover"
                transition={200}
              />
            </View>

            <View style={[styles.heroControls, { bottom: insets.bottom + 52 }]}>
              <Pressable onPress={prev} style={styles.heroArrow} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
              <View style={styles.heroDots}>
                {featured.map((_, i) => (
                  <Pressable key={i} onPress={() => goTo(i)} hitSlop={6}>
                    <View style={[styles.heroDot, i === heroIndex && styles.heroDotActive]} />
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={next} style={styles.heroArrow} hitSlop={8}>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.genresSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Genres</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genresScroll}
          >
            {(genres ?? []).map((g) => (
              <Pressable
                key={g}
                onPress={() =>
                  router.push(`/(tabs)/explore?genre=${encodeURIComponent(g)}` as const)
                }
                style={({ pressed }) => [styles.genreChip, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.genreChipText}>{g}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Mises à jour</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>
          {loadingLatest || !latest ? (
            <Text style={{ color: MangAfriq.textMuted, fontSize: 14 }}>Chargement…</Text>
          ) : (
            <View style={styles.gridRow}>
              {latest.map((m) => (
                <View key={m.id} style={styles.gridCell}>
                  <MangaCard manga={m} />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Les plus populaires</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>
          {loadingPopular || !popular ? (
            <Text style={{ color: MangAfriq.textMuted, fontSize: 14 }}>Chargement…</Text>
          ) : (
            <View style={styles.gridRow}>
              {popular.map((m) => (
                <View key={m.id} style={styles.gridCell}>
                  <MangaCard manga={m} />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sidebarBlock}>
            <View style={styles.sidebarHeader}>
              <Ionicons name="trending-up" size={18} color={MangAfriq.primary} />
              <Text style={styles.sidebarTitle}>Top Manga</Text>
            </View>
            {loadingTop || !topManga ? (
              <Text style={{ color: MangAfriq.textMuted, fontSize: 14 }}>Chargement…</Text>
            ) : (
              topManga.map((m, i) => {
                const rank = i + 1;
                return (
                  <Link key={m.id} href={`/manga/${m.slug}`} asChild>
                    <Pressable style={({ pressed }) => [styles.rankedRow, pressed && { opacity: 0.92 }]}>
                      <Text style={[styles.rankBadge, rankStyle(rank)]}>{rank}</Text>
                      <Image source={{ uri: m.cover }} style={styles.rankedCover} contentFit="cover" />
                      <View style={styles.rankedInfo}>
                        <Text style={styles.rankedTitle} numberOfLines={2}>
                          {m.title}
                        </Text>
                        <Text style={styles.rankedMeta} numberOfLines={1}>
                          {m.author}
                        </Text>
                        <View style={styles.rankedStats}>
                          <Ionicons name="star" size={12} color={MangAfriq.rating} />
                          <Text style={styles.rankedMeta}>{m.rating}</Text>
                          <Text style={styles.rankedMeta}> · {m.views}</Text>
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                );
              })
            )}
          </View>

          <View style={styles.sidebarBlock}>
            <View style={styles.sidebarHeader}>
              <Ionicons name="sparkles" size={18} color={MangAfriq.primary} />
              <Text style={styles.sidebarTitle}>Nouvelles séries</Text>
            </View>
            {loadingAll ? (
              <Text style={{ color: MangAfriq.textMuted, fontSize: 14 }}>Chargement…</Text>
            ) : (
              newSeries.map((m) => (
                <Link key={m.id} href={`/manga/${m.slug}`} asChild>
                  <Pressable style={({ pressed }) => [styles.newRow, pressed && { opacity: 0.92 }]}>
                    <Image source={{ uri: m.cover }} style={styles.newCover} contentFit="cover" />
                    <View style={styles.newInfo}>
                      <Text style={styles.newTitle} numberOfLines={2}>
                        {m.title}
                      </Text>
                      <View style={styles.newGenres}>
                        {m.genres.slice(0, 2).map((g) => (
                          <Text key={g} style={styles.newGenrePill}>
                            {g}
                          </Text>
                        ))}
                      </View>
                      <Text style={styles.newChapters}>{m.totalChapters} ch.</Text>
                    </View>
                  </Pressable>
                </Link>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
