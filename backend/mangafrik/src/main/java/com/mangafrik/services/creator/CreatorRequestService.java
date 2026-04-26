package com.mangafrik.services.creator;

import com.mangafrik.dto.admin.AdminDtos.CreatorRequestDto;
import com.mangafrik.dto.admin.AdminDtos.ReviewRequest;
import com.mangafrik.dto.creator.CreatorRequestDtos.SubmitCreatorRequest;
import com.mangafrik.exception.NotFoundException;
import com.mangafrik.services.auth.AuthService;
import com.mangafrik.services.email.EmailService;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CreatorRequestService {
	private final NamedParameterJdbcTemplate jdbc;
	private final AuthService authService;
	private final EmailService emailService;

	@Value("${app.email.enabled:false}")
	private boolean emailEnabled;

	@Value("${spring.mail.host:}")
	private String mailHost;

	public CreatorRequestService(NamedParameterJdbcTemplate jdbc, AuthService authService, EmailService emailService) {
		this.jdbc = jdbc;
		this.authService = authService;
		this.emailService = emailService;
	}

	public CreatorRequestDto submit(SubmitCreatorRequest req) {
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		String displayName = (req.displayName() == null ? "" : req.displayName().trim());
		String penName = req.penName() == null ? "" : req.penName().trim();
		String genres = req.genres() == null ? "" : req.genres().trim();
		String message = req.message() == null ? "" : req.message().trim();

		if (email.isBlank() || !email.contains("@")) throw new IllegalArgumentException("email is invalid");
		if (displayName.isBlank()) throw new IllegalArgumentException("displayName is required");
		if (penName.isBlank()) throw new IllegalArgumentException("penName is required");
		if (message.isBlank()) throw new IllegalArgumentException("message is required");

		Map<String, Object> row = jdbc.queryForMap("""
			insert into creator_requests (email, display_name, pen_name, genres, message, status, created_at)
			values (:email, :display_name, :pen_name, :genres, :message, 'pending', :created_at)
			returning id, email, display_name, status, coalesce(review_reason,'') as reason, created_at, reviewed_at
			""",
			new MapSqlParameterSource()
				.addValue("email", email)
				.addValue("display_name", displayName)
				.addValue("pen_name", penName)
				.addValue("genres", genres)
				.addValue("message", message)
				.addValue("created_at", Timestamp.from(Instant.now()))
		);

		return mapRow(row);
	}

	public List<CreatorRequestDto> listAll() {
		return jdbc.query("""
				select id, email, display_name, status, coalesce(review_reason,'') as reason, created_at, reviewed_at
				from creator_requests
				order by created_at desc
				""",
			Map.of(),
			(rs, i) -> new CreatorRequestDto(
				String.valueOf(rs.getLong("id")),
				rs.getString("email"),
				rs.getString("display_name"),
				rs.getString("status"),
				rs.getString("reason"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("reviewed_at") == null ? null : rs.getTimestamp("reviewed_at").toInstant()
			)
		);
	}

	public CreatorRequestDto review(String id, ReviewRequest req) {
		long rid;
		try {
			rid = Long.parseLong(id);
		} catch (NumberFormatException e) {
			throw new NotFoundException("Creator request not found");
		}

		String decision = (req.decision() == null ? "" : req.decision().trim().toLowerCase());
		if (!decision.equals("approved") && !decision.equals("rejected")) {
			throw new IllegalArgumentException("decision must be approved or rejected");
		}

		Instant now = Instant.now();
		int updated = jdbc.update("""
				update creator_requests
				set status = :status,
				    review_reason = :reason,
				    reviewed_at = :reviewed_at
				where id = :id
				""",
			new MapSqlParameterSource()
				.addValue("id", rid)
				.addValue("status", decision)
				.addValue("reason", req.reason() == null ? "" : req.reason().trim())
				.addValue("reviewed_at", Timestamp.from(now))
		);
		if (updated == 0) throw new NotFoundException("Creator request not found");

		Map<String, Object> row = jdbc.queryForMap("""
				select id, email, display_name, status, coalesce(review_reason,'') as reason, created_at, reviewed_at
				from creator_requests
				where id = :id
				""", Map.of("id", rid));

		CreatorRequestDto dto = mapRow(row);

		if (decision.equals("approved")) {
			String password = generatePassword(14);
			authService.createCreatorCredentials(dto.email(), dto.displayName(), password);
			maybeSendCreatorCredentialsEmail(dto.email(), dto.displayName(), password);
		}

		return dto;
	}

	private void maybeSendCreatorCredentialsEmail(String email, String displayName, String password) {
		if (!emailEnabled) return;
		if (mailHost == null || mailHost.isBlank()) return;
		String subject = "Accès créateur";
		String text = """
			Bonjour %s,

			Votre demande de compte créateur a été approuvée.

			Identifiants:
			- Email: %s
			- Mot de passe: %s

			Vous pouvez vous connecter sur le panneau créateur.
			""".formatted(displayName, email, password);
		emailService.sendSimpleEmail(email, subject, text);
	}

	private static CreatorRequestDto mapRow(Map<String, Object> row) {
		return new CreatorRequestDto(
			String.valueOf(((Number) row.get("id")).longValue()),
			String.valueOf(row.get("email")),
			String.valueOf(row.get("display_name")),
			String.valueOf(row.get("status")),
			String.valueOf(row.get("reason")),
			row.get("created_at") instanceof java.sql.Timestamp ts ? ts.toInstant() : Instant.now(),
			row.get("reviewed_at") == null ? null : ((java.sql.Timestamp) row.get("reviewed_at")).toInstant()
		);
	}

	private static String generatePassword(int length) {
		final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
		SecureRandom rng = new SecureRandom();
		StringBuilder sb = new StringBuilder(length);
		for (int i = 0; i < length; i++) sb.append(alphabet.charAt(rng.nextInt(alphabet.length())));
		return sb.toString();
	}
}

