package com.mangafriq.services.admin;

import com.mangafriq.dto.admin.AdminDtos.AdminUserDto;
import com.mangafriq.dto.admin.AdminDtos.CreateUserRequest;
import com.mangafriq.dto.admin.AdminDtos.ResetUserCredentialsResponse;
import com.mangafriq.dto.admin.AdminDtos.UpdateUserRequest;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.email.EmailService;
import com.mangafriq.services.email.templates.UserCredentialsEmailTemplate;
import jakarta.mail.MessagingException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminUserService {
	private final NamedParameterJdbcTemplate jdbc;
	private final PasswordEncoder passwordEncoder;
	private final EmailService emailService;

	@Value("${app.email.enabled:false}")
	private boolean emailEnabled;

	@Value("${spring.mail.host:}")
	private String mailHost;

	@Value("${app.public.base-url:http://localhost:5173}")
	private String publicBaseUrl;

	@Value("${app.public.frontend-url:}")
	private String publicFrontendUrl;

	public AdminUserService(NamedParameterJdbcTemplate jdbc, PasswordEncoder passwordEncoder, EmailService emailService) {
		this.jdbc = jdbc;
		this.passwordEncoder = passwordEncoder;
		this.emailService = emailService;
	}

	public List<AdminUserDto> listUsers() {
		return jdbc.query("""
				select id, email, display_name, role, status, created_at
				from app_users
				order by created_at desc
				""",
			Map.of(),
			(rs, i) -> new AdminUserDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("email"),
				rs.getString("display_name"),
				rs.getString("role"),
				rs.getString("status"),
				rs.getTimestamp("created_at").toInstant(),
				"db"
			)
		);
	}

	public AdminUserDto createUser(CreateUserRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		if (email.isBlank() || !email.contains("@")) throw new IllegalArgumentException("email is invalid");

		String displayName = (req.displayName() == null ? "" : req.displayName().trim());
		if (displayName.isBlank()) displayName = email.split("@")[0];

		String role = normalizeRole(req.role());
		String status = normalizeStatus(req.status());
		String roles = toPgTextArray(java.util.List.of(role, "reader"));

		String tempPassword = generatePassword(12);
		String passwordHash = passwordEncoder.encode(tempPassword);
		Instant now = Instant.now();

		try {
			String id = UUID.randomUUID().toString();
			Map<String, Object> row = jdbc.queryForMap("""
					insert into app_users (id, email, display_name, role, roles, status, password_hash, must_change_password, profile, updated_at)
					values (cast(:id as uuid), :email, :display_name, :role, cast(:roles as text[]), :status, :password_hash, true, '{}'::jsonb, :updated_at)
					returning id, email, display_name, role, status, created_at
					""",
				new MapSqlParameterSource()
					.addValue("id", id)
					.addValue("email", email)
					.addValue("display_name", displayName)
					.addValue("role", role)
					.addValue("roles", roles)
					.addValue("status", status)
					.addValue("password_hash", passwordHash)
					.addValue("updated_at", Timestamp.from(now))
			);

			AdminUserDto created = mapRow(row);
			maybeSendCredentialsEmail(created, tempPassword);
			// Do not return the password in the API response.
			return created;
		} catch (DuplicateKeyException e) {
			throw new IllegalArgumentException("email already exists");
		}
	}

	public AdminUserDto updateUser(String id, UpdateUserRequest patch) {
		UUID userId = parseId(id);
		if (patch == null) throw new IllegalArgumentException("payload is required");

		Map<String, Object> row = getUserRow(userId);

		String nextDisplayName = patch.displayName() != null ? patch.displayName().trim() : String.valueOf(row.get("display_name"));
		String nextRole = patch.role() != null ? normalizeRole(patch.role()) : String.valueOf(row.get("role"));
		String nextStatus = patch.status() != null ? normalizeStatus(patch.status()) : String.valueOf(row.get("status"));
		String nextRoles = toPgTextArray(java.util.List.of(nextRole, "reader"));

		Instant now = Instant.now();
		int updated = jdbc.update("""
				update app_users
				set display_name = :display_name,
				    role = :role,
				    roles = cast(:roles as text[]),
				    status = :status,
				    updated_at = :updated_at
				where id = :id
				""",
			new MapSqlParameterSource()
				.addValue("id", userId)
				.addValue("display_name", nextDisplayName)
				.addValue("role", nextRole)
				.addValue("roles", nextRoles)
				.addValue("status", nextStatus)
				.addValue("updated_at", Timestamp.from(now))
		);
		if (updated == 0) throw new NotFoundException("User not found");

		Map<String, Object> next = getUserRow(userId);
		return mapRow(next);
	}

	public ResetUserCredentialsResponse resetCredentials(String id) {
		UUID userId = parseId(id);
		Map<String, Object> prev = getUserRow(userId);
		AdminUserDto userBefore = mapRow(prev);
		String tempPassword = generatePassword(12);
		String passwordHash = passwordEncoder.encode(tempPassword);
		Instant now = Instant.now();

		int updated = jdbc.update("""
				update app_users
				set password_hash = :password_hash,
				    must_change_password = true,
				    password_changed_at = :password_changed_at,
				    updated_at = :updated_at
				where id = :id
				""",
			new MapSqlParameterSource()
				.addValue("id", userId)
				.addValue("password_hash", passwordHash)
				.addValue("password_changed_at", Timestamp.from(now))
				.addValue("updated_at", Timestamp.from(now))
		);
		if (updated == 0) throw new NotFoundException("User not found");

		Map<String, Object> next = getUserRow(userId);
		AdminUserDto user = mapRow(next);
		maybeSendCredentialsEmail(userBefore, tempPassword);
		return new ResetUserCredentialsResponse(user, tempPassword);
	}

	private void maybeSendCredentialsEmail(AdminUserDto user, String tempPassword) {
		if (!emailEnabled) return;
		if (!emailService.isConfigured()) return;

		String base = (publicFrontendUrl == null ? "" : publicFrontendUrl.trim());
		if (base.isBlank()) base = publicBaseUrl;
		String loginUrl = base.replaceAll("/+$", "") + "/login";
		String logoUrl = emailService.resolveEmailLogoUrl();
		String subject = UserCredentialsEmailTemplate.subject();
		String html = UserCredentialsEmailTemplate.html(user.displayName(), user.email(), tempPassword, user.role(), loginUrl, logoUrl);
		String text = UserCredentialsEmailTemplate.text(user.displayName(), user.email(), tempPassword, user.role(), loginUrl);

		try {
			emailService.sendHtmlEmail(user.email(), subject, html);
		} catch (MessagingException e) {
			emailService.sendSimpleEmail(user.email(), subject, text);
		}
	}

	private Map<String, Object> getUserRow(UUID userId) {
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select id, email, display_name, role, status, created_at
				from app_users
				where id = :id
				limit 1
				""", Map.of("id", userId));
		if (rows.isEmpty()) throw new NotFoundException("User not found");
		return rows.get(0);
	}

	private static AdminUserDto mapRow(Map<String, Object> row) {
		Instant createdAt = Instant.now();
		Object ca = row.get("created_at");
		if (ca instanceof Timestamp ts) createdAt = ts.toInstant();
		else if (ca != null && !"null".equals(String.valueOf(ca))) {
			try {
				createdAt = Instant.parse(String.valueOf(ca));
			} catch (Exception ignored) {}
		}
		return new AdminUserDto(
			String.valueOf(row.get("id")),
			String.valueOf(row.get("email")),
			String.valueOf(row.get("display_name")),
			String.valueOf(row.get("role")),
			String.valueOf(row.get("status")),
			createdAt,
			"db"
		);
	}

	private static UUID parseId(String id) {
		try {
			return UUID.fromString(id == null ? "" : id.trim());
		} catch (Exception e) {
			throw new NotFoundException("User not found");
		}
	}

	private static String normalizeRole(String raw) {
		String r = raw == null ? "" : raw.trim().toLowerCase();
		return switch (r) {
			case "admin", "support", "ads", "creator", "reader" -> r;
			default -> throw new IllegalArgumentException("role is invalid");
		};
	}

	private static String normalizeStatus(String raw) {
		String s = raw == null ? "" : raw.trim().toLowerCase();
		return switch (s) {
			case "active", "disabled" -> s;
			default -> throw new IllegalArgumentException("status is invalid");
		};
	}

	private static String generatePassword(int length) {
		final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
		SecureRandom rng = new SecureRandom();
		StringBuilder sb = new StringBuilder(length);
		for (int i = 0; i < length; i++) sb.append(alphabet.charAt(rng.nextInt(alphabet.length())));
		return sb.toString();
	}

	private static String toPgTextArray(java.util.List<String> roles) {
		if (roles == null || roles.isEmpty()) return "{}";
		return "{" + roles.stream()
			.map(r -> r == null ? "" : r.trim().toLowerCase())
			.filter(s -> !s.isBlank())
			.distinct()
			.map(s -> "\"" + s.replace("\"", "\\\"") + "\"")
			.reduce((a, b) -> a + "," + b)
			.orElse("")
			+ "}";
	}
}

