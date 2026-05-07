package com.mangafriq.dto.admin;

public final class CreatorAccountDtos {
	private CreatorAccountDtos() {}

	public record CreateCreatorAccountRequest(String email, String displayName) {}

	public record CreateCreatorAccountResponse(
			long id,
			String email,
			String displayName,
			String role,
			boolean mustChangePassword
	) {}
}

