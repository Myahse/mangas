import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MangAfriq } from '@/constants/theme';
import MangaCard from '@/src/components/MangaCard/MangaCard';
import { useFetch } from '@/src/hooks/useFetch';
import { fetchAllManga, fetchGenres } from '@/src/services/api';
import { Manga } from '@/src/types/manga';

import { styles } from './ExploreScreen.styles';

const SORT_OPTIONS = [
  { label: 'Popularité', value: 'popular' as const },
  { label: 'Note', value: 'rating' as const },
  { label: 'Dernières MAJ', value: 'latest' as const },
  { label: 'Plus récents', value: 'new' as const },
  { label: 'A → Z', value: 'az' as const },
];

const STATUS_OPTIONS = ['Tous', 'Ongoing', 'Completed', 'Hiatus'] as const;

function SkeletonGrid() {
  return (
    <View style={{ marginTop: 8 }}>
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={[styles.gridRow, { flexDirection: 'row' }]}>
          <View style={[styles.skeletonCard, { marginRight: 6, flex: 1 }]}>
            <View style={styles.skeletonThumb} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLineShort} />
          </View>
          <View style={[styles.skeletonCard, { marginLeft: 6, flex: 1 }]}>
            <View style={styles.skeletonThumb} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { genre: genreFromQuery } = useLocalSearchParams<{ genre?: string | string[] }>();
  const { data: allManga, loading } = useFetch(fetchAllManga, []);
  const { data: genres } = useFetch(fetchGenres, []);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('popular');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('Tous');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const raw = Array.isArray(genreFromQuery) ? genreFromQuery[0] : genreFromQuery;
    if (!raw) return;
    const g = decodeURIComponent(raw);
    setSelectedGenres([g]);
  }, [genreFromQuery]);

  const toggleGenre = (g: string) =>
    setSelectedGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const filtered = useMemo(() => {
    if (!allManga) return [];
    let list = [...allManga];

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q) ||
          m.genres.some((g) => g.toLowerCase().includes(q))
      );
    }
    if (status !== 'Tous') list = list.filter((m) => m.status === status);
    if (selectedGenres.length > 0)
      list = list.filter((m) => selectedGenres.every((g) => m.genres.includes(g)));

    switch (sort) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'latest':
        list.sort((a, b) => b.latestChapter.number - a.latestChapter.number);
        break;
      case 'new':
        list.sort((a, b) => b.year - a.year);
        break;
      case 'az':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        list.sort((a, b) => b.rating - a.rating);
        break;
    }
    return list;
  }, [allManga, query, sort, status, selectedGenres]);

  const resetFilters = () => {
    setQuery('');
    setSelectedGenres([]);
    setStatus('Tous');
  };

  const renderItem = useCallback(
    ({ item }: { item: Manga }) => (
      <View style={{ flex: 1, paddingHorizontal: 6 }}>
        <MangaCard manga={item} />
      </View>
    ),
    []
  );

  const ListHeader = (
    <View style={styles.headerPad}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>Explorer les Mangas</Text>
          <Text style={styles.subtitle}>
            {loading
              ? 'Chargement…'
              : `${filtered.length} manga${filtered.length !== 1 ? 's' : ''} trouvé${
                  filtered.length !== 1 ? 's' : ''
                }`}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowFilters((s) => !s)}
          style={({ pressed }) => [
            styles.filterToggle,
            showFilters && styles.filterToggleActive,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={showFilters ? MangAfriq.primary : MangAfriq.textSecondary}
          />
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
            Filtres
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={MangAfriq.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un manga, un auteur…"
          placeholderTextColor={MangAfriq.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} style={styles.searchClear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={MangAfriq.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScroll}
        contentContainerStyle={styles.sortScrollContent}
      >
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setSort(opt.value)}
            style={[styles.sortBtn, sort === opt.value && styles.sortBtnActive]}
          >
            <Text style={[styles.sortBtnText, sort === opt.value && styles.sortBtnTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {showFilters && (
        <View style={[styles.filtersPanel, { marginTop: 16 }]}>
          <Text style={styles.filterLabel}>Statut</Text>
          <View style={styles.chipWrap}>
            {STATUS_OPTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.chip, status === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 18 }} />

          <View style={styles.filterLabelRow}>
            <Text style={[styles.filterLabel, { marginBottom: 0 }]}>Genres</Text>
            {selectedGenres.length > 0 && (
              <Pressable onPress={() => setSelectedGenres([])}>
                <Text style={styles.clearGenres}>Effacer</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.chipWrap}>
            {(genres ?? []).map((g) => (
              <Pressable
                key={g}
                onPress={() => toggleGenre(g)}
                style={[styles.chip, selectedGenres.includes(g) && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, selectedGenres.includes(g) && styles.chipTextActive]}
                >
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {selectedGenres.length > 0 && (
        <View style={[styles.activeFilters, { marginTop: 14 }]}>
          {selectedGenres.map((g) => (
            <Pressable key={g} onPress={() => toggleGenre(g)} style={styles.activeChip}>
              <Text style={styles.activeChipText}>{g}</Text>
              <Ionicons name="close" size={14} color={MangAfriq.primary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const ListEmpty = (
    <View style={styles.empty}>
      <Ionicons name="book-outline" size={56} color={MangAfriq.textMuted} />
      <Text style={styles.emptyTitle}>Aucun manga trouvé</Text>
      <Text style={styles.emptySub}>Essayez d’autres mots-clés ou filtres</Text>
      <Pressable onPress={resetFilters} style={styles.emptyBtn}>
        <Text style={styles.emptyBtnText}>Réinitialiser les filtres</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false}>
          {ListHeader}
          <SkeletonGrid />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <FlatList
        data={filtered}
        keyExtractor={(m) => String(m.id)}
        numColumns={2}
        renderItem={renderItem}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[styles.listPad, { paddingTop: 8, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
