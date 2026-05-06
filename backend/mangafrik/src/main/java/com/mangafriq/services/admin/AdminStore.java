package com.mangafriq.services.admin;

import com.mangafriq.dto.admin.AdminDtos.AdminMangaDto;
import com.mangafriq.dto.admin.AdminDtos.AdminSummaryDto;
import com.mangafriq.dto.admin.AdminDtos.AuditDto;
import com.mangafriq.dto.admin.AdminDtos.CreateManga;
import com.mangafriq.dto.admin.AdminDtos.CreateMangaRequest;
import com.mangafriq.dto.admin.AdminDtos.MangaRequestDto;
import com.mangafriq.dto.admin.AdminDtos.ReviewRequest;
import com.mangafriq.dto.admin.AdminDtos.UpdateManga;
import com.mangafriq.dto.admin.AdminDtos.UpdateMangaRequest;
import com.mangafriq.dto.creator.MangaSubmissionDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.creator.CreatorStore;
import com.mangafriq.services.email.CreatorPublishNotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminStore {
	private final NamedParameterJdbcTemplate jdbc;
	private final ObjectMapper objectMapper;

	private final CreatorStore creatorStore;
	private final CreatorPublishNotificationService creatorPublishNotify;

	public AdminStore(
			NamedParameterJdbcTemplate jdbc,
			ObjectMapper objectMapper,
			CreatorStore creatorStore,
			CreatorPublishNotificationService creatorPublishNotify) {
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
		this.creatorStore = creatorStore;
		this.creatorPublishNotify = creatorPublishNotify;
	}

	public AdminSummaryDto summary() {
		Integer usersTotal = jdbc.getJdbcTemplate().queryForObject("select count(*) from app_users", Integer.class);
		Integer requestsTotal = jdbc.getJdbcTemplate().queryForObject("select count(*) from admin_manga_requests", Integer.class);
		Integer requestsNew = jdbc.getJdbcTemplate().queryForObject("select count(*) from admin_manga_requests where status = 'new'", Integer.class);
		Integer mangasTotal = jdbc.getJdbcTemplate().queryForObject("select count(*) from manga", Integer.class);
		Integer mangasPublished = jdbc.getJdbcTemplate().queryForObject("select count(*) from manga where status = 'published'", Integer.class);
		Integer auditsTotal = jdbc.getJdbcTemplate().queryForObject("select count(*) from admin_audits", Integer.class);
		Integer creatorPending = jdbc.getJdbcTemplate().queryForObject("select count(*) from creator_requests where status = 'pending'", Integer.class);
		Integer submissionsPending = jdbc.getJdbcTemplate().queryForObject("select count(*) from creator_manga_submissions where status = 'pending'", Integer.class);

		return new AdminSummaryDto(
				usersTotal == null ? 0 : usersTotal,
				requestsTotal == null ? 0 : requestsTotal,
				requestsNew == null ? 0 : requestsNew,
				mangasTotal == null ? 0 : mangasTotal,
				mangasPublished == null ? 0 : mangasPublished,
				auditsTotal == null ? 0 : auditsTotal,
				creatorPending == null ? 0 : creatorPending,
				submissionsPending == null ? 0 : submissionsPending
		);
	}

	public List<AuditDto> listAudits() {
		return jdbc.query("""
				select id, at, action, payload
				from admin_audits
				order by at desc
				limit 250
				""",
			Map.of(),
			(rs, i) -> new AuditDto(
				String.valueOf(rs.getObject("id")),
				rs.getTimestamp("at").toInstant(),
				rs.getString("action"),
				readJson(rs.getString("payload"))
			)
		);
	}

	public List<MangaRequestDto> listMangaRequests() {
		return jdbc.query("""
				select id, requested_title, requested_by, notes, status, created_at
				from admin_manga_requests
				order by created_at desc
				""",
			Map.of(),
			(rs, i) -> new MangaRequestDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("requested_title"),
				rs.getString("requested_by"),
				rs.getString("notes"),
				rs.getString("status"),
				rs.getTimestamp("created_at").toInstant()
			)
		);
	}

	public MangaRequestDto createMangaRequest(CreateMangaRequest req) {
		Instant now = Instant.now();
		String id = UUID.randomUUID().toString();
		MangaRequestDto row = new MangaRequestDto(
				id,
				(req.requestedTitle() == null || req.requestedTitle().isBlank()) ? "Untitled" : req.requestedTitle().trim(),
				(req.requestedBy() == null || req.requestedBy().isBlank()) ? "unknown" : req.requestedBy().trim(),
				req.notes() == null ? "" : req.notes().trim(),
				"new",
				now
		);
		jdbc.update("""
				insert into admin_manga_requests (id, requested_title, requested_by, notes, status, created_at)
				values (cast(:id as uuid), :requested_title, :requested_by, :notes, :status, :created_at)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("requested_title", row.requestedTitle())
				.addValue("requested_by", row.requestedBy())
				.addValue("notes", row.notes())
				.addValue("status", row.status())
				.addValue("created_at", java.sql.Timestamp.from(now))
		);
		audit("request.create", Map.of("id", row.id()));
		return row;
	}

	public MangaRequestDto updateMangaRequest(String id, UpdateMangaRequest patch) {
		MangaRequestDto current = getMangaRequest(id);
		MangaRequestDto next = new MangaRequestDto(
			current.id(),
			patch.requestedTitle() != null ? patch.requestedTitle() : current.requestedTitle(),
			patch.requestedBy() != null ? patch.requestedBy() : current.requestedBy(),
			patch.notes() != null ? patch.notes() : current.notes(),
			patch.status() != null ? patch.status() : current.status(),
			current.createdAt()
		);
		int updated = jdbc.update("""
				update admin_manga_requests
				set requested_title = :requested_title,
				    requested_by = :requested_by,
				    notes = :notes,
				    status = :status
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("requested_title", next.requestedTitle())
				.addValue("requested_by", next.requestedBy())
				.addValue("notes", next.notes())
				.addValue("status", next.status())
		);
		if (updated == 0) throw new NotFoundException("Request not found");
		audit("request.update", Map.of("id", id));
		return next;
	}

	public boolean deleteMangaRequest(String id) {
		int removed = jdbc.update("delete from admin_manga_requests where id = cast(:id as uuid)", Map.of("id", id));
		if (removed > 0) audit("request.delete", Map.of("id", id));
		return removed > 0;
	}

	public List<AdminMangaDto> listMangas() {
		return jdbc.query("""
				select id, title, slug, status, created_at
				from manga
				order by created_at desc
				""",
			Map.of(),
			(rs, i) -> new AdminMangaDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("title"),
				rs.getString("slug"),
				rs.getString("status"),
				rs.getTimestamp("created_at").toInstant()
			)
		);
	}

	public AdminMangaDto createManga(CreateManga req) {
		Instant now = Instant.now();
		String title = (req.title() == null || req.title().isBlank()) ? "Untitled" : req.title().trim();
		String slug = (req.slug() == null || req.slug().isBlank()) ? slugify(title) : req.slug().trim();
		String status = req.status() == null ? "draft" : req.status();
		Map<String, Object> row = jdbc.queryForMap("""
				insert into manga (title, slug, status, created_at, updated_at)
				values (:title, :slug, :status, :created_at, :updated_at)
				returning id, title, slug, status, created_at
				""",
			new MapSqlParameterSource()
				.addValue("title", title)
				.addValue("slug", slug)
				.addValue("status", status)
				.addValue("created_at", java.sql.Timestamp.from(now))
				.addValue("updated_at", java.sql.Timestamp.from(now))
		);
		AdminMangaDto dto = new AdminMangaDto(
			String.valueOf(row.get("id")),
			String.valueOf(row.get("title")),
			String.valueOf(row.get("slug")),
			String.valueOf(row.get("status")),
			((java.sql.Timestamp) row.get("created_at")).toInstant()
		);
		audit("manga.create", Map.of("id", dto.id()));
		return dto;
	}

	public AdminMangaDto updateManga(String id, UpdateManga patch) {
		AdminMangaDto current = getManga(id);
		String nextTitle = patch.title() != null ? patch.title() : current.title();
		String nextSlug = patch.slug() != null ? patch.slug() : current.slug();
		String nextStatus = patch.status() != null ? patch.status() : current.status();
		Instant now = Instant.now();

		int updated = jdbc.update("""
				update manga
				set title = :title,
				    slug = :slug,
				    status = :status,
				    updated_at = :updated_at
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", parseMangaId(id))
				.addValue("title", nextTitle)
				.addValue("slug", nextSlug)
				.addValue("status", nextStatus)
				.addValue("updated_at", java.sql.Timestamp.from(now))
		);
		if (updated == 0) throw new NotFoundException("Manga not found");
		audit("manga.update", Map.of("id", id));
		return new AdminMangaDto(current.id(), nextTitle, nextSlug, nextStatus, current.createdAt());
	}

	public boolean deleteManga(String id) {
		int removed = jdbc.update("delete from manga where id = cast(:id as uuid)", Map.of("id", parseMangaId(id)));
		if (removed > 0) audit("manga.delete", Map.of("id", id));
		return removed > 0;
	}

	public Object reviewSubmission(String id, ReviewRequest req) {
		var next = creatorStore.reviewSubmission(id, req.decision(), req.reason());
		audit("submission." + req.decision(), Map.of("id", id));
		String decision = req.decision() == null ? "" : req.decision().trim();
		if ("approved".equalsIgnoreCase(decision)) {
			publishFromCreatorSubmission(next);
		} else if ("rejected".equalsIgnoreCase(decision) && next instanceof MangaSubmissionDto) {
			try {
				MangaSubmissionDto dto = (MangaSubmissionDto) next;
				String email = dto.creator() != null ? dto.creator().email() : "";
				creatorPublishNotify.notifyMangaSubmissionRejected(email, submissionMangaTitle(dto), req.reason());
			} catch (Exception ignored) {
				// Email must not block moderation.
			}
		} else if ("resubmit".equalsIgnoreCase(decision) && next instanceof MangaSubmissionDto) {
			try {
				MangaSubmissionDto dto = (MangaSubmissionDto) next;
				String email = dto.creator() != null ? dto.creator().email() : "";
				creatorPublishNotify.notifyMangaSubmissionResubmit(email, submissionMangaTitle(dto), req.reason());
			} catch (Exception ignored) {
				// Email must not block moderation.
			}
		}
		return next;
	}

	private static String submissionMangaTitle(MangaSubmissionDto s) {
		if (s == null || s.payload() == null) return "";
		String t = optionalText(s.payload().get("title"));
		return t == null ? "" : t;
	}

	/**
	 * Publishes catalog manga after moderator approval ({@link #reviewSubmission}).
	 * Uses UPDATE-then-INSERT (no {@code ON CONFLICT}) so publishing works even when {@code manga.slug}
	 * has no unique index (some DBs lose it during manual DDL); Flyway V30 still adds one when possible.
	 */
	@Transactional
	public void publishFromCreatorSubmission(com.mangafriq.dto.creator.MangaSubmissionDto submission) {
		Map<String, Object> p = submission == null ? null : submission.payload();
		String title = (p == null) ? null : optionalText(p.get("title"));
		if (title == null || title.isBlank()) title = "Untitled";
		String slug = slugify(title);
		if (slug == null || slug.isBlank()) {
			slug = "manga-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
		}
		String synopsis = p == null ? null : optionalText(p.get("summary"));
		String cover = null;
		String heroCover = null;
		if (p != null) {
			Object thumbs = p.get("thumbnails");
			if (thumbs instanceof Map<?, ?> tm) {
				Object sq = tm.get("square");
				if (sq instanceof Map<?, ?> sm) {
					cover = optionalText(sm.get("url"));
				}
				Object vt = tm.get("vertical");
				if (vt instanceof Map<?, ?> vm) {
					heroCover = optionalText(vm.get("url"));
				}
			}
		}
		Instant now = Instant.now();
		MapSqlParameterSource upsertParams = new MapSqlParameterSource()
				.addValue("title", title)
				.addValue("slug", slug)
				.addValue("synopsis", synopsis)
				.addValue("cover", cover)
				.addValue("hero_cover", heroCover)
				.addValue("created_at", java.sql.Timestamp.from(now))
				.addValue("updated_at", java.sql.Timestamp.from(now));
		int updatedRows = jdbc.update("""
				update manga as m
				set status = 'published',
				    title = :title,
				    synopsis = coalesce(:synopsis, m.synopsis),
				    cover = coalesce(:cover, m.cover),
				    hero_cover = coalesce(:hero_cover, m.hero_cover),
				    updated_at = :updated_at
				where m.slug = :slug
				""",
				upsertParams);
		if (updatedRows == 0) {
			jdbc.update("""
					insert into manga (title, slug, status, synopsis, cover, hero_cover, created_at, updated_at)
					values (:title, :slug, 'published', :synopsis, :cover, :hero_cover, :created_at, :updated_at)
					""",
					upsertParams);
		}
		List<UUID> mangaIds = jdbc.query(
				"select id from manga where slug = :slug",
				Map.of("slug", slug),
				(rs, i) -> (UUID) rs.getObject("id"));
		if (!mangaIds.isEmpty()) {
			UUID mangaId = mangaIds.get(0);
			try {
				jdbc.update(
						"delete from manga_genres where manga_id = :manga_id",
						new MapSqlParameterSource("manga_id", mangaId));
				String c1 = p == null ? null : optionalText(p.get("category1"));
				String c2 = p == null ? null : optionalText(p.get("category2"));
				List<String> categories = new ArrayList<>(2);
				if (c1 != null && !c1.isBlank()) categories.add(c1);
				if (c2 != null && !c2.isBlank() && !c2.equalsIgnoreCase(c1)) categories.add(c2);
				for (String cat : categories) {
					jdbc.update("""
							insert into manga_genres (manga_id, genre_id)
							select :manga_id, g.id
							from genres g
							where lower(trim(g.name)) = lower(trim(:name))
							on conflict do nothing
							""",
						new MapSqlParameterSource()
							.addValue("manga_id", mangaId)
							.addValue("name", cat));
				}
			} catch (DataAccessException ignored) {
				// Missing manga_genres / legacy bigint FK drift — manga row is already saved.
			}
		}
		audit("submission.publish", Map.of("id", submission == null ? "" : submission.id(), "title", title));
		try {
			if (submission != null && submission.creator() != null) {
				String ce = submission.creator().email();
				creatorPublishNotify.notifyMangaPublished(ce, title, slug);
			}
		} catch (Exception ignored) {
			// Email must not block publish.
		}
	}

	private void audit(String action, Object payload) {
		try {
			UUID rowId = UUID.randomUUID();
			Instant at = Instant.now();
			jdbc.update("""
					insert into admin_audits (id, at, action, payload)
					values (:id, :at, :action, cast(:payload as jsonb))
					""",
				new MapSqlParameterSource()
					.addValue("id", rowId)
					.addValue("at", java.sql.Timestamp.from(at))
					.addValue("action", action)
					.addValue("payload", writeJson(payload))
			);
			jdbc.getJdbcTemplate().execute("""
					delete from admin_audits
					where id in (
					  select id from admin_audits
					  order by at desc
					  offset 250
					)
					""");
		} catch (DataAccessException ignored) {
			// Missing admin_audits or drifted schema — do not block creator publish.
		}
	}

	private String slugify(String input) {
		return input.toLowerCase()
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("(^-|-$)", "");
	}

	private static String optionalText(Object value) {
		if (value == null) return null;
		String s = String.valueOf(value).trim();
		return s.isEmpty() || "null".equals(s) ? null : s;
	}

	private static String parseMangaId(String id) {
		try {
			return UUID.fromString(id).toString();
		} catch (IllegalArgumentException e) {
			throw new NotFoundException("Manga not found");
		}
	}

	private MangaRequestDto getMangaRequest(String id) {
		List<MangaRequestDto> rows = jdbc.query("""
				select id, requested_title, requested_by, notes, status, created_at
				from admin_manga_requests
				where id = cast(:id as uuid)
				""",
			Map.of("id", id),
			(rs, i) -> new MangaRequestDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("requested_title"),
				rs.getString("requested_by"),
				rs.getString("notes"),
				rs.getString("status"),
				rs.getTimestamp("created_at").toInstant()
			)
		);
		if (rows.isEmpty()) throw new NotFoundException("Request not found");
		return rows.get(0);
	}

	private AdminMangaDto getManga(String id) {
		List<AdminMangaDto> rows = jdbc.query("""
				select id, title, slug, status, created_at
				from manga
				where id = cast(:id as uuid)
				""",
			Map.of("id", parseMangaId(id)),
			(rs, i) -> new AdminMangaDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("title"),
				rs.getString("slug"),
				rs.getString("status"),
				rs.getTimestamp("created_at").toInstant()
			)
		);
		if (rows.isEmpty()) throw new NotFoundException("Manga not found");
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

	private Object readJson(String json) {
		if (json == null || json.isBlank()) return Map.of();
		try {
			return objectMapper.readValue(json, Object.class);
		} catch (Exception e) {
			return Map.of();
		}
	}
}

