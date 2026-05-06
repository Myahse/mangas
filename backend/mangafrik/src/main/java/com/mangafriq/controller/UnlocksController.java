package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.wallet.WalletDtos.UnlockChapterRequest;
import com.mangafriq.dto.wallet.WalletDtos.UnlockMangaRequest;
import com.mangafriq.dto.wallet.WalletDtos.UnlockResponse;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.wallet.WalletService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/unlocks")
public class UnlocksController {
	private final WalletService walletService;

	public UnlocksController(WalletService walletService) {
		this.walletService = walletService;
	}

	@PostMapping("/manga")
	public UnlockResponse unlockManga(@RequestBody UnlockMangaRequest req) {
		var uid = SecurityUtils.getCurrentUserId().orElseThrow(() -> new IllegalArgumentException("unauthorized"));
		String slug = req == null ? "" : req.mangaSlug();
		return walletService.unlockManga(uid.toString(), slug);
	}

	@PostMapping("/chapter")
	public UnlockResponse unlockChapter(@RequestBody UnlockChapterRequest req) {
		var uid = SecurityUtils.getCurrentUserId().orElseThrow(() -> new IllegalArgumentException("unauthorized"));
		if (req == null) throw new IllegalArgumentException("payload is required");
		return walletService.unlockChapter(uid.toString(), req.mangaSlug(), req.chapterNumber());
	}
}

