package com.mangafriq.dto.translation;

import java.time.Instant;

public final class NarrationDtos {
	private NarrationDtos() {}

	/** One step of griot mode, in reading order. {@code audioUrl} is null when no voice is recorded yet. */
	public record NarrationStepDto(String bubbleId, int page, double x, double y, double w, double h,
		String text, String audioUrl, int durationMs) {}

	public record NarrationDto(String lang, java.util.List<NarrationStepDto> steps) {}

	public record PendingAudioDto(String id, String bubbleId, String slug, String seriesTitle, int chapterNumber, int page,
		String lang, String langName, String text, String audioUrl, int durationMs, String narratorName, Instant createdAt) {}
}
