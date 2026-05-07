package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.ChapterDto;
import com.mangafriq.dto.MangaDto;
import com.mangafriq.dto.PageDto;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.catalog.CatalogService;
import com.mangafriq.services.wallet.WalletService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(AppConstants.API_V1)
public class CatalogController {
	private final CatalogService catalogService;
	private final WalletService walletService;

	public CatalogController(CatalogService catalogService, WalletService walletService) {
		this.catalogService = catalogService;
		this.walletService = walletService;
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
		var uid = SecurityUtils.getCurrentUserId()
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized"));
		boolean ok = walletService.hasChapterEntitlement(uid.toString(), slug, chapterNumber);
		if (!ok) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Locked: unlock chapter");
		}
		return catalogService.pages(slug, chapterNumber);
	}
}

