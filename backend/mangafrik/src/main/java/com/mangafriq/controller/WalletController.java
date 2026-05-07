package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.wallet.WalletDtos.DailyClaimResponse;
import com.mangafriq.dto.wallet.WalletDtos.DailyClaimStatusResponse;
import com.mangafriq.dto.wallet.WalletDtos.PendingReferralRewardDto;
import com.mangafriq.dto.wallet.WalletDtos.ReferralInfo;
import com.mangafriq.dto.wallet.WalletDtos.WalletDto;
import com.mangafriq.dto.wallet.WalletDtos.ClaimReferralRewardResponse;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.wallet.WalletService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(AppConstants.API_V1 + "/wallet")
public class WalletController {
	private final WalletService walletService;

	public WalletController(WalletService walletService) {
		this.walletService = walletService;
	}

	@GetMapping
	public WalletDto wallet() {
		UUID uid = requireUserId();
		return walletService.wallet(uid.toString());
	}

	@PostMapping("/daily-claim")
	public DailyClaimResponse dailyClaim() {
		UUID uid = requireUserId();
		return walletService.dailyClaim(uid.toString());
	}

	@GetMapping("/daily-claim/status")
	public DailyClaimStatusResponse dailyClaimStatus() {
		UUID uid = requireUserId();
		return walletService.dailyClaimStatus(uid.toString());
	}

	@GetMapping("/referral")
	public ReferralInfo referral() {
		UUID uid = requireUserId();
		String code = walletService.getOrCreateReferralCode(uid.toString());
		String link = walletService.referralLinkForCode(code);
		return new ReferralInfo(code, link);
	}

	@GetMapping("/referral/pending")
	public List<PendingReferralRewardDto> pendingReferralRewards() {
		UUID uid = requireUserId();
		return walletService.listPendingReferralRewards(uid.toString());
	}

	@PostMapping("/referral/pending/{id}/claim")
	public ClaimReferralRewardResponse claimReferral(@PathVariable String id) {
		UUID uid = requireUserId();
		return walletService.claimReferralReward(uid.toString(), id);
	}

	private static UUID requireUserId() {
		return SecurityUtils.getCurrentUserId()
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
	}
}

