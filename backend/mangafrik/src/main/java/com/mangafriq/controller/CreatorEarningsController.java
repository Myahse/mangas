package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.finance.CreatorEarningsService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Creator revenue: the creator's earnings and payout requests (/creator, creator roles), and the
 * finance team's payout queue (/finance, admin only).
 */
@RestController
@RequestMapping(AppConstants.API_V1)
public class CreatorEarningsController {
	private final CreatorEarningsService earnings;

	public CreatorEarningsController(CreatorEarningsService earnings) {
		this.earnings = earnings;
	}

	public record PayoutRequest(BigDecimal amountXof, String method, String phone) {}

	public record ProcessRequest(String reference, String note) {}

	@GetMapping("/creator/earnings")
	public Map<String, Object> myEarnings() {
		return earnings.summary(email());
	}

	@PostMapping("/creator/payouts")
	public Map<String, Object> requestPayout(@RequestBody PayoutRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		return earnings.requestPayout(email(), req.amountXof(), req.method(), req.phone());
	}

	@GetMapping("/finance/creator-payouts")
	public List<Map<String, Object>> payouts(@RequestParam(required = false) String status) {
		return earnings.payouts(null, status);
	}

	@PostMapping("/finance/creator-payouts/{id}/paid")
	public Map<String, Object> markPaid(@PathVariable String id, @RequestBody ProcessRequest req) {
		return earnings.markPaid(id, req == null ? null : req.reference(), email());
	}

	@PostMapping("/finance/creator-payouts/{id}/reject")
	public Map<String, Object> reject(@PathVariable String id, @RequestBody(required = false) ProcessRequest req) {
		return earnings.reject(id, req == null ? null : req.note(), email());
	}

	private static String email() {
		return SecurityUtils.getCurrentUserEmail().orElseThrow(() -> new IllegalArgumentException("unauthorized"));
	}
}
