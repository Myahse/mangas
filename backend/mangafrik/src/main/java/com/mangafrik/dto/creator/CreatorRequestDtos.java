package com.mangafrik.dto.creator;

public final class CreatorRequestDtos {
	private CreatorRequestDtos() {}

	public record SubmitCreatorRequest(
		String email,
		String displayName,
		String penName,
		String genres,
		String message
	) {}
}

