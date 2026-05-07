package com.mangafriq.dto.creator;

import java.time.Instant;
import java.util.Map;

public record MangaSubmissionDto(
		String id,
		String status,
		Instant createdAt,
		CreatorDto creator,
		Map<String, Object> payload,
		ModerationDto moderation
) {
	public record CreatorDto(String email, String displayName) {}
	public record ModerationDto(String decision, String reason, Instant reviewedAt) {}
}

