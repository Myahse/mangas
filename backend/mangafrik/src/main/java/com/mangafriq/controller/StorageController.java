package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.media.MangaArchiveImportService;
import com.mangafriq.services.media.MangaImageNormalizeService;
import com.mangafriq.services.media.MangaNormalizeProfile;
import com.mangafriq.storage.ObjectStorageService;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
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
	private final MangaImageNormalizeService mangaImageNormalizeService;
	private final MangaArchiveImportService mangaArchiveImportService;

	public StorageController(
		ObjectStorageService storage,
		MangaImageNormalizeService mangaImageNormalizeService,
		MangaArchiveImportService mangaArchiveImportService
	) {
		this.storage = storage;
		this.mangaImageNormalizeService = mangaImageNormalizeService;
		this.mangaArchiveImportService = mangaArchiveImportService;
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Map<String, Object> upload(
		@RequestPart("file") MultipartFile file,
		@RequestParam(required = false) String prefix,
		@RequestParam(required = false) String normalize
	) throws IOException {
		String safePrefix = normalizePrefix(prefix);
		byte[] payload;
		String ext;
		String contentType;

		if (StringUtils.hasText(normalize)) {
			MangaNormalizeProfile profile = MangaNormalizeProfile.fromParam(normalize);
			payload = mangaImageNormalizeService.normalizeBytes(file.getBytes(), profile);
			ext = ".jpg";
			contentType = "image/jpeg";
		} else {
			payload = file.getBytes();
			ext = extensionFromOriginal(file.getOriginalFilename());
			contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
		}

		return storeBytes(safePrefix, ext, contentType, payload);
	}

	@PostMapping(value = "/upload-manga-archive", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Map<String, Object> uploadMangaArchive(
		@RequestPart("file") MultipartFile file,
		@RequestParam(required = false) String prefix,
		@RequestParam(defaultValue = "episode_page") String normalize
	) throws IOException {
		String safePrefix = normalizePrefix(prefix);
		MangaNormalizeProfile profile = MangaNormalizeProfile.fromParam(normalize);
		List<byte[]> pages = mangaArchiveImportService.extractAndNormalizePages(file, profile);

		List<Map<String, Object>> uploaded = new ArrayList<>();
		for (byte[] page : pages) {
			uploaded.add(storeBytes(safePrefix, ".jpg", "image/jpeg", page));
		}
		return Map.of("pages", uploaded, "count", uploaded.size());
	}

	private Map<String, Object> storeBytes(String safePrefix, String ext, String contentType, byte[] payload)
		throws IOException {
		String key = safePrefix + UUID.randomUUID() + ext;
		storage.put(key, contentType, new ByteArrayInputStream(payload), payload.length);
		return Map.of(
			"key", key,
			"contentType", contentType,
			"size", payload.length,
			"url", AppConstants.API_V1 + "/storage/" + key
		);
	}

	private static String normalizePrefix(String prefix) {
		String safePrefix = prefix == null ? "" : prefix.trim();
		if (!safePrefix.isEmpty() && !safePrefix.endsWith("/")) {
			safePrefix = safePrefix + "/";
		}
		return safePrefix;
	}

	private static String extensionFromOriginal(String original) {
		if (StringUtils.hasText(original) && original.contains(".")) {
			return original.substring(original.lastIndexOf('.'));
		}
		return "";
	}

	@GetMapping("/{*key}")
	public ResponseEntity<org.springframework.core.io.InputStreamResource> download(@PathVariable String key)
		throws IOException {

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
