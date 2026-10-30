package com.mangafriq.dto.translation;

import java.time.Instant;

public final class NoteDtos {
	private NoteDtos() {}

	/** x, y, w, h are percentages of the page image. {@code status} is set for the author's own notes. */
	public record NoteDto(String id, int page, double x, double y, double w, double h, String title, String body,
		String authorName, String status) {}

	public record CreateNoteRequest(Integer page, Double x, Double y, Double w, Double h, String title, String body) {}

	public record PendingNoteDto(String id, String slug, String seriesTitle, int chapterNumber, int page,
		String title, String body, String authorName, Instant createdAt) {}
}
