package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.media.LiteImageService;
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
import java.util.regex.Pattern;
import org.springframework.core.io.ByteArrayResource;
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
	private final LiteImageService liteImages;

	public StorageController(
		ObjectStorageService storage,
		MangaImageNormalizeService mangaImageNormalizeService,
		MangaArchiveImportService mangaArchiveImportService,
		LiteImageService liteImages
	) {
		this.storage = storage;
		this.mangaImageNormalizeService = mangaImageNormalizeService;
		this.mangaArchiveImportService = mangaArchiveImportService;
		this.liteImages = liteImages;
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

	/** Keys written by {@link #storeBytes} end in a random UUID, so their content never changes. */
	private static final Pattern IMMUTABLE_KEY = Pattern.compile(
		".*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\\.[A-Za-z0-9]+)?$");

	/** {@code ?lite=1}: data-saver copy of an image (smaller JPEG), see {@link LiteImageService}. */
	@GetMapping("/{*key}")
	public ResponseEntity<org.springframework.core.io.Resource> download(
		@PathVariable String key,
		@RequestParam(required = false) String lite
	) throws IOException {

		String normalizedKey = key != null && key.startsWith("/") ? key.substring(1) : key;
		boolean wantLite = "1".equals(lite) || "true".equalsIgnoreCase(lite);

		var headers = new HttpHeaders();
		headers.setCacheControl(IMMUTABLE_KEY.matcher(normalizedKey).matches()
			? "private, max-age=31536000, immutable"
			: "private, max-age=0, must-revalidate");

		if (wantLite) {
			LiteImageService.Lite cached = liteImages.cached(normalizedKey);
			if (cached != null) return bytesResponse(headers, cached);
		}

		ObjectStorageService.StoredObject obj;
		try {
			obj = storage.get(normalizedKey);
		} catch (IOException e) {
			if (e.getCause() instanceof NoSuchKeyException) {
				throw new NotFoundException("File not found: " + normalizedKey);
			}
			throw e;
		}

		// Size guard: never decode very large files in memory, just serve them as they are.
		if (wantLite && LiteImageService.isLiteCandidate(obj.contentType())
			&& obj.contentLength() >= 0 && obj.contentLength() <= 15L * 1024 * 1024) {
			byte[] original;
			try (var in = obj.body()) {
				original = in.readAllBytes();
			}
			LiteImageService.Lite made = liteImages.create(normalizedKey, original, obj.contentType());
			return bytesResponse(headers, made != null ? made : new LiteImageService.Lite(original, obj.contentType()));
		}

		headers.set(HttpHeaders.CONTENT_TYPE, obj.contentType());
		if (obj.contentLength() >= 0) headers.setContentLength(obj.contentLength());

		return ResponseEntity.ok()
			.headers(headers)
			.body(new org.springframework.core.io.InputStreamResource(obj.body()));
	}

	private static ResponseEntity<org.springframework.core.io.Resource> bytesResponse(
		HttpHeaders headers, LiteImageService.Lite lite
	) {
		headers.set(HttpHeaders.CONTENT_TYPE, lite.contentType());
		headers.setContentLength(lite.bytes().length);
		return ResponseEntity.ok().headers(headers).body(new ByteArrayResource(lite.bytes()));
	}
}
