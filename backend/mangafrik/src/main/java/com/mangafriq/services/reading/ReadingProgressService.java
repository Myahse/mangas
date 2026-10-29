package com.mangafriq.services.reading;

import com.mangafriq.dto.reading.ReadingDtos.ReadingProgressDto;
import com.mangafriq.dto.reading.ReadingDtos.SaveProgressRequest;
import com.mangafriq.exception.NotFoundException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

/** Last position per reader and series, so the reader site and apps can offer "Reprendre la lecture". */
@Service
public class ReadingProgressService {
	private final NamedParameterJdbcTemplate jdbc;

	public ReadingProgressService(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public void save(String userId, String slugRaw, SaveProgressRequest req) {
		String slug = slugRaw == null ? "" : slugRaw.trim();
		if (slug.isBlank()) throw new IllegalArgumentException("slug is required");
		if (req == null || req.chapterNumber() == null || req.chapterNumber() < 1) {
			throw new IllegalArgumentException("chapterNumber is required");
		}
		int pageCount = req.pageCount() == null ? 0 : Math.max(0, Math.min(req.pageCount(), 10_000));
		int page = req.page() == null ? 0 : Math.max(0, req.page());
		if (pageCount > 0) page = Math.min(page, pageCount - 1);

		int rows = jdbc.update("""
				insert into reading_progress (user_id, manga_slug, chapter_number, page_index, page_count, updated_at)
				select :user_id, m.slug, :chapter, :page, :page_count, now()
				from manga m
				where m.slug = :slug
				on conflict (user_id, manga_slug) do update
				set chapter_number = excluded.chapter_number,
				    page_index = excluded.page_index,
				    page_count = excluded.page_count,
				    updated_at = excluded.updated_at
				""", new MapSqlParameterSource()
			.addValue("user_id", userId)
			.addValue("slug", slug)
			.addValue("chapter", req.chapterNumber())
			.addValue("page", page)
			.addValue("page_count", pageCount));
		if (rows == 0) throw new NotFoundException("Manga not found");
	}

	public List<ReadingProgressDto> recent(String userId, int limitRaw) {
		int limit = Math.max(1, Math.min(limitRaw, 50));
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select
				  rp.manga_slug as slug,
				  m.title,
				  m.cover,
				  rp.chapter_number,
				  rp.page_index,
				  rp.page_count,
				  rp.updated_at,
				  coalesce(lc.latest, 0) as latest_chapter,
				  nc.next_chapter
				from reading_progress rp
				join manga m on m.slug = rp.manga_slug
				left join lateral (
				  select max(c.number) as latest from chapters c where c.manga_id = m.id
				) lc on true
				left join lateral (
				  select min(c.number) as next_chapter from chapters c
				  where c.manga_id = m.id and c.number > rp.chapter_number
				) nc on true
				where rp.user_id = :user_id
				order by rp.updated_at desc
				limit :limit
				""", new MapSqlParameterSource().addValue("user_id", userId).addValue("limit", limit));
		return rows.stream().map(ReadingProgressService::toDto).toList();
	}

	private static ReadingProgressDto toDto(Map<String, Object> row) {
		int chapter = ((Number) row.get("chapter_number")).intValue();
		int page = ((Number) row.get("page_index")).intValue();
		int pageCount = ((Number) row.get("page_count")).intValue();
		int latest = ((Number) row.get("latest_chapter")).intValue();
		Integer next = row.get("next_chapter") == null ? null : ((Number) row.get("next_chapter")).intValue();
		boolean finishedChapter = pageCount > 0 && page >= pageCount - 1;

		int resumeChapter = chapter;
		int resumePage = page;
		if (finishedChapter && next != null) {
			resumeChapter = next;
			resumePage = 0;
		}
		Object updated = row.get("updated_at");
		return new ReadingProgressDto(
			String.valueOf(row.get("slug")),
			row.get("title") == null ? "" : String.valueOf(row.get("title")),
			row.get("cover") == null ? null : String.valueOf(row.get("cover")),
			chapter,
			page,
			pageCount,
			latest,
			resumeChapter,
			resumePage,
			finishedChapter && next == null,
			updated instanceof Timestamp ts ? ts.toInstant() : Instant.now()
		);
	}
}
