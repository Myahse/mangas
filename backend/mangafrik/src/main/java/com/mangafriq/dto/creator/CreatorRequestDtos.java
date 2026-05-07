package com.mangafriq.dto.creator;

public final class CreatorRequestDtos {
	private CreatorRequestDtos() {}

	public record SubmitCreatorRequest(
		String email,
		String creatorEmail,
		String displayName,
		String penName,
		String genres,
		String message
	) {}
}

