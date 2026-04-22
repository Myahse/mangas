package com.mangafrik.services.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mangafrik.dto.ChapterDto;
import com.mangafrik.dto.MangaDto;
import com.mangafrik.dto.PageDto;
import com.mangafrik.exception.NotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {

	private static final Duration RELOAD_TTL = Duration.ofSeconds(5);

	private final ObjectMapper objectMapper;
	private final AtomicReference<CatalogSnapshot> snapshot = new AtomicReference<>();

	public CatalogService(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public List<MangaDto> listAll() {
		return load().manga();
	}

	public MangaDto getBySlug(String slug) {
		return load().manga().stream()
				.filter(m -> Objects.equals(m.slug(), slug))
				.findFirst()
				.orElseThrow(() -> new NotFoundException("Manga introuvable : " + slug));
	}

	public List<String> listGenres() {
		return load().genres();
	}

	public List<MangaDto> featured() {
		return load().manga().stream().filter(MangaDto::featured).toList();
	}

	public List<MangaDto> popular(int count) {
		return load().manga().stream()
				.sorted(Comparator.comparingDouble(MangaDto::rating).reversed())
				.limit(Math.max(0, count))
				.toList();
	}

	public List<MangaDto> latest(int count) {
		return load().manga().stream()
				.sorted(Comparator.comparingInt((MangaDto m) -> Optional.ofNullable(m.latestChapter()).map(lc -> lc.number()).orElse(0)).reversed())
				.limit(Math.max(0, count))
				.toList();
	}

	public List<ChapterDto> chapters(String slug) {
		MangaDto manga = getBySlug(slug);
		int total = manga.totalChapters();
		int max = Math.min(total, 50);
		return java.util.stream.IntStream.range(0, max)
				.mapToObj(i -> {
					int num = total - max + i + 1;
					Integer localCount = manga.localChapters() == null ? null : manga.localChapters().get(String.valueOf(num));
					return new ChapterDto(
							num,
							"Chapitre " + num,
							(num == total) ? "Il y a 2 jours" : (num == total - 1) ? "Il y a 1 semaine" : ("Il y a " + ((num % 28) + 1) + " jours"),
							localCount != null ? localCount : (18 + (num % 10))
					);
				})
				.sorted(Comparator.comparingInt(ChapterDto::number).reversed())
				.toList();
	}

	public List<PageDto> pages(String slug, int chapterNumber) {
		MangaDto manga = getBySlug(slug);
		Integer localCount = manga.localChapters() == null ? null : manga.localChapters().get(String.valueOf(chapterNumber));
		if (localCount != null && localCount > 0) {
			return java.util.stream.IntStream.range(0, localCount)
					.mapToObj(i -> {
						int num = i + 1;
						String padded = String.format("%03d", num);
						return new PageDto(num, "/chapters/" + slug + "/" + chapterNumber + "/" + padded + ".jpg");
					})
					.toList();
		}

		return java.util.stream.IntStream.range(0, 20)
				.mapToObj(i -> new PageDto(i + 1, "https://picsum.photos/seed/" + slug + "-ch" + chapterNumber + "-p" + (i + 1) + "/800/1200"))
				.toList();
	}

	private CatalogSnapshot load() {
		CatalogSnapshot current = snapshot.get();
		if (current != null && Duration.between(current.loadedAt(), Instant.now()).compareTo(RELOAD_TTL) < 0) {
			return current;
		}

		CatalogSnapshot next = readSnapshot();
		snapshot.set(next);
		return next;
	}

	private CatalogSnapshot readSnapshot() {
		// Dev-friendly: prefer reading the repo's front/public/db.json if present.
		Path devPath = Path.of("..", "..", "front", "public", "db.json").normalize();
		try (InputStream in = open(devPath)) {
			CatalogFile file = objectMapper.readValue(in, CatalogFile.class);
			return new CatalogSnapshot(Instant.now(), file.manga(), file.genres());
		} catch (IOException ex) {
			throw new IllegalStateException("Unable to load catalog db.json", ex);
		}
	}

	private InputStream open(Path devPath) throws IOException {
		if (Files.exists(devPath)) {
			return Files.newInputStream(devPath);
		}
		return new ClassPathResource("db.json").getInputStream();
	}

	// Jackson mapping class
	public record CatalogFile(List<MangaDto> manga, List<String> genres) {}

	private record CatalogSnapshot(Instant loadedAt, List<MangaDto> manga, List<String> genres) {}
}

