package com.mangafrik.controller;

import com.mangafrik.constants.AppConstants;
import com.mangafrik.dto.admin.AdminDtos.CreatorRequestDto;
import com.mangafrik.dto.creator.CreatorRequestDtos.SubmitCreatorRequest;
import com.mangafrik.services.creator.CreatorRequestService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/creator-requests")
public class CreatorRequestController {
	private final CreatorRequestService service;

	public CreatorRequestController(CreatorRequestService service) {
		this.service = service;
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
}

