package com.mangafriq.services.catalog;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pushes creator-panel published episodes into public catalog {@code chapters} / {@code pages}
 * so the main app can list and read them (it only queries those tables, not {@code creator_published_episodes}).
 */
@Service
@Slf4j
public class CatalogChapterSyncService {
	private final NamedParameterJdbcTemplate jdbc;

	public CatalogChapterSyncService(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	/**
	 * Resolves {@code manga} by exact title (case-insensitive) or by slug derived from series title
	 * (same rules as admin publish / {@code AdminStore#slugify}).
	 */
	@Transactional
	public void syncCreatorEpisodeToCatalog(
			String seriesTitle,
			String episodeTitle,
			List<Map<String, Object>> images,
			Instant publishedAt
	) {
		if (seriesTitle == null || seriesTitle.isBlank()) {
			log.debug("Catalog sync skipped: empty series title");
			return;
		}
		if (images == null || images.isEmpty()) {
			log.debug("Catalog sync skipped: no images for series={}", seriesTitle);
			return;
		}
		String slug = slugify(seriesTitle);
		String t = seriesTitle.trim();
		MapSqlParameterSource lookup = new MapSqlParameterSource().addValue("title", t);
		String lookupSql = slug.isBlank()
				? """
				select id from manga
				where lower(trim(title)) = lower(trim(:title))
				limit 1
				"""
				: """
				select id from manga
				where lower(trim(title)) = lower(trim(:title))
				   or slug = :slug
				limit 1
				""";
		if (!slug.isBlank()) {
			lookup.addValue("slug", slug);
		}
		List<UUID> mangaIds = jdbc.query(lookupSql, lookup, (rs, i) -> (UUID) rs.getObject("id"));
		if (mangaIds.isEmpty()) {
			log.warn(
					"Catalog sync skipped: no manga row for seriesTitle='{}'. Use the same title as the submitted série, or slug '{}'.",
					t,
					slug);
			return;
		}
		UUID mangaId = mangaIds.get(0);

		List<Integer> maxRows = jdbc.query(
				"""
				select coalesce(max(number), 0) as m from chapters where manga_id = :manga_id
				""",
				new MapSqlParameterSource("manga_id", mangaId),
				(rs, i) -> rs.getInt("m"));
		int maxNum = maxRows.isEmpty() ? 0 : maxRows.get(0);
		int nextNum = maxNum + 1;

		String pubDate = publishedAt != null
				? publishedAt.atZone(java.time.ZoneOffset.UTC).toLocalDate().toString()
				: java.time.LocalDate.now(java.time.ZoneOffset.UTC).toString();
		Instant now = Instant.now();
		String epTitle = episodeTitle == null ? "" : episodeTitle.trim();

		UUID chapterId = UUID.randomUUID();
		int insertedPages = 0;
		for (Map<String, Object> img : images) {
			String url = extractUrl(img);
			if (url != null && !url.isBlank()) {
				insertedPages++;
			}
		}
		if (insertedPages == 0) {
			log.warn("Catalog sync skipped: no image URLs for seriesTitle={}", t);
			return;
		}

		jdbc.update(
				"""
				insert into chapters (id, manga_id, number, title, published_date, pages_count, created_at, updated_at)
				values (:id, :manga_id, :number, :title, :published_date, :pages_count, :created_at, :updated_at)
				""",
				new MapSqlParameterSource()
						.addValue("id", chapterId)
						.addValue("manga_id", mangaId)
						.addValue("number", nextNum)
						.addValue("title", epTitle)
						.addValue("published_date", pubDate)
						.addValue("pages_count", insertedPages)
						.addValue("created_at", Timestamp.from(now))
						.addValue("updated_at", Timestamp.from(now)));

		int pageNum = 1;
		for (Map<String, Object> img : images) {
			String url = extractUrl(img);
			if (url == null || url.isBlank()) {
				continue;
			}
			UUID pageId = UUID.randomUUID();
			jdbc.update(
					"""
					insert into pages (id, chapter_id, number, url, created_at)
					values (:id, :chapter_id, :number, :url, :created_at)
					""",
					new MapSqlParameterSource()
							.addValue("id", pageId)
							.addValue("chapter_id", chapterId)
							.addValue("number", pageNum++)
							.addValue("url", url.trim())
							.addValue("created_at", Timestamp.from(now)));
		}
		log.info(
				"Catalog sync: mangaId={} chapter#{} pages={} (seriesTitle={})",
				mangaId,
				nextNum,
				insertedPages,
				t);
	}

	private static String extractUrl(Map<String, Object> img) {
		if (img == null) {
			return null;
		}
		Object u = img.get("url");
		return u == null ? null : String.valueOf(u);
	}

	/** Same normalization as {@code AdminStore#slugify}. */
	static String slugify(String input) {
		if (input == null) {
			return "";
		}
		return input.toLowerCase()
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("(^-|-$)", "");
	}
}
