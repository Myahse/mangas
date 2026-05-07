package com.mangafriq.dto.auth;

public final class PasswordResetDtos {
	private PasswordResetDtos() {}

	public record ForgotPasswordRequest(String email) {}

	public record ForgotPasswordResponse(String message) {}

	public record ResetPasswordRequest(String token, String newPassword) {}

	public record ResetPasswordResponse(String message) {}
}

