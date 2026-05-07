package com.mangafriq.services.catalog;

import com.mangafriq.dto.ChapterDto;
import com.mangafriq.dto.LatestChapterDto;
import com.mangafriq.dto.MangaDto;
import com.mangafriq.dto.PageDto;
import com.mangafriq.exception.NotFoundException;
import java.sql.Array;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {
	private final NamedParameterJdbcTemplate jdbc;

	public CatalogService(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<MangaDto> listAll() {
		return queryManga("""
				select
				  m.id,
				  m.title,
				  m.slug,
				  m.author,
				  m.artist,
				  m.cover,
				  m.banner,
				  m.hero_cover,
				  coalesce(array_agg(g.name) filter (where g.name is not null), '{}'::text[]) as genres,
				  coalesce(m.rating, 0)::float8 as rating,
				  coalesce(ch.total_chapters, 0) as total_chapters,
				  lc.number as latest_number,
				  lc.title as latest_title,
				  lc.published_date as latest_date,
				  coalesce(m.status, '') as status,
				  coalesce(m.views, 0)::text as views,
				  coalesce(m.synopsis, '') as synopsis,
				  coalesce(m.featured, false) as featured,
				  coalesce(m.year, 0) as year
				from manga m
				left join manga_genres mg on mg.manga_id = m.id
				left join genres g on g.id = mg.genre_id
				left join lateral (
				  select count(*) as total_chapters
				  from chapters c
				  where c.manga_id = m.id
				) ch on true
				left join lateral (
				  select number, title, published_date
				  from chapters c2
				  where c2.manga_id = m.id
				  order by number desc
				  limit 1
				) lc on true
				group by m.id, ch.total_chapters, lc.number, lc.title, lc.published_date
				order by m.created_at desc
				""",
			Map.of()
		);
	}

	public MangaDto getBySlug(String slug) {
		List<MangaDto> rows = queryManga("""
				select
				  m.id,
				  m.title,
				  m.slug,
				  m.author,
				  m.artist,
				  m.cover,
				  m.banner,
				  m.hero_cover,
				  coalesce(array_agg(g.name) filter (where g.name is not null), '{}'::text[]) as genres,
				  coalesce(m.rating, 0)::float8 as rating,
				  coalesce(ch.total_chapters, 0) as total_chapters,
				  lc.number as latest_number,
				  lc.title as latest_title,
				  lc.published_date as latest_date,
				  coalesce(m.status, '') as status,
				  coalesce(m.views, 0)::text as views,
				  coalesce(m.synopsis, '') as synopsis,
				  coalesce(m.featured, false) as featured,
				  coalesce(m.year, 0) as year
				from manga m
				left join manga_genres mg on mg.manga_id = m.id
				left join genres g on g.id = mg.genre_id
				left join lateral (
				  select count(*) as total_chapters
				  from chapters c
				  where c.manga_id = m.id
				) ch on true
				left join lateral (
				  select number, title, published_date
				  from chapters c2
				  where c2.manga_id = m.id
				  order by number desc
				  limit 1
				) lc on true
				where m.slug = :slug
				group by m.id, ch.total_chapters, lc.number, lc.title, lc.published_date
				""",
			Map.of("slug", slug)
		);
		if (rows.isEmpty()) throw new NotFoundException("Manga introuvable : " + slug);
		return rows.get(0);
	}

	public List<String> listGenres() {
		return jdbc.query("""
				select name
				from genres
				order by name asc
				""",
			Map.of(),
			(rs, i) -> rs.getString("name")
		);
	}

	public List<MangaDto> featured() {
		return queryManga("""
				select
				  m.id,
				  m.title,
				  m.slug,
				  m.author,
				  m.artist,
				  m.cover,
				  m.banner,
				  m.hero_cover,
				  coalesce(array_agg(g.name) filter (where g.name is not null), '{}'::text[]) as genres,
				  coalesce(m.rating, 0)::float8 as rating,
				  coalesce(ch.total_chapters, 0) as total_chapters,
				  lc.number as latest_number,
				  lc.title as latest_title,
				  lc.published_date as latest_date,
				  coalesce(m.status, '') as status,
				  coalesce(m.views, 0)::text as views,
				  coalesce(m.synopsis, '') as synopsis,
				  coalesce(m.featured, false) as featured,
				  coalesce(m.year, 0) as year
				from manga m
				left join manga_genres mg on mg.manga_id = m.id
				left join genres g on g.id = mg.genre_id
				left join lateral (
				  select count(*) as total_chapters
				  from chapters c
				  where c.manga_id = m.id
				) ch on true
				left join lateral (
				  select number, title, published_date
				  from chapters c2
				  where c2.manga_id = m.id
				  order by number desc
				  limit 1
				) lc on true
				where m.featured = true
				group by m.id, ch.total_chapters, lc.number, lc.title, lc.published_date
				order by m.created_at desc
				""",
			Map.of()
		);
	}

	public List<MangaDto> popular(int count) {
		return queryManga("""
				select
				  m.id,
				  m.title,
				  m.slug,
				  m.author,
				  m.artist,
				  m.cover,
				  m.banner,
				  m.hero_cover,
				  coalesce(array_agg(g.name) filter (where g.name is not null), '{}'::text[]) as genres,
				  coalesce(m.rating, 0)::float8 as rating,
				  coalesce(ch.total_chapters, 0) as total_chapters,
				  lc.number as latest_number,
				  lc.title as latest_title,
				  lc.published_date as latest_date,
				  coalesce(m.status, '') as status,
				  coalesce(m.views, 0)::text as views,
				  coalesce(m.synopsis, '') as synopsis,
				  coalesce(m.featured, false) as featured,
				  coalesce(m.year, 0) as year
				from manga m
				left join manga_genres mg on mg.manga_id = m.id
				left join genres g on g.id = mg.genre_id
				left join lateral (
				  select count(*) as total_chapters
				  from chapters c
				  where c.manga_id = m.id
				) ch on true
				left join lateral (
				  select number, title, published_date
				  from chapters c2
				  where c2.manga_id = m.id
				  order by number desc
				  limit 1
				) lc on true
				group by m.id, ch.total_chapters, lc.number, lc.title, lc.published_date
				order by m.rating desc
				limit :limit
				""",
			Map.of("limit", Math.max(0, count))
		);
	}

	public List<MangaDto> latest(int count) {
		return queryManga("""
				select
				  m.id,
				  m.title,
				  m.slug,
				  m.author,
				  m.artist,
				  m.cover,
				  m.banner,
				  m.hero_cover,
				  coalesce(array_agg(g.name) filter (where g.name is not null), '{}'::text[]) as genres,
				  coalesce(m.rating, 0)::float8 as rating,
				  coalesce(ch.total_chapters, 0) as total_chapters,
				  lc.number as latest_number,
				  lc.title as latest_title,
				  lc.published_date as latest_date,
				  coalesce(m.status, '') as status,
				  coalesce(m.views, 0)::text as views,
				  coalesce(m.synopsis, '') as synopsis,
				  coalesce(m.featured, false) as featured,
				  coalesce(m.year, 0) as year
				from manga m
				left join manga_genres mg on mg.manga_id = m.id
				left join genres g on g.id = mg.genre_id
				left join lateral (
				  select count(*) as total_chapters
				  from chapters c
				  where c.manga_id = m.id
				) ch on true
				left join lateral (
				  select number, title, published_date
				  from chapters c2
				  where c2.manga_id = m.id
				  order by number desc
				  limit 1
				) lc on true
				group by m.id, ch.total_chapters, lc.number, lc.title, lc.published_date
				order by coalesce(lc.number, 0) desc, m.created_at desc
				limit :limit
				""",
			Map.of("limit", Math.max(0, count))
		);
	}

	public List<ChapterDto> chapters(String slug) {
		UUID mangaId = getMangaIdBySlug(slug);
		return jdbc.query("""
				select number, coalesce(title, '') as title, coalesce(published_date, '') as published_date, pages_count
				from chapters
				where manga_id = :manga_id
				order by number desc
				limit 50
				""",
			Map.of("manga_id", mangaId),
			(rs, i) -> new ChapterDto(
				rs.getInt("number"),
				rs.getString("title"),
				rs.getString("published_date"),
				rs.getInt("pages_count")
			)
		);
	}

	public List<PageDto> pages(String slug, int chapterNumber) {
		UUID mangaId = getMangaIdBySlug(slug);
		UUID chapterId = jdbc.query("""
				select id
				from chapters
				where manga_id = :manga_id and number = :number
				""",
			Map.of("manga_id", mangaId, "number", chapterNumber),
			(rs, i) -> (UUID) rs.getObject("id")
		).stream().findFirst().orElse(null);
		if (chapterId == null) throw new NotFoundException("Chapitre introuvable");

		return jdbc.query("""
				select number, url
				from pages
				where chapter_id = :chapter_id
				order by number asc
				""",
			Map.of("chapter_id", chapterId),
			(rs, i) -> new PageDto(
				rs.getInt("number"),
				rs.getString("url")
			)
		);
	}

	private List<MangaDto> queryManga(String sql, Map<String, Object> params) {
		return jdbc.query(sql, params, (rs, i) -> {
			List<String> genres = readStringArrayAsList(rs.getArray("genres"));
			Integer latestNum = (Integer) rs.getObject("latest_number");
			String latestTitle = rs.getString("latest_title");
			String latestDate = rs.getString("latest_date");
			LatestChapterDto latest = latestNum == null ? null : new LatestChapterDto(latestNum, latestTitle == null ? "" : latestTitle, latestDate == null ? "" : latestDate);

			return new MangaDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("title"),
				rs.getString("slug"),
				rs.getString("author"),
				rs.getString("artist"),
				rs.getString("cover"),
				rs.getString("banner"),
				rs.getString("hero_cover"),
				genres,
				rs.getDouble("rating"),
				rs.getInt("total_chapters"),
				latest,
				rs.getString("status"),
				rs.getString("views"),
				rs.getString("synopsis"),
				rs.getBoolean("featured"),
				rs.getInt("year"),
				null
			);
		});
	}

	private UUID getMangaIdBySlug(String slug) {
		UUID id = jdbc.query("""
				select id
				from manga
				where slug = :slug
				""",
			Map.of("slug", slug),
			(rs, i) -> (UUID) rs.getObject("id")
		).stream().findFirst().orElse(null);
		if (id == null) throw new NotFoundException("Manga introuvable : " + slug);
		return id;
	}

	private static List<String> readStringArrayAsList(Array sqlArray) throws java.sql.SQLException {
		if (sqlArray == null) {
			return List.of();
		}
		Object raw = sqlArray.getArray();
		if (raw == null) {
			return List.of();
		}
		if (raw instanceof String[] sa) {
			return sa.length == 0 ? List.of() : java.util.Arrays.asList(sa);
		}
		if (raw instanceof Object[] oa) {
			return java.util.Arrays.stream(oa)
				.map(o -> o == null ? "" : o.toString())
				.toList();
		}
		return List.of();
	}
}

