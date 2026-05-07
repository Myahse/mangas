package com.mangafriq.services.creator;

import com.mangafriq.dto.creator.CreateMangaSubmissionRequest;
import com.mangafriq.dto.creator.MangaSubmissionDto;
import com.mangafriq.dto.creator.MangaSubmissionDto.CreatorDto;
import com.mangafriq.dto.creator.MangaSubmissionDto.ModerationDto;
import com.mangafriq.exception.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CreatorStore {
	private final NamedParameterJdbcTemplate jdbc;
	private final ObjectMapper objectMapper;

	public CreatorStore(NamedParameterJdbcTemplate jdbc, ObjectMapper objectMapper) {
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
	}

	public MangaSubmissionDto createSubmission(CreateMangaSubmissionRequest req) {
		Instant now = Instant.now();
		String id = UUID.randomUUID().toString();
		String creatorEmail = (req.creatorEmail() == null || req.creatorEmail().isBlank()) ? "unknown" : req.creatorEmail().trim();
		String creatorDisplayName = (req.creatorDisplayName() == null || req.creatorDisplayName().isBlank()) ? "Unknown creator" : req.creatorDisplayName().trim();
		String payloadJson = writeJson(req.payload());

		jdbc.update("""
				insert into creator_manga_submissions
				  (id, status, created_at, creator_email, creator_display_name, payload, moderation_decision, moderation_reason, moderation_reviewed_at)
				values
				  (cast(:id as uuid), :status, :created_at, :creator_email, :creator_display_name, cast(:payload as jsonb), null, '', null)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("status", "pending")
				.addValue("created_at", java.sql.Timestamp.from(now))
				.addValue("creator_email", creatorEmail)
				.addValue("creator_display_name", creatorDisplayName)
				.addValue("payload", payloadJson)
		);

		MangaSubmissionDto dto = new MangaSubmissionDto(
				id,
				"pending",
				now,
				new CreatorDto(
						creatorEmail,
						creatorDisplayName
				),
				req.payload(),
				new ModerationDto(null, "", null)
		);
		return dto;
	}

	public List<MangaSubmissionDto> listSubmissions(String creatorEmail) {
		String email = (creatorEmail == null ? "" : creatorEmail.trim().toLowerCase());
		boolean filter = !email.isBlank();
		return jdbc.query("""
				select id, status, created_at, creator_email, creator_display_name, payload,
				       moderation_decision, moderation_reason, moderation_reviewed_at
				from creator_manga_submissions
				where (:filter = false) or (lower(creator_email) = :email)
				order by created_at desc
				""",
			new MapSqlParameterSource()
				.addValue("filter", filter)
				.addValue("email", email),
			(rs, i) -> new MangaSubmissionDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("status"),
				rs.getTimestamp("created_at").toInstant(),
				new CreatorDto(
					rs.getString("creator_email"),
					rs.getString("creator_display_name")
				),
				readJsonMap(rs.getString("payload")),
				new ModerationDto(
					rs.getString("moderation_decision"),
					rs.getString("moderation_reason"),
					rs.getTimestamp("moderation_reviewed_at") == null ? null : rs.getTimestamp("moderation_reviewed_at").toInstant()
				)
			)
		);
	}

	public MangaSubmissionDto reviewSubmission(String id, String decision, String reason) {
		if (id == null || id.isBlank()) throw new NotFoundException("Submission not found");
		MangaSubmissionDto current = getById(id);
		Instant now = Instant.now();
		String safeDecision = decision == null ? "" : decision.trim();
		String safeReason = reason == null ? "" : reason.trim();

		int updated = jdbc.update("""
				update creator_manga_submissions
				set status = :status,
				    moderation_decision = :moderation_decision,
				    moderation_reason = :moderation_reason,
				    moderation_reviewed_at = :moderation_reviewed_at
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("status", safeDecision)
				.addValue("moderation_decision", safeDecision)
				.addValue("moderation_reason", safeReason)
				.addValue("moderation_reviewed_at", java.sql.Timestamp.from(now))
		);
		if (updated == 0) throw new NotFoundException("Submission not found");

		return new MangaSubmissionDto(
			current.id(),
			safeDecision,
			current.createdAt(),
			current.creator(),
			current.payload(),
			new ModerationDto(safeDecision, safeReason, now)
		);
	}

	private MangaSubmissionDto getById(String id) {
		List<MangaSubmissionDto> rows = jdbc.query("""
				select id, status, created_at, creator_email, creator_display_name, payload,
				       moderation_decision, moderation_reason, moderation_reviewed_at
				from creator_manga_submissions
				where id = cast(:id as uuid)
				""",
			Map.of("id", id),
			(rs, i) -> new MangaSubmissionDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("status"),
				rs.getTimestamp("created_at").toInstant(),
				new CreatorDto(
					rs.getString("creator_email"),
					rs.getString("creator_display_name")
				),
				readJsonMap(rs.getString("payload")),
				new ModerationDto(
					rs.getString("moderation_decision"),
					rs.getString("moderation_reason"),
					rs.getTimestamp("moderation_reviewed_at") == null ? null : rs.getTimestamp("moderation_reviewed_at").toInstant()
				)
			)
		);
		if (rows.isEmpty()) throw new NotFoundException("Submission not found");
		return rows.get(0);
	}

	private String writeJson(Object payload) {
		if (payload == null) return "{}";
		try {
			return objectMapper.writeValueAsString(payload);
		} catch (JsonProcessingException e) {
			return "{}";
		}
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> readJsonMap(String json) {
		if (json == null || json.isBlank()) return Map.of();
		try {
			Object obj = objectMapper.readValue(json, Object.class);
			if (obj instanceof Map<?, ?> m) return (Map<String, Object>) m;
			return Map.of();
		} catch (Exception e) {
			return Map.of();
		}
	}
}

