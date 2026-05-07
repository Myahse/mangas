package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.services.config.FeatureFlagService;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/admin/feature-flags")
public class AdminFeatureFlagsController {
	private final FeatureFlagService featureFlags;

	@Value("${app.coins.rewards.enabled:true}")
	private boolean rewardsEnabledDefault;

	@Value("${app.coins.payments.enabled:false}")
	private boolean paymentsEnabledDefault;

	public AdminFeatureFlagsController(FeatureFlagService featureFlags) {
		this.featureFlags = featureFlags;
	}

	@GetMapping
	public Map<String, Boolean> list() {
		return featureFlags.list(
			new String[] {"coins.rewards.enabled", "coins.payments.enabled"},
			Map.of(
				"coins.rewards.enabled", rewardsEnabledDefault,
				"coins.payments.enabled", paymentsEnabledDefault
			)
		);
	}

	public record UpdateFlagRequest(String key, Boolean enabled) {}

	@PatchMapping
	public Map<String, Boolean> update(@RequestBody UpdateFlagRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		if (req.key() == null || req.key().trim().isBlank()) throw new IllegalArgumentException("key is required");
		if (req.enabled() == null) throw new IllegalArgumentException("enabled is required");
		featureFlags.set(req.key(), req.enabled());
		return list();
	}
}

