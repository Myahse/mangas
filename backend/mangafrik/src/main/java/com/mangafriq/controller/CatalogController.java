package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.ChapterDto;
import com.mangafriq.dto.MangaDto;
import com.mangafriq.dto.PageDto;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.catalog.CatalogEngagementService;
import com.mangafriq.services.catalog.CatalogService;
import com.mangafriq.services.wallet.WalletService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(AppConstants.API_V1)
public class CatalogController {
	private final CatalogService catalogService;
	private final WalletService walletService;
	private final CatalogEngagementService catalogEngagementService;

	public CatalogController(
			CatalogService catalogService,
			WalletService walletService,
			CatalogEngagementService catalogEngagementService) {
		this.catalogService = catalogService;
		this.walletService = walletService;
		this.catalogEngagementService = catalogEngagementService;
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
		var uid = SecurityUtils.getCurrentUserIdString()
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized"));
		boolean ok = chapterNumber <= 1
				|| walletService.hasMangaEntitlement(uid, slug)
				|| walletService.hasChapterEntitlement(uid, slug, chapterNumber);
		if (!ok) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Locked: unlock chapter");
		}
		return catalogService.pages(slug, chapterNumber);
	}

	/** Count a view when a logged-in reader opens chapter pages (not available to the série owner). */
	@PostMapping("/manga/{slug}/chapters/{chapterNumber}/view")
	public Map<String, String> recordChapterView(@PathVariable String slug, @PathVariable int chapterNumber) {
		String email = SecurityUtils.getCurrentUserEmail().orElse("");
		catalogEngagementService.recordChapterView(slug, chapterNumber, email);
		return Map.of("status", "ok");
	}
}

