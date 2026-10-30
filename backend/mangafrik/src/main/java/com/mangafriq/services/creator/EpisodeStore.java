package com.mangafriq.services.creator;

import com.mangafriq.dto.creator.EpisodeDtos.AddCommentRequest;
import com.mangafriq.dto.creator.EpisodeDtos.CreateDraftRequest;
import com.mangafriq.dto.creator.EpisodeDtos.CreatePublishedRequest;
import com.mangafriq.dto.creator.EpisodeDtos.EpisodeDraftDto;
import com.mangafriq.dto.creator.EpisodeDtos.PublishedEpisodeDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.catalog.CatalogChapterSyncService;
import com.mangafriq.services.email.CreatorPublishNotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EpisodeStore {
	private final NamedParameterJdbcTemplate jdbc;
	private final ObjectMapper objectMapper;
	private final CatalogChapterSyncService catalogChapterSync;
	private final CreatorPublishNotificationService creatorPublishNotify;

	public EpisodeStore(
			NamedParameterJdbcTemplate jdbc,
			ObjectMapper objectMapper,
			CatalogChapterSyncService catalogChapterSync,
			CreatorPublishNotificationService creatorPublishNotify) {
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
		this.catalogChapterSync = catalogChapterSync;
		this.creatorPublishNotify = creatorPublishNotify;
	}

	/** Drafts owned by {@code creatorEmail}; {@code null} lists every creator's drafts (staff). */
	public List<EpisodeDraftDto> listDrafts(String creatorEmail) {
		return jdbc.query("""
				select id, created_at, series_title, episode_title, creator_note, comments_enabled, publish_mode, publish_at, thumb, images
				from creator_episode_drafts
				where (:all = true) or (lower(creator_email) = :email)
				order by created_at desc
				""",
			ownerParams(creatorEmail),
			(rs, i) -> new EpisodeDraftDto(
				String.valueOf(rs.getObject("id")),
				rs.getTimestamp("created_at").toInstant(),
				rs.getString("series_title"),
				rs.getString("episode_title"),
				rs.getString("creator_note"),
				rs.getBoolean("comments_enabled"),
				rs.getString("publish_mode"),
				rs.getString("publish_at"),
				readJsonMap(rs.getString("thumb")),
				readJsonList(rs.getString("images"))
			)
		);
	}

	public EpisodeDraftDto createDraft(CreateDraftRequest req, String creatorEmail) {
		String id = UUID.randomUUID().toString();
		Instant now = Instant.now();
		EpisodeDraftDto dto = new EpisodeDraftDto(
				id,
				now,
				nz(req.seriesTitle()),
				nz(req.episodeTitle()),
				blankToNull(req.creatorNote()),
				req.commentsEnabled() == null || req.commentsEnabled(),
				nz(req.publishMode()),
				nz(req.publishAt()),
				req.thumb(),
				req.images() == null ? List.of() : req.images()
		);

		jdbc.update("""
				insert into creator_episode_drafts
				  (id, created_at, series_title, episode_title, creator_note, comments_enabled, publish_mode, publish_at, thumb, images, creator_email)
				values
				  (cast(:id as uuid), :created_at, :series_title, :episode_title, :creator_note, :comments_enabled, :publish_mode, :publish_at,
				   cast(:thumb as jsonb), cast(:images as jsonb), :creator_email)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("creator_email", blankToNull(creatorEmail))
				.addValue("created_at", java.sql.Timestamp.from(now))
				.addValue("series_title", dto.seriesTitle())
				.addValue("episode_title", dto.episodeTitle())
				.addValue("creator_note", dto.creatorNote())
				.addValue("comments_enabled", dto.commentsEnabled())
				.addValue("publish_mode", dto.publishMode())
				.addValue("publish_at", dto.publishAt())
				.addValue("thumb", writeJson(dto.thumb()))
				.addValue("images", writeJson(dto.images()))
		);

		return dto;
	}

	/** Episodes owned by {@code creatorEmail}; {@code null} lists every creator's episodes (staff). */
	public List<PublishedEpisodeDto> listPublished(String creatorEmail) {
		return jdbc.query("""
				select id, published_at, scheduled_for, series_title, episode_title, creator_note, comments_enabled, thumb, images, stats, comments
				from creator_published_episodes
				where (:all = true) or (lower(creator_email) = :email)
				order by published_at desc
				""",
			ownerParams(creatorEmail),
			(rs, i) -> new PublishedEpisodeDto(
				String.valueOf(rs.getObject("id")),
				rs.getTimestamp("published_at").toInstant(),
				rs.getString("scheduled_for"),
				rs.getString("series_title"),
				rs.getString("episode_title"),
				rs.getString("creator_note"),
				rs.getBoolean("comments_enabled"),
				readJsonMap(rs.getString("thumb")),
				readJsonList(rs.getString("images")),
				readJsonMap(rs.getString("stats")),
				readJsonList(rs.getString("comments"))
			)
		);
	}

	public PublishedEpisodeDto createPublished(CreatePublishedRequest req, String creatorEmail) {
		Map<String, Object> stats = new HashMap<>();
		stats.put("views", 0);
		stats.put("likes", 0);
		stats.put("comments", 0);
		String id = UUID.randomUUID().toString();
		Instant now = Instant.now();
		PublishedEpisodeDto dto = new PublishedEpisodeDto(
				id,
				now,
				blankToNull(req.scheduledFor()),
				nz(req.seriesTitle()),
				nz(req.episodeTitle()),
				blankToNull(req.creatorNote()),
				req.commentsEnabled() == null || req.commentsEnabled(),
				req.thumb(),
				req.images() == null ? List.of() : req.images(),
				stats,
				new ArrayList<>()
		);
		jdbc.update("""
				insert into creator_published_episodes
				  (id, published_at, scheduled_for, series_title, episode_title, creator_note, comments_enabled, thumb, images, stats, comments, creator_email)
				values
				  (cast(:id as uuid), :published_at, :scheduled_for, :series_title, :episode_title, :creator_note, :comments_enabled,
				   cast(:thumb as jsonb), cast(:images as jsonb), cast(:stats as jsonb), cast(:comments as jsonb), :creator_email)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("creator_email", blankToNull(creatorEmail))
				.addValue("published_at", java.sql.Timestamp.from(now))
				.addValue("scheduled_for", dto.scheduledFor())
				.addValue("series_title", dto.seriesTitle())
				.addValue("episode_title", dto.episodeTitle())
				.addValue("creator_note", dto.creatorNote())
				.addValue("comments_enabled", dto.commentsEnabled())
				.addValue("thumb", writeJson(dto.thumb()))
				.addValue("images", writeJson(dto.images()))
				.addValue("stats", writeJson(dto.stats()))
				.addValue("comments", writeJson(dto.comments()))
		);

		try {
			catalogChapterSync.syncCreatorEpisodeToCatalog(
					dto.seriesTitle(), dto.episodeTitle(), dto.images(), dto.publishedAt());
		} catch (Exception e) {
			log.warn("Could not sync published episode to public catalog: {}", e.getMessage());
		}
		try {
			creatorPublishNotify.notifyEpisodePublished(creatorEmail, dto.seriesTitle(), dto.episodeTitle());
		} catch (Exception ignored) {
			// Email must not block publish.
		}
		return dto;
	}

	public Optional<String> findPublishedEpisodeIdByTitles(String seriesTitle, String episodeTitle) {
		if (seriesTitle == null || seriesTitle.isBlank()) {
			return Optional.empty();
		}
		String ep = episodeTitle == null ? "" : episodeTitle.trim();
		List<String> ids = jdbc.query(
				"""
				select id::text
				from creator_published_episodes
				where lower(trim(series_title)) = lower(trim(:series))
				  and lower(trim(episode_title)) = lower(trim(:episode))
				order by published_at desc
				limit 1
				""",
				new MapSqlParameterSource()
						.addValue("series", seriesTitle.trim())
						.addValue("episode", ep),
				(rs, i) -> rs.getString("id"));
		return ids.isEmpty() ? Optional.empty() : Optional.of(ids.get(0));
	}

	public PublishedEpisodeDto incrementView(String id) {
		return updateStats(id, "views", 1);
	}

	public PublishedEpisodeDto addLike(String id) {
		return updateStats(id, "likes", 1);
	}

	public PublishedEpisodeDto addComment(String id, AddCommentRequest req) {
		return addComment(id, req, UUID.randomUUID().toString());
	}

	/** Same, with the id of the reader's comment (chapter_comments) so it can be removed later. */
	public PublishedEpisodeDto addComment(String id, AddCommentRequest req, String commentId) {
		PublishedEpisodeDto ep = getPublished(id);
		List<Map<String, Object>> comments = new ArrayList<>(ep.comments() == null ? List.of() : ep.comments());
		Map<String, Object> row = new HashMap<>();
		row.put("id", commentId);
		row.put("createdAt", Instant.now().toString());
		row.put("author", blankToNull(req.author()));
		row.put("text", nz(req.text()));
		comments.add(0, row);

		Map<String, Object> nextStats = new HashMap<>(ep.stats() == null ? Map.of() : ep.stats());
		int current = asInt(nextStats.get("comments"));
		nextStats.put("comments", current + 1);

		PublishedEpisodeDto next = new PublishedEpisodeDto(
			ep.id(),
			ep.publishedAt(),
			ep.scheduledFor(),
			ep.seriesTitle(),
			ep.episodeTitle(),
			ep.creatorNote(),
			ep.commentsEnabled(),
			ep.thumb(),
			ep.images(),
			nextStats,
			comments
		);

		int updated = jdbc.update("""
				update creator_published_episodes
				set stats = cast(:stats as jsonb),
				    comments = cast(:comments as jsonb)
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("stats", writeJson(nextStats))
				.addValue("comments", writeJson(comments))
		);
		if (updated == 0) throw new NotFoundException("Episode not found");
		return next;
	}

	private PublishedEpisodeDto updateStats(String id, String key, int delta) {
		PublishedEpisodeDto ep = getPublished(id);
		Map<String, Object> nextStats = new HashMap<>(ep.stats() == null ? Map.of() : ep.stats());
		int current = asInt(nextStats.get(key));
		nextStats.put(key, current + delta);
		PublishedEpisodeDto next = new PublishedEpisodeDto(
			ep.id(),
			ep.publishedAt(),
			ep.scheduledFor(),
			ep.seriesTitle(),
			ep.episodeTitle(),
			ep.creatorNote(),
			ep.commentsEnabled(),
			ep.thumb(),
			ep.images(),
			nextStats,
			ep.comments()
		);

		int updated = jdbc.update("""
				update creator_published_episodes
				set stats = cast(:stats as jsonb)
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("stats", writeJson(nextStats))
		);
		if (updated == 0) throw new NotFoundException("Episode not found");
		return next;
	}

	/** Removes a reader comment mirrored by {@link #addComment(String, AddCommentRequest, String)}. */
	public void removeComment(String id, String commentId) {
		PublishedEpisodeDto ep = getPublished(id);
		List<Map<String, Object>> comments = new ArrayList<>(ep.comments() == null ? List.of() : ep.comments());
		if (!comments.removeIf(c -> commentId.equals(String.valueOf(c.get("id"))))) return;
		Map<String, Object> nextStats = new HashMap<>(ep.stats() == null ? Map.of() : ep.stats());
		nextStats.put("comments", Math.max(0, asInt(nextStats.get("comments")) - 1));
		jdbc.update("""
				update creator_published_episodes
				set stats = cast(:stats as jsonb), comments = cast(:comments as jsonb)
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("stats", writeJson(nextStats))
				.addValue("comments", writeJson(comments)));
	}

	public boolean commentsEnabled(String id) {
		return getPublished(id).commentsEnabled();
	}

	private PublishedEpisodeDto getPublished(String id) {
		List<PublishedEpisodeDto> rows = jdbc.query("""
				select id, published_at, scheduled_for, series_title, episode_title, creator_note, comments_enabled, thumb, images, stats, comments
				from creator_published_episodes
				where id = cast(:id as uuid)
				""",
			Map.of("id", id),
			(rs, i) -> new PublishedEpisodeDto(
				String.valueOf(rs.getObject("id")),
				rs.getTimestamp("published_at").toInstant(),
				rs.getString("scheduled_for"),
				rs.getString("series_title"),
				rs.getString("episode_title"),
				rs.getString("creator_note"),
				rs.getBoolean("comments_enabled"),
				readJsonMap(rs.getString("thumb")),
				readJsonList(rs.getString("images")),
				readJsonMap(rs.getString("stats")),
				readJsonList(rs.getString("comments"))
			)
		);
		if (rows.isEmpty()) throw new NotFoundException("Episode not found");
		return rows.get(0);
	}

	private MapSqlParameterSource ownerParams(String creatorEmail) {
		String email = creatorEmail == null ? "" : creatorEmail.trim().toLowerCase();
		return new MapSqlParameterSource()
			.addValue("all", creatorEmail == null)
			.addValue("email", email);
	}

	private int asInt(Object v) {
		if (v instanceof Number n) return n.intValue();
		if (v == null) return 0;
		try {
			return Integer.parseInt(String.valueOf(v));
		} catch (NumberFormatException ex) {
			return 0;
		}
	}

	private String nz(String s) {
		return s == null ? "" : s;
	}

	private String blankToNull(String s) {
		if (s == null) return null;
		String t = s.trim();
		return t.isEmpty() ? null : t;
	}

	private String writeJson(Object value) {
		if (value == null) return "null";
		try {
			return objectMapper.writeValueAsString(value);
		} catch (JsonProcessingException e) {
			return "null";
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

	@SuppressWarnings("unchecked")
	private List<Map<String, Object>> readJsonList(String json) {
		if (json == null || json.isBlank()) return List.of();
		try {
			Object obj = objectMapper.readValue(json, Object.class);
			if (obj instanceof List<?> l) return (List<Map<String, Object>>) l;
			return List.of();
		} catch (Exception e) {
			return List.of();
		}
	}
}

