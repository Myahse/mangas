import { StyleSheet } from 'react-native';

import { MangAfriq } from '@/constants/theme';

export const styles = StyleSheet.create({
  pressable: {
    borderRadius: 10,
    backgroundColor: MangAfriq.bgWhite,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  thumbWrap: {
    aspectRatio: 2 / 3,
    backgroundColor: '#e0e0e0',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: MangAfriq.rating,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  info: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: MangAfriq.textDark,
    lineHeight: 18,
    marginBottom: 6,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 7,
  },
  genrePill: {
    fontSize: 11,
    fontWeight: '600',
    color: MangAfriq.primary,
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  latestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  latestText: {
    fontSize: 12,
    color: MangAfriq.textMuted,
    fontWeight: '500',
    flex: 1,
  },
});
