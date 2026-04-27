package com.mangafrik.services.auth;

import com.mangafrik.dto.auth.AuthDtos.ChangePasswordRequest;
import com.mangafrik.dto.auth.AuthDtos.LoginRequest;
import com.mangafrik.dto.auth.AuthDtos.LoginResponse;
import com.mangafrik.dto.auth.AuthDtos.RegisterRequest;
import com.mangafrik.dto.auth.AuthDtos.RegisterResponse;
import com.mangafrik.dto.auth.PasswordResetDtos.ForgotPasswordResponse;
import com.mangafrik.dto.auth.PasswordResetDtos.ResetPasswordResponse;
import com.mangafrik.security.jwt.JwtService;
import com.mangafrik.services.email.EmailService;
import com.mangafrik.services.email.templates.PasswordResetEmailTemplate;
import com.mangafrik.services.email.templates.WelcomeEmailTemplate;
import jakarta.mail.MessagingException;
import java.time.Duration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AuthService {
	private final NamedParameterJdbcTemplate jdbc;
	private final PasswordEncoder passwordEncoder;
	private final ObjectMapper objectMapper;
	private final EmailService emailService;
	private final JwtService jwtService;

	@Value("${app.email.enabled:false}")
	private boolean emailEnabled;

	@Value("${spring.mail.host:}")
	private String mailHost;

	@Value("${app.public.base-url:https://mangafrik.com}")
	private String publicBaseUrl;

	@Value("${app.public.frontend-url:}")
	private String publicFrontendUrl;

	@Value("${app.auth.password-reset.ttl-minutes:30}")
	private long passwordResetTtlMinutes;

	@Value("${app.auth.session.ttl-hours:12}")
	private long sessionTtlHours;

	public AuthService(
			NamedParameterJdbcTemplate jdbc,
			PasswordEncoder passwordEncoder,
			ObjectMapper objectMapper,
			EmailService emailService,
			JwtService jwtService
	) {
		this.jdbc = jdbc;
		this.passwordEncoder = passwordEncoder;
		this.objectMapper = objectMapper;
		this.emailService = emailService;
		this.jwtService = jwtService;
	}

	public RegisterResponse register(RegisterRequest req) {
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		String displayName = (req.name() == null ? "" : req.name().trim());
		String password = (req.password() == null ? "" : req.password());
		// Super app: public registration is always a reader.
		String role = "reader";
		Object profile = req.profile() == null ? Collections.emptyMap() : req.profile();

		if (email.isBlank()) throw new IllegalArgumentException("email is required");
		if (!email.contains("@")) throw new IllegalArgumentException("email is invalid");
		if (displayName.isBlank()) throw new IllegalArgumentException("name is required");
		if (password.length() < 6) throw new IllegalArgumentException("password must be at least 6 characters");

		String passwordHash = passwordEncoder.encode(password);
		Instant now = Instant.now();

		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("email", email)
				.addValue("display_name", displayName)
				.addValue("role", role)
				.addValue("password_hash", passwordHash)
				.addValue("profile", toJson(profile))
				.addValue("updated_at", Timestamp.from(now));

		try {
			Map<String, Object> row = jdbc.queryForMap("""
					insert into app_users (email, display_name, role, password_hash, profile, updated_at)
					values (:email, :display_name, :role, :password_hash, cast(:profile as jsonb), :updated_at)
					returning id, email, display_name, role, profile
					""", params);

			RegisterResponse res = new RegisterResponse(
					((Number) row.get("id")).longValue(),
					String.valueOf(row.get("email")),
					String.valueOf(row.get("display_name")),
					String.valueOf(row.get("role")),
					parseJsonObject(String.valueOf(row.get("profile")))
			);

			maybeSendWelcomeEmail(res);
			return res;
		} catch (DuplicateKeyException e) {
			throw new IllegalArgumentException("email already exists");
		}
	}

	private String toJson(Object value) {
		try {
			return objectMapper.writeValueAsString(value);
		} catch (Exception e) {
			throw new IllegalArgumentException("profile must be valid JSON");
		}
	}

	private Object parseJsonObject(String raw) {
		try {
			if (raw == null || raw.isBlank() || "null".equals(raw)) return Collections.emptyMap();
			return objectMapper.readValue(raw, Object.class);
		} catch (Exception e) {
			return Collections.emptyMap();
		}
	}

	public LoginResponse login(LoginRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		String password = req.password() == null ? "" : req.password();
		if (email.isBlank()) throw new IllegalArgumentException("email is required");
		if (password.isBlank()) throw new IllegalArgumentException("password is required");

		Map<String, Object> row;
		try {
			row = jdbc.queryForMap("""
					select id, email, display_name, role, password_hash, must_change_password
					from app_users
					where lower(email) = :email
					limit 1
					""", new MapSqlParameterSource().addValue("email", email));
		} catch (IncorrectResultSizeDataAccessException e) {
			throw new IllegalArgumentException("account not found");
		}

		String passwordHash = String.valueOf(row.get("password_hash"));
		if (passwordHash == null || passwordHash.isBlank() || "null".equals(passwordHash)) {
			throw new IllegalArgumentException("account has no password");
		}
		if (!passwordEncoder.matches(password, passwordHash)) {
			throw new IllegalArgumentException("invalid credentials");
		}

		boolean mustChange = false;
		Object mcp = row.get("must_change_password");
		if (mcp instanceof Boolean b) mustChange = b;
		else if (mcp != null) mustChange = Boolean.parseBoolean(String.valueOf(mcp));

		String token = jwtService.issue(((Number) row.get("id")).longValue(), email, String.valueOf(row.get("role")));

		return new LoginResponse(
				((Number) row.get("id")).longValue(),
				String.valueOf(row.get("email")),
				String.valueOf(row.get("display_name")),
				String.valueOf(row.get("role")),
				mustChange,
				token
		);
	}

	public ForgotPasswordResponse forgotPassword(String emailRaw) {
		String email = (emailRaw == null ? "" : emailRaw.trim()).toLowerCase();
		// Always return a generic message to avoid account enumeration.
		String msg = "Si ce compte existe, un lien de réinitialisation a été envoyé.";
		if (email.isBlank() || !email.contains("@")) return new ForgotPasswordResponse(msg);

		if (!emailEnabled || mailHost == null || mailHost.isBlank()) return new ForgotPasswordResponse(msg);

		Map<String, Object> row;
		try {
			row = jdbc.queryForMap("""
					select id, email, display_name
					from app_users
					where lower(email) = :email
					limit 1
					""", new MapSqlParameterSource().addValue("email", email));
		} catch (IncorrectResultSizeDataAccessException e) {
			return new ForgotPasswordResponse(msg);
		}

		long userId = ((Number) row.get("id")).longValue();
		String displayName = String.valueOf(row.get("display_name"));

		UUID token = UUID.randomUUID();
		Instant now = Instant.now();
		Instant expires = now.plus(Duration.ofMinutes(Math.max(5, passwordResetTtlMinutes)));

		jdbc.update("""
				insert into app_password_reset_tokens (token, user_id, created_at, expires_at)
				values (:token, :user_id, :created_at, :expires_at)
				""",
			new MapSqlParameterSource()
				.addValue("token", token)
				.addValue("user_id", userId)
				.addValue("created_at", Timestamp.from(now))
				.addValue("expires_at", Timestamp.from(expires))
		);

		String base = (publicFrontendUrl == null ? "" : publicFrontendUrl.trim());
		if (base.isEmpty()) base = publicBaseUrl;
		base = base.replaceAll("/$", "");

		String resetUrl = base + "/reset-password?token=" + token;
		String subject = PasswordResetEmailTemplate.subject();
		String html = PasswordResetEmailTemplate.html(displayName, resetUrl, base);
		String text = PasswordResetEmailTemplate.text(displayName, resetUrl);

		try {
			emailService.sendHtmlEmail(email, subject, html);
		} catch (MessagingException e) {
			emailService.sendSimpleEmail(email, subject, text);
		}

		return new ForgotPasswordResponse(msg);
	}

	public ResetPasswordResponse resetPassword(String tokenRaw, String newPasswordRaw) {
		String token = tokenRaw == null ? "" : tokenRaw.trim();
		String newPassword = newPasswordRaw == null ? "" : newPasswordRaw;

		if (token.isBlank()) throw new IllegalArgumentException("token is required");
		if (newPassword.trim().length() < 6) throw new IllegalArgumentException("password must be at least 6 characters");

		UUID tokenUuid;
		try {
			tokenUuid = UUID.fromString(token);
		} catch (Exception e) {
			throw new IllegalArgumentException("invalid or expired token");
		}

		Map<String, Object> row;
		try {
			row = jdbc.queryForMap("""
					select user_id, expires_at, used_at
					from app_password_reset_tokens
					where token = cast(:token as uuid)
					limit 1
					""", new MapSqlParameterSource().addValue("token", tokenUuid.toString()));
		} catch (IncorrectResultSizeDataAccessException e) {
			throw new IllegalArgumentException("invalid or expired token");
		}

		Object usedAt = row.get("used_at");
		if (usedAt != null && !"null".equals(String.valueOf(usedAt))) {
			throw new IllegalArgumentException("token already used");
		}

		Instant expiresAt;
		Object expiresObj = row.get("expires_at");
		if (expiresObj instanceof Timestamp ts) {
			expiresAt = ts.toInstant();
		} else {
			// Fallback for drivers returning string/offset datetime
			expiresAt = Instant.parse(String.valueOf(expiresObj));
		}
		if (expiresAt.isBefore(Instant.now())) {
			throw new IllegalArgumentException("invalid or expired token");
		}

		long userId = ((Number) row.get("user_id")).longValue();

		String nextHash = passwordEncoder.encode(newPassword);
		Instant now = Instant.now();

		jdbc.update("""
				update app_users
				set password_hash = :password_hash,
				    must_change_password = false,
				    password_changed_at = :password_changed_at,
				    updated_at = :updated_at
				where id = :id
				""", new MapSqlParameterSource()
				.addValue("password_hash", nextHash)
				.addValue("password_changed_at", Timestamp.from(now))
				.addValue("updated_at", Timestamp.from(now))
				.addValue("id", userId)
		);

		jdbc.update("""
				update app_password_reset_tokens
				set used_at = :used_at
				where token = cast(:token as uuid)
				""", new MapSqlParameterSource()
				.addValue("used_at", Timestamp.from(now))
				.addValue("token", tokenUuid.toString())
		);

		return new ResetPasswordResponse("Mot de passe mis à jour.");
	}

	public Map<String, Object> changePassword(ChangePasswordRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		String oldPw = req.oldPassword() == null ? "" : req.oldPassword();
		String newPw = req.newPassword() == null ? "" : req.newPassword();

		if (email.isBlank()) throw new IllegalArgumentException("email is required");
		if (oldPw.isBlank()) throw new IllegalArgumentException("oldPassword is required");
		if (newPw.length() < 6) throw new IllegalArgumentException("newPassword must be at least 6 characters");

		Map<String, Object> row = jdbc.queryForMap("""
				select id, password_hash
				from app_users
				where lower(email) = :email
				limit 1
				""", new MapSqlParameterSource().addValue("email", email));

		String passwordHash = String.valueOf(row.get("password_hash"));
		if (!passwordEncoder.matches(oldPw, passwordHash)) {
			throw new IllegalArgumentException("invalid credentials");
		}

		String nextHash = passwordEncoder.encode(newPw);
		Instant now = Instant.now();
		int updated = jdbc.update("""
				update app_users
				set password_hash = :password_hash,
				    must_change_password = false,
				    password_changed_at = :password_changed_at,
				    updated_at = :updated_at
				where lower(email) = :email
				""", new MapSqlParameterSource()
				.addValue("password_hash", nextHash)
				.addValue("password_changed_at", Timestamp.from(now))
				.addValue("updated_at", Timestamp.from(now))
				.addValue("email", email));

		return Map.of("updated", updated == 1);
	}

	/**
	 * Admin-approved creator credentials: creates (or updates) a creator user with the given password.
	 */
	public void createCreatorCredentials(String emailRaw, String displayNameRaw, String plainPassword) {
		String email = (emailRaw == null ? "" : emailRaw.trim()).toLowerCase();
		String displayName = (displayNameRaw == null ? "" : displayNameRaw.trim());
		if (email.isBlank() || !email.contains("@")) throw new IllegalArgumentException("email is invalid");
		if (displayName.isBlank()) displayName = email.split("@")[0];
		if (plainPassword == null || plainPassword.length() < 6) throw new IllegalArgumentException("password is invalid");

		String passwordHash = passwordEncoder.encode(plainPassword);
		Instant now = Instant.now();

		jdbc.update("""
				insert into app_users (email, display_name, role, password_hash, must_change_password, profile, updated_at)
				values (:email, :display_name, 'creator', :password_hash, true, '{}'::jsonb, :updated_at)
				on conflict (email) do update
				  set display_name = excluded.display_name,
				      role = 'creator',
				      password_hash = excluded.password_hash,
				      must_change_password = true,
				      updated_at = excluded.updated_at
				""",
			new MapSqlParameterSource()
				.addValue("email", email)
				.addValue("display_name", displayName)
				.addValue("password_hash", passwordHash)
				.addValue("updated_at", Timestamp.from(now))
		);
	}

	private void maybeSendWelcomeEmail(RegisterResponse user) {
		if (!emailEnabled) return;
		if (mailHost == null || mailHost.isBlank()) return;

		String subject = WelcomeEmailTemplate.subject();
		String html = WelcomeEmailTemplate.html(user.displayName(), publicBaseUrl);
		String text = WelcomeEmailTemplate.text(user.displayName(), publicBaseUrl);

		try {
			emailService.sendHtmlEmail(user.email(), subject, html);
		} catch (MessagingException e) {
			// Fallback to plain text if HTML fails for any reason.
			emailService.sendSimpleEmail(user.email(), subject, text);
		}
	}

	// Legacy helper kept for other call sites in this class history; no longer used.
}

