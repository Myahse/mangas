package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.services.creator.CreatorContractService;
import com.mangafriq.services.creator.CreatorContractService.ContractView;
import com.mangafriq.services.creator.CreatorContractService.SignContractRequest;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/creator-contracts")
public class CreatorContractController {
	private final CreatorContractService service;

	public CreatorContractController(CreatorContractService service) {
		this.service = service;
	}

	@GetMapping("/{token}")
	public ContractView get(@PathVariable String token) {
		return service.getByToken(token);
	}

	@PostMapping("/{token}/sign")
	public ResponseEntity<?> sign(@PathVariable String token, @RequestBody SignContractRequest req, HttpServletRequest http) {
		try {
			String ip = http.getRemoteAddr();
			String ua = http.getHeader("User-Agent");
			return ResponseEntity.ok(service.signByToken(token, req, ip, ua));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}
}

