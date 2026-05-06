import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useLayoutEffect } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { MangAfriq } from '@/constants/theme';
import { useFetch } from '@/src/hooks/useFetch';
import { fetchMangaBySlug } from '@/src/services/api';

export default function MangaDetailScreen() {
  const params = useLocalSearchParams<{ slug: string | string[] }>();
  const slugRaw = params.slug;
  const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;
  const navigation = useNavigation();
  const { data: manga, loading, error } = useFetch(
    () => fetchMangaBySlug(String(slug)),
    [slug]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: manga?.title ?? 'Manga',
      headerTintColor: MangAfriq.primary,
      headerStyle: { backgroundColor: MangAfriq.bgWhite },
      headerShadowVisible: true,
    });
  }, [navigation, manga?.title]);

  if (!slug) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: MangAfriq.bgLight }}>
        <Text style={{ color: MangAfriq.textMuted }}>Manga introuvable</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: MangAfriq.bgLight,
        }}
      >
        <ActivityIndicator size="large" color={MangAfriq.primary} />
      </View>
    );
  }

  if (error || !manga) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: MangAfriq.bgLight,
        }}
      >
        <Text style={{ color: MangAfriq.textDark, textAlign: 'center' }}>{error ?? 'Manga introuvable'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: MangAfriq.bgLight }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Image
        source={{ uri: manga.banner }}
        style={{ width: '100%', height: 180 }}
        contentFit="cover"
      />
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row' }}>
          <Image
            source={{ uri: manga.cover }}
            style={{
              width: 110,
              height: 165,
              borderRadius: 10,
              backgroundColor: '#e0e0e0',
              marginRight: 16,
            }}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: MangAfriq.textDark, marginBottom: 6 }}>
              {manga.title}
            </Text>
            <Text style={{ fontSize: 14, color: MangAfriq.textSecondary, marginBottom: 8 }}>
              {manga.author}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Ionicons name="star" size={16} color={MangAfriq.rating} style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: '700', color: MangAfriq.rating, marginRight: 6 }}>
                {manga.rating}
              </Text>
              <Text style={{ color: MangAfriq.textMuted }}>· {manga.status}</Text>
            </View>
          </View>
        </View>
        <Text style={{ marginTop: 20, fontSize: 15, lineHeight: 22, color: MangAfriq.textDark }}>
          {manga.synopsis}
        </Text>
      </View>
    </ScrollView>
  );
}
