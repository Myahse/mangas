package com.mangafrik.controller;

import com.mangafrik.constants.AppConstants;
import java.util.Map;
import com.mangafrik.services.HealthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1)
public class HealthController {
	private final HealthService healthService;

	public HealthController(HealthService healthService) {
		this.healthService = healthService;
	}

	@GetMapping("/health")
	public Map<String, Object> health() {
		return Map.of("status", healthService.status());
	}
}

