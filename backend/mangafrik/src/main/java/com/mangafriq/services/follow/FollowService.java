package com.mangafriq.services.follow;

import com.mangafriq.exception.NotFoundException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

/** Followed series and the notifications they produce (see V45__series_follows_and_notifications.sql). */
@Service
public class FollowService {
	private final NamedParameterJdbcTemplate jdbc;

	public FollowService(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public boolean isFollowing(String userId, String slug) {
		Boolean f = jdbc.queryForObject(
			"select exists (select 1 from series_follows where user_id = :user and manga_slug = :slug)",
			params(userId, slug), Boolean.class);
		return Boolean.TRUE.equals(f);
	}

	public int followers(String slug) {
		Integer n = jdbc.queryForObject("select count(*) from series_follows where manga_slug = :slug",
			Map.of("slug", slug), Integer.class);
		return n == null ? 0 : n;
	}

	public void follow(String userId, String slug) {
		Integer exists = jdbc.queryForObject("select count(*) from manga where slug = :slug", Map.of("slug", slug), Integer.class);
		if (exists == null || exists == 0) throw new NotFoundException("Manga not found");
		jdbc.update("insert into series_follows (user_id, manga_slug) values (:user, :slug) on conflict do nothing",
			params(userId, slug));
	}

	public void unfollow(String userId, String slug) {
		jdbc.update("delete from series_follows where user_id = :user and manga_slug = :slug", params(userId, slug));
	}

	/** My followed series, most recently updated first, with their latest chapter. */
	public List<Map<String, Object>> followed(String userId) {
		return jdbc.query("""
				select m.slug, m.title, m.cover, f.created_at as followed_at,
				       lc.number as latest_chapter, lc.title as latest_title, lc.created_at as latest_at
				from series_follows f
				join manga m on m.slug = f.manga_slug
				left join lateral (
				  select number, title, created_at from chapters c where c.manga_id = m.id order by number desc limit 1
				) lc on true
				where f.user_id = :user
				order by coalesce(lc.created_at, f.created_at) desc
				""", Map.of("user", userId), (rs, i) -> {
				Map<String, Object> row = new LinkedHashMap<>();
				row.put("slug", rs.getString("slug"));
				row.put("title", rs.getString("title"));
				row.put("cover", rs.getString("cover"));
				row.put("latestChapter", rs.getObject("latest_chapter"));
				row.put("latestTitle", rs.getString("latest_title"));
				Timestamp at = rs.getTimestamp("latest_at");
				row.put("latestAt", at == null ? null : at.toInstant());
				return row;
			});
	}

	/** One notification per follower of the series, when a chapter is added to the catalog. */
	public int notifyNewChapter(UUID mangaId, int chapterNumber, String chapterTitle) {
		String label = chapterTitle == null || chapterTitle.isBlank()
			? "Chapitre " + chapterNumber
			: "Chapitre " + chapterNumber + " : " + chapterTitle.trim();
		return jdbc.update("""
				insert into user_notifications (id, user_id, kind, title, body, link)
				select gen_random_uuid(), f.user_id, 'new_chapter', m.title, :body,
				       '/manga/' || m.slug || '/chapter/' || :number
				from series_follows f join manga m on m.slug = f.manga_slug
				where m.id = :manga
				""", new MapSqlParameterSource().addValue("manga", mangaId).addValue("number", chapterNumber)
			.addValue("body", "Nouveau " + label.substring(0, 1).toLowerCase() + label.substring(1)));
	}

	public List<Map<String, Object>> notifications(String userId, int limitRaw) {
		int limit = Math.max(1, Math.min(limitRaw, 50));
		return jdbc.query("""
				select id::text as id, kind, title, body, link, created_at, read_at
				from user_notifications where user_id = :user
				order by created_at desc limit :limit
				""", new MapSqlParameterSource().addValue("user", userId).addValue("limit", limit), (rs, i) -> {
				Map<String, Object> row = new LinkedHashMap<>();
				row.put("id", rs.getString("id"));
				row.put("kind", rs.getString("kind"));
				row.put("title", rs.getString("title"));
				row.put("body", rs.getString("body"));
				row.put("link", rs.getString("link"));
				row.put("createdAt", rs.getTimestamp("created_at").toInstant());
				row.put("read", rs.getTimestamp("read_at") != null);
				return row;
			});
	}

	public int unreadCount(String userId) {
		Integer n = jdbc.queryForObject(
			"select count(*) from user_notifications where user_id = :user and read_at is null", Map.of("user", userId), Integer.class);
		return n == null ? 0 : n;
	}

	/** Marks one notification (or all of mine when id is null) as read. */
	public void markRead(String userId, String idRaw) {
		MapSqlParameterSource p = new MapSqlParameterSource().addValue("user", userId).addValue("now", Timestamp.from(Instant.now()));
		if (idRaw == null) {
			jdbc.update("update user_notifications set read_at = :now where user_id = :user and read_at is null", p);
			return;
		}
		UUID id;
		try {
			id = UUID.fromString(idRaw.trim());
		} catch (Exception e) {
			throw new NotFoundException("Notification not found");
		}
		jdbc.update("update user_notifications set read_at = :now where id = :id and user_id = :user and read_at is null",
			p.addValue("id", id));
	}

	private static MapSqlParameterSource params(String userId, String slug) {
		return new MapSqlParameterSource().addValue("user", userId).addValue("slug", slug == null ? "" : slug.trim());
	}
}
