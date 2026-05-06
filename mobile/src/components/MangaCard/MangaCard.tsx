import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { MangAfriq } from '@/constants/theme';
import { Manga } from '@/src/types/manga';

import { styles } from './MangaCard.styles';

function statusColors(status: string) {
  const s = status.toLowerCase();
  if (s === 'ongoing') return { bg: MangAfriq.ongoingBg, fg: MangAfriq.ongoingText };
  if (s === 'completed') return { bg: MangAfriq.completedBg, fg: MangAfriq.completedText };
  if (s === 'hiatus') return { bg: MangAfriq.hiatusBg, fg: MangAfriq.hiatusText };
  return { bg: MangAfriq.bgLight, fg: MangAfriq.textSecondary };
}

type Props = {
  manga: Manga;
};

export default function MangaCard({ manga }: Props) {
  const { bg, fg } = statusColors(manga.status);
  const genres = manga.genres.slice(0, 2);

  return (
    <Link href={`/manga/${manga.slug}`} asChild>
      <Pressable style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.92 }]}>
        <View style={styles.thumbWrap}>
          <Image source={{ uri: manga.cover }} style={styles.thumb} contentFit="cover" transition={200} />
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color={MangAfriq.rating} />
            <Text style={styles.ratingText}>{manga.rating}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: bg }]}>
            <Text style={[styles.statusText, { color: fg }]}>{manga.status}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {manga.title}
          </Text>
          <View style={styles.genresRow}>
            {genres.map((g) => (
              <Text key={g} style={styles.genrePill} numberOfLines={1}>
                {g}
              </Text>
            ))}
          </View>
          <View style={styles.latestRow}>
            <Ionicons name="time-outline" size={12} color={MangAfriq.textMuted} />
            <Text style={styles.latestText} numberOfLines={1}>
              Ch. {manga.latestChapter.number} · {manga.latestChapter.date}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
