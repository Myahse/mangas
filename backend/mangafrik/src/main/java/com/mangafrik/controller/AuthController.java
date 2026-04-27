package com.mangafrik.controller;

import com.mangafrik.constants.AppConstants;
import com.mangafrik.dto.auth.AuthDtos.ChangePasswordRequest;
import com.mangafrik.dto.auth.AuthDtos.LoginRequest;
import com.mangafrik.dto.auth.AuthDtos.LoginResponse;
import com.mangafrik.dto.auth.AuthDtos.RegisterRequest;
import com.mangafrik.dto.auth.AuthDtos.RegisterResponse;
import com.mangafrik.dto.auth.PasswordResetDtos.ForgotPasswordRequest;
import com.mangafrik.dto.auth.PasswordResetDtos.ResetPasswordRequest;
import com.mangafrik.services.auth.AuthService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/auth")
public class AuthController {
	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	@PostMapping("/register")
	public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
		try {
			RegisterResponse res = authService.register(req);
			return ResponseEntity.ok(res);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody LoginRequest req) {
		try {
			LoginResponse res = authService.login(req);
			return ResponseEntity.ok(res);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/change-password")
	public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req) {
		try {
			return ResponseEntity.ok(authService.changePassword(req));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/forgot-password")
	public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest req) {
		try {
			String email = req == null ? null : req.email();
			return ResponseEntity.ok(authService.forgotPassword(email));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/reset-password")
	public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest req) {
		try {
			return ResponseEntity.ok(authService.resetPassword(
					req == null ? null : req.token(),
					req == null ? null : req.newPassword()
			));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}
}

