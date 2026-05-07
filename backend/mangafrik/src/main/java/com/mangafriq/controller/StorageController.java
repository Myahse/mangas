package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.storage.ObjectStorageService;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

@RestController
@RequestMapping(AppConstants.API_V1 + "/storage")
public class StorageController {
	private final ObjectStorageService storage;

	public StorageController(ObjectStorageService storage) {
		this.storage = storage;
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Map<String, Object> upload(
		@RequestPart("file") MultipartFile file,
		@RequestParam(required = false) String prefix
	) throws IOException {
		String safePrefix = (prefix == null ? "" : prefix.trim());
		if (!safePrefix.isEmpty() && !safePrefix.endsWith("/")) safePrefix = safePrefix + "/";

		String original = file.getOriginalFilename();
		String ext = "";
		if (StringUtils.hasText(original) && original.contains(".")) {
			ext = original.substring(original.lastIndexOf('.'));
		}

		String key = safePrefix + UUID.randomUUID() + ext;
		String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();

		storage.put(key, contentType, file.getInputStream(), file.getSize());

		return Map.of(
			"key", key,
			"contentType", contentType,
			"size", file.getSize(),
			"url", AppConstants.API_V1 + "/storage/" + key
		);
	}


	@GetMapping("/{*key}")
	public ResponseEntity<org.springframework.core.io.InputStreamResource> download(@PathVariable String key) throws IOException {

		String normalizedKey = key != null && key.startsWith("/") ? key.substring(1) : key;

		ObjectStorageService.StoredObject obj;
		try {
			obj = storage.get(normalizedKey);
		} catch (IOException e) {
		
			if (e.getCause() instanceof NoSuchKeyException) {
				throw new NotFoundException("File not found: " + normalizedKey);
			}
			throw e;
		}

		var headers = new HttpHeaders();
		headers.set(HttpHeaders.CONTENT_TYPE, obj.contentType());
		if (obj.contentLength() >= 0) headers.setContentLength(obj.contentLength());
		headers.setCacheControl("private, max-age=0, must-revalidate");

		return ResponseEntity.ok()
			.headers(headers)
			.body(new org.springframework.core.io.InputStreamResource(obj.body()));
	}
}

