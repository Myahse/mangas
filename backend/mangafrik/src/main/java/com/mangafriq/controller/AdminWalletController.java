package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.wallet.WalletDtos.AdminGrantCoinsRequest;
import com.mangafriq.dto.wallet.WalletDtos.AdminGrantCoinsResponse;
import com.mangafriq.services.wallet.WalletService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/admin/wallet")
public class AdminWalletController {
	private final WalletService walletService;

	public AdminWalletController(WalletService walletService) {
		this.walletService = walletService;
	}

	@PostMapping("/grant")
	public AdminGrantCoinsResponse grant(@RequestBody AdminGrantCoinsRequest req) {
		return walletService.adminGrant(req);
	}
}

