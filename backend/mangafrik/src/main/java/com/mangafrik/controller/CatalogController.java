package com.mangafrik.controller;

import com.mangafrik.constants.AppConstants;
import com.mangafrik.dto.ChapterDto;
import com.mangafrik.dto.MangaDto;
import com.mangafrik.dto.PageDto;
import com.mangafrik.services.catalog.CatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1)
public class CatalogController {
	private final CatalogService catalogService;

	public CatalogController(CatalogService catalogService) {
		this.catalogService = catalogService;
	}

	@GetMapping("/manga")
	public List<MangaDto> listAllManga() {
		return catalogService.listAll();
	}

	@GetMapping("/manga/{slug}")
	public MangaDto getManga(@PathVariable String slug) {
		return catalogService.getBySlug(slug);
	}

	@GetMapping("/manga/featured")
	public List<MangaDto> featured() {
		return catalogService.featured();
	}

	@GetMapping("/manga/popular")
	public List<MangaDto> popular(@RequestParam(defaultValue = "10") int count) {
		return catalogService.popular(count);
	}

	@GetMapping("/manga/latest")
	public List<MangaDto> latest(@RequestParam(defaultValue = "12") int count) {
		return catalogService.latest(count);
	}

	@GetMapping("/genres")
	public List<String> genres() {
		return catalogService.listGenres();
	}

	@GetMapping("/manga/{slug}/chapters")
	public List<ChapterDto> chapters(@PathVariable String slug) {
		return catalogService.chapters(slug);
	}

	@GetMapping("/manga/{slug}/chapters/{chapterNumber}/pages")
	public List<PageDto> pages(@PathVariable String slug, @PathVariable int chapterNumber) {
		return catalogService.pages(slug, chapterNumber);
	}
}

