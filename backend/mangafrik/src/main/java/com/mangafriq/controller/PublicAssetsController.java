package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/assets")
public class PublicAssetsController {
	@Value("${app.creator.logo.path:}")
	private String creatorPanelLogoPath;

	@GetMapping(value = "/creator-panel-logo.png", produces = MediaType.IMAGE_PNG_VALUE)
	public ResponseEntity<byte[]> creatorPanelLogo() throws Exception {
		String p = creatorPanelLogoPath == null ? "" : creatorPanelLogoPath.trim();
		if (p.isBlank()) {
			return ResponseEntity.notFound().build();
		}
		byte[] bytes = Files.readAllBytes(Path.of(p));
		return ResponseEntity.ok()
			.cacheControl(CacheControl.noCache())
			.contentType(MediaType.IMAGE_PNG)
			.body(bytes);
	}
}

