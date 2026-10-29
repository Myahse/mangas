package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.store.StoreDtos.CoinPacksResponse;
import com.mangafriq.dto.store.StoreDtos.CreatePurchaseIntentRequest;
import com.mangafriq.dto.store.StoreDtos.PurchaseIntentDto;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.store.CoinStoreService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/store")
public class CoinStoreController {
	private final CoinStoreService store;

	public CoinStoreController(CoinStoreService store) {
		this.store = store;
	}

	@GetMapping("/coin-packs")
	public CoinPacksResponse packs() {
		return new CoinPacksResponse(store.paymentsEnabled(), store.coinPacks());
	}

	@PostMapping("/coin-purchase-intents")
	public PurchaseIntentDto createIntent(@RequestBody CreatePurchaseIntentRequest req) {
		var uid = SecurityUtils.getCurrentUserIdString().orElseThrow(() -> new IllegalArgumentException("unauthorized"));
		return store.createIntent(uid, req);
	}

	/** Polled by the store page after GeniusPay sends the reader back. */
	@GetMapping("/coin-purchase-intents/{id}")
	public PurchaseIntentDto intent(@PathVariable String id) {
		var uid = SecurityUtils.getCurrentUserIdString().orElseThrow(() -> new IllegalArgumentException("unauthorized"));
		return store.getIntent(uid, id);
	}
}

