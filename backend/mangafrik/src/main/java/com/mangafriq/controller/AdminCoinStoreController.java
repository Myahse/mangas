package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.store.StoreDtos.PurchaseIntentDto;
import com.mangafriq.services.store.CoinStoreService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/admin/store")
public class AdminCoinStoreController {
	private final CoinStoreService store;

	public AdminCoinStoreController(CoinStoreService store) {
		this.store = store;
	}

	@PostMapping("/coin-purchase-intents/{id}/mark-paid")
	public PurchaseIntentDto markPaid(@PathVariable String id) {
		return store.adminMarkPaid(id);
	}
}

