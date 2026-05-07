package com.mangafriq.dto.creator;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class EpisodeDtos {
	private EpisodeDtos() {}

	public record EpisodeDraftDto(
			String id,
			Instant createdAt,
			String seriesTitle,
			String episodeTitle,
			String creatorNote,
			boolean commentsEnabled,
			String publishMode,
			String publishAt,
			Map<String, Object> thumb,
			List<Map<String, Object>> images
	) {}

	public record PublishedEpisodeDto(
			String id,
			Instant publishedAt,
			String scheduledFor,
			String seriesTitle,
			String episodeTitle,
			String creatorNote,
			boolean commentsEnabled,
			Map<String, Object> thumb,
			List<Map<String, Object>> images,
			Map<String, Object> stats,
			List<Map<String, Object>> comments
	) {}

	public record CreateDraftRequest(
			String seriesTitle,
			String episodeTitle,
			String creatorNote,
			Boolean commentsEnabled,
			String publishMode,
			String publishAt,
			Map<String, Object> thumb,
			List<Map<String, Object>> images
	) {}

	public record CreatePublishedRequest(
			String scheduledFor,
			String seriesTitle,
			String episodeTitle,
			String creatorNote,
			Boolean commentsEnabled,
			Map<String, Object> thumb,
			List<Map<String, Object>> images
	) {}

	public record AddCommentRequest(String author, String text) {}
}

