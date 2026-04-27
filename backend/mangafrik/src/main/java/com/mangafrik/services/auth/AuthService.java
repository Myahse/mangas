package com.mangafrik.services.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mangafrik.dto.auth.AuthDtos.ChangePasswordRequest;
import com.mangafrik.dto.auth.AuthDtos.LoginRequest;
import com.mangafrik.dto.auth.AuthDtos.LoginResponse;
import com.mangafrik.dto.auth.AuthDtos.RegisterRequest;
import com.mangafrik.dto.auth.AuthDtos.RegisterResponse;
import com.mangafrik.services.email.EmailService;
import com.mangafrik.services.email.templates.WelcomeEmailTemplate;
import jakarta.mail.MessagingException;
import java.time.Duration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
	private final NamedParameterJdbcTemplate jdbc;
	private final PasswordEncoder passwordEncoder;
	private final ObjectMapper objectMapper;
	private final EmailService emailService;

	@Value("${app.email.enabled:false}")
	private boolean emailEnabled;

	@Value("${spring.mail.host:}")
	private String mailHost;

	@Value("${app.public.base-url:https://mangafrik.com}")
	private String publicBaseUrl;

	@Value("${app.auth.session.ttl-hours:168}")
	private long sessionTtlHours;

	public AuthService(
			NamedParameterJdbcTemplate jdbc,
			PasswordEncoder passwordEncoder,
			ObjectMapper objectMapper,
			EmailService emailService
	) {
		this.jdbc = jdbc;
		this.passwordEncoder = passwordEncoder;
		this.objectMapper = objectMapper;
		this.emailService = emailService;
	}

	public RegisterResponse register(RegisterRequest req) {
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		String displayName = (req.name() == null ? "" : req.name().trim());
		String password = (req.password() == null ? "" : req.password());
		// Super app: public registration is always a reader.
		String role = "reader";
		JsonNode profile = req.profile() == null ? objectMapper.createObjectNode() : req.profile();

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
				.addValue("profile", profile.toString())
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
					parseJson(String.valueOf(row.get("profile")))
			);

			maybeSendWelcomeEmail(res);
			return res;
		} catch (DuplicateKeyException e) {
			throw new IllegalArgumentException("email already exists");
		}
	}

	public LoginResponse login(LoginRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		String password = req.password() == null ? "" : req.password();
		if (email.isBlank()) throw new IllegalArgumentException("email is required");
		if (password.isBlank()) throw new IllegalArgumentException("password is required");

		Map<String, Object> row = jdbc.queryForMap("""
				select id, email, display_name, role, password_hash, must_change_password
				from app_users
				where lower(email) = :email
				limit 1
				""", new MapSqlParameterSource().addValue("email", email));

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

		String token = createSession(((Number) row.get("id")).longValue());

		return new LoginResponse(
				((Number) row.get("id")).longValue(),
				String.valueOf(row.get("email")),
				String.valueOf(row.get("display_name")),
				String.valueOf(row.get("role")),
				mustChange,
				token
		);
	}

	private String createSession(long userId) {
		UUID token = UUID.randomUUID();
		Instant now = Instant.now();
		Instant expires = now.plus(Duration.ofHours(Math.max(1, sessionTtlHours)));
		jdbc.update("""
				insert into app_sessions (token, user_id, created_at, expires_at)
				values (:token, :user_id, :created_at, :expires_at)
				""",
			new MapSqlParameterSource()
				.addValue("token", token)
				.addValue("user_id", userId)
				.addValue("created_at", Timestamp.from(now))
				.addValue("expires_at", Timestamp.from(expires))
		);
		return token.toString();
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

	private JsonNode parseJson(String raw) {
		try {
			return objectMapper.readTree(raw == null ? "{}" : raw);
		} catch (Exception e) {
			return objectMapper.createObjectNode();
		}
	}
}

