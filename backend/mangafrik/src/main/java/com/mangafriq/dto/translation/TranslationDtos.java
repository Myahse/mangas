package com.mangafriq.dto.translation;

import java.time.Instant;
import java.util.List;

public final class TranslationDtos {
	private TranslationDtos() {}

	public record LanguageDto(String code, String name) {}

	/** A language readers can switch to on a chapter, with how many bubbles are translated. */
	public record ChapterLanguageDto(String code, String name, int translated, int bubbles) {}

	/** x, y, w, h are percentages of the page image. {@code text} is null when not translated. */
	public record BubbleDto(String id, int page, double x, double y, double w, double h, String originalText, String text) {}

	public record ChapterBubblesDto(String lang, List<BubbleDto> bubbles) {}

	public record CreateBubbleRequest(Integer page, Double x, Double y, Double w, Double h, String originalText) {}

	public record SubmitTranslationRequest(String lang, String text) {}

	/** For the translation tool: the bubble plus my own submission in that language, if any. */
	public record TranslatorBubbleDto(
		String id, int page, double x, double y, double w, double h, String originalText,
		String approvedText, String myText, String myStatus
	) {}

	public record PendingTranslationDto(
		String id, String bubbleId, String slug, String seriesTitle, int chapterNumber, int page,
		String lang, String langName, String originalText, String text, String currentApprovedText,
		String translatorName, Instant createdAt
	) {}

	public record ReviewResultDto(String id, String status, int rewardCoins) {}
}
