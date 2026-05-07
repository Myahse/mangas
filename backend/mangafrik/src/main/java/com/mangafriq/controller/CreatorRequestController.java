package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.admin.AdminDtos.CreatorRequestDto;
import com.mangafriq.dto.creator.CreatorRequestDtos.SubmitCreatorRequest;
import com.mangafriq.services.creator.CreatorContractService;
import com.mangafriq.services.creator.CreatorRequestService;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.mangafriq.security.SessionAuthFilter.SessionPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping(AppConstants.API_V1 + "/creator-requests")
public class CreatorRequestController {
	private final CreatorRequestService service;
	private final CreatorContractService contractService;

	public CreatorRequestController(CreatorRequestService service, CreatorContractService contractService) {
		this.service = service;
		this.contractService = contractService;
	}

	@PostMapping
	public ResponseEntity<?> submit(@RequestBody SubmitCreatorRequest req) {
		try {
			CreatorRequestDto res = service.submit(req);
			return ResponseEntity.ok(res);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@GetMapping("/me")
	public ResponseEntity<?> me(Authentication authentication) {
		if (authentication == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

		String email = null;
		Object principal = authentication.getPrincipal();
		if (principal instanceof SessionPrincipal sp) {
			email = sp.email();
		} else if (principal instanceof Jwt jwt) {
			email = jwt.getClaimAsString("email");
			if (email == null || email.isBlank()) email = jwt.getSubject();
		} else if (authentication.getName() != null && !authentication.getName().isBlank()) {
			email = authentication.getName();
		}

		if (email == null || email.isBlank() || !email.contains("@")) {
			return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
		}
		return service
			.findLatestByEmail(email)
			.<ResponseEntity<?>>map(ResponseEntity::ok)
			.orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "not found")));
	}

	@GetMapping("/me/contract")
	public ResponseEntity<?> myContract(Authentication authentication) {
		ResponseEntity<?> me = me(authentication);
		if (!me.getStatusCode().is2xxSuccessful() || !(me.getBody() instanceof CreatorRequestDto dto)) {
			return me;
		}
		try {
			return ResponseEntity.ok(contractService.latestStatusForCreatorRequest(dto.id()));
		} catch (Exception e) {
			return ResponseEntity.status(404).body(Map.of("error", "not found"));
		}
	}
}

