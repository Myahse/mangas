package com.mangafriq.services.community;

import com.mangafriq.dto.creator.EpisodeDtos.AddCommentRequest;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.catalog.CatalogEngagementService;
import com.mangafriq.services.creator.EpisodeStore;
import com.mangafriq.services.translation.TranslationService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Reader comments at the end of a chapter (see V46). Each comment is mirrored into the creator-panel
 * episode it came from, so the creator's "Commentaires lecteurs" list and counter keep working, and the
 * episode's "comments enabled" setting is respected.
 */
@Service
@Slf4j
public class CommentService {
	static final int MAX_TEXT = 500;
	static final int MAX_PER_MINUTE = 5;

	private final NamedParameterJdbcTemplate jdbc;
	private final CatalogEngagementService engagement;
	private final EpisodeStore episodes;
	private final TranslationService translations;

	public CommentService(NamedParameterJdbcTemplate jdbc, CatalogEngagementService engagement, EpisodeStore episodes,
			TranslationService translations) {
		this.jdbc = jdbc;
		this.engagement = engagement;
		this.episodes = episodes;
		this.translations = translations;
	}

	/** Visible comments, newest first; userId (may be null) marks mine and the ones I liked. */
	public Map<String, Object> list(String slug, int chapter, String userId, String email, boolean staff) {
		boolean enabled = commentsEnabled(slug, chapter);
		boolean moderator = userId != null && (staff || translations.ownsSeriesOf(email, slug));
		List<Map<String, Object>> items = jdbc.query("""
				select c.id::text as id, c.user_id, c.text, c.created_at,
				       coalesce(nullif(u.display_name, ''), 'Lecteur') as author,
				       (select count(*) from chapter_comment_likes l where l.comment_id = c.id) as likes,
				       exists (select 1 from chapter_comment_likes l where l.comment_id = c.id and l.user_id = :user) as liked
				from chapter_comments c
				left join app_users u on u.id::text = c.user_id
				where c.manga_slug = :slug and c.chapter_number = :chapter and c.status = 'visible'
				order by c.created_at desc
				limit 100
				""", new MapSqlParameterSource().addValue("slug", slug).addValue("chapter", chapter)
				.addValue("user", userId == null ? "" : userId),
			(rs, i) -> {
				Map<String, Object> row = new LinkedHashMap<>();
				row.put("id", rs.getString("id"));
				row.put("author", rs.getString("author"));
				row.put("text", rs.getString("text"));
				row.put("createdAt", rs.getTimestamp("created_at").toInstant());
				row.put("likes", rs.getInt("likes"));
				row.put("liked", rs.getBoolean("liked"));
				row.put("mine", userId != null && userId.equals(rs.getString("user_id")));
				return row;
			});
		Map<String, Object> out = new LinkedHashMap<>();
		out.put("enabled", enabled);
		out.put("canModerate", moderator);
		out.put("items", items);
		return out;
	}

	public Map<String, Object> post(String userId, String email, boolean staff, String slug, int chapter, String textRaw) {
		String text = textRaw == null ? "" : textRaw.trim();
		if (text.isEmpty()) throw new IllegalArgumentException("comment is empty");
		if (text.length() > MAX_TEXT) throw new IllegalArgumentException("comment is too long (max " + MAX_TEXT + ")");
		if (!commentsEnabled(slug, chapter)) throw new IllegalArgumentException("comments are turned off for this chapter");
		Integer recent = jdbc.queryForObject("""
				select count(*) from chapter_comments where user_id = :user and created_at > now() - interval '1 minute'
				""", Map.of("user", userId), Integer.class);
		if (recent != null && recent >= MAX_PER_MINUTE) {
			throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "too many comments, wait a minute");
		}
		UUID id = UUID.randomUUID();
		jdbc.update("""
				insert into chapter_comments (id, manga_slug, chapter_number, user_id, text)
				values (:id, :slug, :chapter, :user, :text)
				""", new MapSqlParameterSource().addValue("id", id).addValue("slug", slug).addValue("chapter", chapter)
			.addValue("user", userId).addValue("text", text));
		mirror(slug, chapter, ep -> {
			String author = jdbc.queryForList("select display_name from app_users where id::text = :id", Map.of("id", userId), String.class)
				.stream().findFirst().orElse("Lecteur");
			episodes.addComment(ep, new AddCommentRequest(author, text), id.toString());
		});
		return list(slug, chapter, userId, email, staff);
	}

	/** Toggles my like on a comment; returns { liked, likes }. */
	public Map<String, Object> toggleLike(String userId, String idRaw) {
		UUID id = TranslationService.parseId(idRaw);
		comment(id);
		int removed = jdbc.update("delete from chapter_comment_likes where comment_id = :id and user_id = :user",
			new MapSqlParameterSource().addValue("id", id).addValue("user", userId));
		if (removed == 0) {
			jdbc.update("insert into chapter_comment_likes (comment_id, user_id) values (:id, :user) on conflict do nothing",
				new MapSqlParameterSource().addValue("id", id).addValue("user", userId));
		}
		Integer likes = jdbc.queryForObject("select count(*) from chapter_comment_likes where comment_id = :id", Map.of("id", id), Integer.class);
		return Map.of("liked", removed == 0, "likes", likes == null ? 0 : likes);
	}

	/** The author deletes their comment; the series' creator or staff hide any comment. */
	public void remove(String userId, String email, boolean staff, String idRaw) {
		UUID id = TranslationService.parseId(idRaw);
		Map<String, Object> c = comment(id);
		String slug = String.valueOf(c.get("manga_slug"));
		int chapter = ((Number) c.get("chapter_number")).intValue();
		boolean mine = userId.equals(c.get("user_id"));
		boolean moderator = staff || translations.ownsSeriesOf(email, slug);
		if (!mine && !moderator) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not allowed");
		if (mine) {
			jdbc.update("delete from chapter_comments where id = :id", Map.of("id", id));
		} else {
			jdbc.update("update chapter_comments set status = 'hidden' where id = :id", Map.of("id", id));
		}
		mirror(slug, chapter, ep -> episodes.removeComment(ep, id.toString()));
	}

	private boolean commentsEnabled(String slug, int chapter) {
		try {
			return engagement.episodeIdFor(slug, chapter).map(episodes::commentsEnabled).orElse(true);
		} catch (NotFoundException e) {
			throw e;
		} catch (RuntimeException e) {
			return true;
		}
	}

	/** Keeps the creator-panel episode in step; never fails the reader's action. */
	private void mirror(String slug, int chapter, java.util.function.Consumer<String> action) {
		try {
			engagement.episodeIdFor(slug, chapter).ifPresent(action);
		} catch (RuntimeException e) {
			log.warn("Could not mirror comment change to the creator episode of {}#{}: {}", slug, chapter, e.getMessage());
		}
	}

	private Map<String, Object> comment(UUID id) {
		List<Map<String, Object>> rows = jdbc.queryForList(
			"select id, manga_slug, chapter_number, user_id, status from chapter_comments where id = :id", Map.of("id", id));
		if (rows.isEmpty()) throw new NotFoundException("Comment not found");
		return rows.get(0);
	}
}
