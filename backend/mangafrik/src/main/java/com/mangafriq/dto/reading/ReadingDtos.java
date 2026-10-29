package com.mangafriq.dto.reading;

import java.time.Instant;

public final class ReadingDtos {
	private ReadingDtos() {}

	/** {@code page} is 0-based; {@code pageCount} is the chapter's number of pages. */
	public record SaveProgressRequest(Integer chapterNumber, Integer page, Integer pageCount) {}

	public record ReadingProgressDto(
		String slug,
		String title,
		String cover,
		int chapterNumber,
		int page,
		int pageCount,
		int latestChapter,
		/** Where "Reprendre" should open: the same chapter, or the next one once this one is finished. */
		int resumeChapter,
		int resumePage,
		/** Finished the latest chapter: nothing new to read yet. */
		boolean caughtUp,
		Instant updatedAt
	) {}
}
