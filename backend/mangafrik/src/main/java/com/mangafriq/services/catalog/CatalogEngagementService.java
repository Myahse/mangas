package com.mangafriq.services.catalog;

import com.mangafriq.dto.ChapterDto;
import com.mangafriq.dto.MangaDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.creator.EpisodeStore;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reader-driven views/likes — creators cannot boost their own série stats. */
@Service
public class CatalogEngagementService {
	private final CatalogService catalogService;
	private final EpisodeStore episodeStore;
	private final NamedParameterJdbcTemplate jdbc;

	public CatalogEngagementService(
			CatalogService catalogService,
			EpisodeStore episodeStore,
			NamedParameterJdbcTemplate jdbc) {
		this.catalogService = catalogService;
		this.episodeStore = episodeStore;
		this.jdbc = jdbc;
	}

	@Transactional
	public void recordChapterView(String slug, int chapterNumber, String viewerEmail) {
		EngagementTarget target = resolveTarget(slug, chapterNumber);
		if (isSeriesOwner(target.seriesTitle(), viewerEmail)) {
			return;
		}
		episodeStore.findPublishedEpisodeIdByTitles(target.seriesTitle(), target.episodeTitle())
				.ifPresent(episodeStore::incrementView);
		jdbc.update(
				"update manga set views = coalesce(views, 0) + 1 where slug = :slug",
				new MapSqlParameterSource("slug", slug));
	}

	@Transactional
	public void recordChapterLike(String slug, int chapterNumber, String viewerEmail) {
		EngagementTarget target = resolveTarget(slug, chapterNumber);
		if (isSeriesOwner(target.seriesTitle(), viewerEmail)) {
			return;
		}
		episodeStore.findPublishedEpisodeIdByTitles(target.seriesTitle(), target.episodeTitle())
				.ifPresent(episodeStore::addLike);
	}

	private EngagementTarget resolveTarget(String slug, int chapterNumber) {
		MangaDto manga = catalogService.getBySlug(slug);
		List<ChapterDto> chapters = catalogService.chapters(slug);
		ChapterDto chapter = chapters.stream()
				.filter(c -> c.number() == chapterNumber)
				.findFirst()
				.orElseThrow(() -> new NotFoundException("Chapitre introuvable"));
		return new EngagementTarget(manga.title(), chapter.title() == null ? "" : chapter.title().trim());
	}

	private boolean isSeriesOwner(String seriesTitle, String viewerEmail) {
		if (viewerEmail == null || viewerEmail.isBlank() || seriesTitle == null || seriesTitle.isBlank()) {
			return false;
		}
		Integer owned = jdbc.queryForObject(
				"""
				select count(*)::int
				from creator_manga_submissions
				where lower(trim(creator_email)) = lower(trim(:email))
				  and lower(trim(payload->>'title')) = lower(trim(:title))
				""",
				new MapSqlParameterSource()
						.addValue("email", viewerEmail.trim())
						.addValue("title", seriesTitle.trim()),
				Integer.class);
		return owned != null && owned > 0;
	}

	private record EngagementTarget(String seriesTitle, String episodeTitle) {}
}
