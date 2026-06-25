package com.mangafriq.services.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mangafriq.dto.admin.CreatorAccountDtos.CreateCreatorAccountRequest;
import com.mangafriq.dto.admin.CreatorAccountDtos.CreateCreatorAccountResponse;
import com.mangafriq.services.email.EmailService;
import com.mangafriq.services.email.templates.CreatorCredentialsEmailTemplate;
import jakarta.mail.MessagingException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class CreatorAccountService {
	private final NamedParameterJdbcTemplate jdbc;
	private final PasswordEncoder passwordEncoder;
	private final ObjectMapper objectMapper;
	private final EmailService emailService;
	private final SecureRandom secureRandom = new SecureRandom();

	@Value("${app.email.enabled:true}")
	private boolean emailEnabled;

	@Value("${spring.mail.host:}")
	private String mailHost;

	@Value("${app.public.base-url:http://localhost:5173}")
	private String publicBaseUrl;

	public CreatorAccountService(
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

	public Map<String, Object> createCreatorAccountAndEmailCredentials(CreateCreatorAccountRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		String displayName = (req.displayName() == null ? "" : req.displayName().trim());
		if (email.isBlank()) throw new IllegalArgumentException("email is required");
		if (!email.contains("@")) throw new IllegalArgumentException("email is invalid");
		if (displayName.isBlank()) throw new IllegalArgumentException("displayName is required");

		String tempPassword = generateTempPassword(12);
		String passwordHash = passwordEncoder.encode(tempPassword);
		Instant now = Instant.now();

		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("email", email)
				.addValue("display_name", displayName)
				.addValue("role", "creator")
				.addValue("password_hash", passwordHash)
				.addValue("profile", objectMapper.createObjectNode().toString())
				.addValue("updated_at", Timestamp.from(now))
				.addValue("must_change_password", true);

		try {
			Map<String, Object> row = jdbc.queryForMap("""
					insert into app_users (email, display_name, role, password_hash, profile, updated_at, must_change_password)
					values (:email, :display_name, :role, :password_hash, cast(:profile as jsonb), :updated_at, :must_change_password)
					returning id, email, display_name, role, must_change_password
					""", params);

			CreateCreatorAccountResponse created = new CreateCreatorAccountResponse(
					((Number) row.get("id")).longValue(),
					String.valueOf(row.get("email")),
					String.valueOf(row.get("display_name")),
					String.valueOf(row.get("role")),
					Boolean.TRUE.equals(row.get("must_change_password"))
			);

			maybeSendCredentialsEmail(created, tempPassword);

			// Never return the password in the API response.
			return Map.of("user", created, "emailStatus", emailEnabled ? "attempted" : "disabled");
		} catch (DuplicateKeyException e) {
			throw new IllegalArgumentException("email already exists");
		}
	}

	private void maybeSendCredentialsEmail(CreateCreatorAccountResponse user, String tempPassword) {
		if (!emailEnabled) return;
		if (mailHost == null || mailHost.isBlank()) return;

		String loginUrl = publicBaseUrl;
		String logoUrl = emailService.resolveEmailLogoUrl();
		String subject = CreatorCredentialsEmailTemplate.subject();
		String html = CreatorCredentialsEmailTemplate.html(user.displayName(), user.email(), tempPassword, loginUrl, logoUrl);
		String text = CreatorCredentialsEmailTemplate.text(user.displayName(), user.email(), tempPassword, loginUrl);

		try {
			emailService.sendHtmlEmail(user.email(), subject, html);
		} catch (MessagingException e) {
			emailService.sendSimpleEmail(user.email(), subject, text);
		}
	}

	private String generateTempPassword(int length) {
		final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
		int n = Math.max(10, Math.min(length, 24));
		StringBuilder sb = new StringBuilder(n);
		for (int i = 0; i < n; i++) {
			sb.append(alphabet.charAt(secureRandom.nextInt(alphabet.length())));
		}
		return sb.toString();
	}
}

