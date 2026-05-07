package com.mangafriq.dto;

import java.util.List;
import java.util.Map;

public record MangaDto(
		String id,
		String title,
		String slug,
		String author,
		String artist,
		String cover,
		String banner,
		String heroCover,
		List<String> genres,
		double rating,
		int totalChapters,
		LatestChapterDto latestChapter,
		String status,
		String views,
		String synopsis,
		boolean featured,
		int year,
		Map<String, Integer> localChapters
) {}

