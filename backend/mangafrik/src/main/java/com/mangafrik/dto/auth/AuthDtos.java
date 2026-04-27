package com.mangafrik.dto.auth;

public final class AuthDtos {
	private AuthDtos() {}

	public record RegisterRequest(
			String name,
			String email,
			String password,
			String role,
			Object profile
	) {}

	public record RegisterResponse(
			long id,
			String email,
			String displayName,
			String role,
			Object profile
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

