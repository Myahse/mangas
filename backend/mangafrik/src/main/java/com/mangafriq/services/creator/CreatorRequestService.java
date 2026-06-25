package com.mangafriq.services.creator;

import com.mangafriq.dto.admin.AdminDtos.CreatorRequestDto;
import com.mangafriq.dto.admin.AdminDtos.ReviewRequest;
import com.mangafriq.dto.creator.CreatorRequestDtos.SubmitCreatorRequest;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.auth.AuthService;
import com.mangafriq.services.email.EmailService;
import com.mangafriq.services.email.templates.CreatorCredentialsEmailTemplate;
import jakarta.mail.MessagingException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class CreatorRequestService {
	private final NamedParameterJdbcTemplate jdbc;
	private final AuthService authService;
	private final EmailService emailService;
	private final CreatorContractService contractService;

	@Value("${app.email.enabled:true}")
	private boolean emailEnabled;

	@Value("${spring.mail.host:}")
	private String mailHost;

	@Value("${app.public.base-url:http://localhost:5173}")
	private String publicBaseUrl;

	public CreatorRequestService(
		NamedParameterJdbcTemplate jdbc,
		AuthService authService,
		EmailService emailService,
		CreatorContractService contractService
	) {
		this.jdbc = jdbc;
		this.authService = authService;
		this.emailService = emailService;
		this.contractService = contractService;
	}

	public CreatorRequestDto submit(SubmitCreatorRequest req) {
		ensureCreatorRequestsTable();
		String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
		String creatorEmail = (req.creatorEmail() == null ? "" : req.creatorEmail().trim()).toLowerCase();
		String displayName = (req.displayName() == null ? "" : req.displayName().trim());
		String penName = req.penName() == null ? "" : req.penName().trim();
		String genres = req.genres() == null ? "" : req.genres().trim();
		String message = req.message() == null ? "" : req.message().trim();

		if (email.isBlank() || !email.contains("@")) throw new IllegalArgumentException("email is invalid");
		if (creatorEmail.isBlank() || !creatorEmail.contains("@")) throw new IllegalArgumentException("creatorEmail is invalid");
		if (displayName.isBlank()) throw new IllegalArgumentException("displayName is required");
		if (penName.isBlank()) throw new IllegalArgumentException("penName is required");
		if (message.isBlank()) throw new IllegalArgumentException("message is required");

		Optional<CreatorRequestDto> existing = findLatestByEmail(email);
		if (existing.isPresent()) {
			String st = String.valueOf(existing.get().status()).trim().toLowerCase();
			if (!st.equals("rejected")) {
				if (st.equals("approved")) throw new IllegalArgumentException("creator request already approved");
				throw new IllegalArgumentException("creator request already submitted");
			}
		}

		MapSqlParameterSource params = new MapSqlParameterSource()
			.addValue("email", email)
			.addValue("creator_email", creatorEmail)
			.addValue("display_name", displayName)
			.addValue("pen_name", penName)
			.addValue("genres", genres)
			.addValue("message", message)
			.addValue("created_at", Timestamp.from(Instant.now()));

		UUID id = UUID.randomUUID();
		jdbc.update("""
			insert into creator_requests (id, email, creator_email, display_name, pen_name, genres, message, status, created_at)
			values (cast(:id as uuid), :email, :creator_email, :display_name, :pen_name, :genres, :message, 'pending', :created_at)
			""",
			params.addValue("id", id.toString())
		);

		Map<String, Object> row = jdbc.queryForMap("""
				select id, email, creator_email, display_name, coalesce(pen_name,'') as pen_name, coalesce(genres,'') as genres,
				       status, coalesce(review_reason,'') as reason, created_at, reviewed_at
				from creator_requests
				where id = :id
				""",
			Map.of("id", id)
		);

		CreatorRequestDto dto = mapRow(row);
		maybeSendCreatorRequestReceivedEmail(dto);
		contractService.createAndSend(dto);
		return dto;
	}

	public Optional<CreatorRequestDto> findLatestByEmail(String email) {
		ensureCreatorRequestsTable();
		String e = (email == null ? "" : email.trim()).toLowerCase();
		if (e.isBlank()) return Optional.empty();
		List<CreatorRequestDto> rows = jdbc.query("""
				select id, email, creator_email, display_name, coalesce(pen_name,'') as pen_name, coalesce(genres,'') as genres,
				       status, coalesce(review_reason,'') as reason, created_at, reviewed_at
				from creator_requests
				where lower(email) = :email
				order by created_at desc
				limit 1
				""",
			Map.of("email", e),
			(rs, i) -> new CreatorRequestDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("email"),
				rs.getString("creator_email"),
				rs.getString("display_name"),
				rs.getString("pen_name"),
				rs.getString("genres"),
				rs.getString("status"),
				rs.getString("reason"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("reviewed_at") == null ? null : rs.getTimestamp("reviewed_at").toInstant()
			)
		);
		return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
	}

	public CreatorRequestDto getById(String id) {
		ensureCreatorRequestsTable();
		UUID rid;
		try {
			rid = UUID.fromString(id == null ? "" : id.trim());
		} catch (Exception e) {
			throw new NotFoundException("Creator request not found");
		}
		try {
			Map<String, Object> row = jdbc.queryForMap("""
					select id, email, creator_email, display_name, coalesce(pen_name,'') as pen_name, coalesce(genres,'') as genres,
					       status, coalesce(review_reason,'') as reason, created_at, reviewed_at
					from creator_requests
					where id = :id
					limit 1
					""", Map.of("id", rid));
			return mapRow(row);
		} catch (Exception e) {
			throw new NotFoundException("Creator request not found");
		}
	}

	public List<CreatorRequestDto> listAll() {
		ensureCreatorRequestsTable();
		return jdbc.query("""
				select id, email, creator_email, display_name, coalesce(pen_name,'') as pen_name, coalesce(genres,'') as genres,
				       status, coalesce(review_reason,'') as reason, created_at, reviewed_at
				from creator_requests
				order by created_at desc
				""",
			Map.of(),
			(rs, i) -> new CreatorRequestDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("email"),
				rs.getString("creator_email"),
				rs.getString("display_name"),
				rs.getString("pen_name"),
				rs.getString("genres"),
				rs.getString("status"),
				rs.getString("reason"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("reviewed_at") == null ? null : rs.getTimestamp("reviewed_at").toInstant()
			)
		);
	}

	public CreatorRequestDto review(String id, ReviewRequest req) {
		ensureCreatorRequestsTable();
		UUID rid;
		try {
			rid = UUID.fromString(id == null ? "" : id.trim());
		} catch (Exception e) {
			throw new NotFoundException("Creator request not found");
		}

		CreatorRequestDto current = getById(String.valueOf(rid));
		String st = (current.status() == null ? "" : current.status().trim().toLowerCase());
		if (!"pending".equals(st)) throw new IllegalArgumentException("creator request is archived");

		String decision = (req.decision() == null ? "" : req.decision().trim().toLowerCase());
		if (!decision.equals("approved") && !decision.equals("rejected")) {
			throw new IllegalArgumentException("decision must be approved or rejected");
		}

		String reason = (req.reason() == null ? "" : req.reason().trim());
		if (reason.isBlank()) {
			reason = decision.equals("approved")
				? "Votre demande a été approuvée. Consultez votre email pour la suite."
				: "Votre demande a été refusée. Vous pouvez nous recontacter si besoin.";
		}

		Instant now = Instant.now();
		if (decision.equals("approved")) {
			if (!contractService.isSignedForCreatorRequest(String.valueOf(rid))) {
				throw new IllegalArgumentException("creator contract is not signed yet");
			}
			// Credentials are one-time; don't approve if we can't actually email them.
			if (!emailEnabled || !emailService.isConfigured()) {
				throw new IllegalStateException("email is not configured (set APP_EMAIL_ENABLED=true and configure SMTP/Brevo)");
			}
			String password = generatePassword(14);
			sendCreatorCredentialsEmailStrict(current.creatorEmail(), current.displayName(), password);
			authService.createCreatorCredentials(current.creatorEmail(), current.displayName(), password);
		}

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
				.addValue("reason", reason)
				.addValue("reviewed_at", Timestamp.from(now))
		);
		if (updated == 0) throw new NotFoundException("Creator request not found");

		CreatorRequestDto dto = getById(String.valueOf(rid));
		if (decision.equals("rejected")) {
			maybeSendCreatorRejectedEmail(dto);
		}
		return dto;
	}

	private void maybeSendCreatorRequestReceivedEmail(CreatorRequestDto dto) {
		if (!emailEnabled) return;
		if (!emailService.isConfigured()) return;
		String subject = "Demande créateur reçue";
		String text = """
			Bonjour %s,

			Nous avons bien reçu votre demande de compte créateur.
			Notre équipe va l’examiner et vous recevrez un email dès qu’une décision sera prise.

			Merci,
			MangAfric
			""".formatted(dto.displayName());
		// Always confirm receipt on the reader email.
		emailService.sendSimpleEmail(dto.email(), subject, text);
		// Also notify the creator email if it differs.
		if (dto.creatorEmail() != null && !dto.creatorEmail().isBlank() && !dto.creatorEmail().equalsIgnoreCase(dto.email())) {
			emailService.sendSimpleEmail(dto.creatorEmail(), subject, text);
		}
	}

	private void sendCreatorCredentialsEmailStrict(String email, String displayName, String password) {
		String base = (publicBaseUrl == null ? "" : publicBaseUrl.trim());
		if (base.isBlank()) base = "http://localhost:5173";
		base = base.replaceAll("/+$", "");
		String loginUrl = base;
		String logoUrl = emailService.resolveEmailLogoUrl();
		String subject = CreatorCredentialsEmailTemplate.subject();
		String html = CreatorCredentialsEmailTemplate.html(displayName, email, password, loginUrl, logoUrl);
		try {
			emailService.sendHtmlEmailStrict(email, subject, html);
		} catch (MessagingException e) {
			log.warn("Failed to send creator credentials email (strict): to={}", email, e);
			throw new IllegalStateException("failed to send credentials email");
		} catch (Exception e) {
			log.warn("Failed to send creator credentials email (strict): to={}", email, e);
			throw new IllegalStateException("failed to send credentials email");
		}
	}

	private void maybeSendCreatorRejectedEmail(CreatorRequestDto dto) {
		if (!emailEnabled) return;
		if (!emailService.isConfigured()) return;
		String subject = "Demande créateur";
		String text = """
			Bonjour %s,

			Votre demande de compte créateur a été examinée.
			Statut: %s

			Message:
			%s

			MangAfric
			""".formatted(dto.displayName(), dto.status(), (dto.reason() == null ? "" : dto.reason()));
		emailService.sendSimpleEmail(dto.email(), subject, text);
		if (dto.creatorEmail() != null && !dto.creatorEmail().isBlank() && !dto.creatorEmail().equalsIgnoreCase(dto.email())) {
			emailService.sendSimpleEmail(dto.creatorEmail(), subject, text);
		}
	}

	private static CreatorRequestDto mapRow(Map<String, Object> row) {
		return new CreatorRequestDto(
			String.valueOf(row.get("id")),
			String.valueOf(row.get("email")),
			String.valueOf(row.get("creator_email")),
			String.valueOf(row.get("display_name")),
			String.valueOf(row.get("pen_name")),
			String.valueOf(row.get("genres")),
			String.valueOf(row.get("status")),
			String.valueOf(row.get("reason")),
			row.get("created_at") instanceof java.sql.Timestamp ts ? ts.toInstant() : Instant.now(),
			row.get("reviewed_at") == null ? null : ((java.sql.Timestamp) row.get("reviewed_at")).toInstant()
		);
	}

	private void ensureCreatorRequestsTable() {
		jdbc.getJdbcTemplate().execute("""
			do $$
			begin
			  if to_regclass(format('%I.creator_requests', current_schema())) is not null then
			    if exists (
			      select 1 from information_schema.columns
			      where table_schema = current_schema()
			        and table_name = 'creator_requests'
			        and column_name = 'id'
			        and udt_name <> 'uuid'
			    ) and not exists (select 1 from creator_requests limit 1) then
			      execute 'drop table if exists creator_request_contracts cascade';
			      execute 'drop table creator_requests cascade';
			    end if;
			  end if;
			end $$;
			""");
		jdbc.getJdbcTemplate().execute("""
			create table if not exists creator_requests (
			  id uuid primary key,
			  email text not null,
			  creator_email text,
			  display_name text not null,
			  pen_name text,
			  genres text,
			  message text,
			  status text not null default 'pending',
			  review_reason text,
			  created_at timestamptz not null default now(),
			  reviewed_at timestamptz
			);
			""");
		jdbc.getJdbcTemplate().execute("""
			alter table if exists creator_requests
			  add column if not exists creator_email text;
			""");
		jdbc.getJdbcTemplate().execute("""
			create index if not exists idx_creator_requests_status_created_at
			  on creator_requests(status, created_at desc);
			""");
	}

	private static String generatePassword(int length) {
		final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
		SecureRandom rng = new SecureRandom();
		StringBuilder sb = new StringBuilder(length);
		for (int i = 0; i < length; i++) sb.append(alphabet.charAt(rng.nextInt(alphabet.length())));
		return sb.toString();
	}
}

