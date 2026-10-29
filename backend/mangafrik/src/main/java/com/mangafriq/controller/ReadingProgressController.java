package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.reading.ReadingDtos.ReadingProgressDto;
import com.mangafriq.dto.reading.ReadingDtos.SaveProgressRequest;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.reading.ReadingProgressService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/reading-progress")
public class ReadingProgressController {
	private final ReadingProgressService progress;

	public ReadingProgressController(ReadingProgressService progress) {
		this.progress = progress;
	}

	/** Most recently read series first. */
	@GetMapping
	public List<ReadingProgressDto> recent(@RequestParam(defaultValue = "8") int limit) {
		return progress.recent(currentUserId(), limit);
	}

	@PutMapping("/{slug}")
	public Map<String, String> save(@PathVariable String slug, @RequestBody SaveProgressRequest req) {
		progress.save(currentUserId(), slug, req);
		return Map.of("status", "ok");
	}

	private static String currentUserId() {
		return SecurityUtils.getCurrentUserIdString().orElseThrow(() -> new IllegalArgumentException("unauthorized"));
	}
}
