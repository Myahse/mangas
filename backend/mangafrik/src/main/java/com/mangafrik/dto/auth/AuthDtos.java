package com.mangafrik.dto.auth;

import com.fasterxml.jackson.databind.JsonNode;

public final class AuthDtos {
	private AuthDtos() {}

	public record RegisterRequest(
			String name,
			String email,
			String password,
			String role,
			JsonNode profile
	) {}

	public record RegisterResponse(
			long id,
			String email,
			String displayName,
			String role,
			JsonNode profile
	) {}

	public record LoginRequest(String email, String password) {}

	public record LoginResponse(
			long id,
			String email,
			String displayName,
			String role,
			boolean mustChangePassword,
			String token
	) {}

	public record ChangePasswordRequest(String email, String oldPassword, String newPassword) {}
}

