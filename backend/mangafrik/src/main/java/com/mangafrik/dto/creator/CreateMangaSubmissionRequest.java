package com.mangafrik.dto.creator;

import java.util.Map;

public record CreateMangaSubmissionRequest(
		String creatorEmail,
		String creatorDisplayName,
		Map<String, Object> payload
) {}

