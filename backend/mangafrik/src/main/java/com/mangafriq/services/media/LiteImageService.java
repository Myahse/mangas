package com.mangafriq.services.media;

import java.io.IOException;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Data-saver page images ("?lite=1" on /storage): smaller JPEGs made on first request and kept in a
 * bounded in-memory LRU cache. Nothing is written back to object storage.
 */
@Service
@Slf4j
public class LiteImageService {
	static final int MAX_WIDTH = 600;
	static final float QUALITY = 0.6f;

	public record Lite(byte[] bytes, String contentType) {}

	private final MangaImageNormalizeService images;
	private final long budgetBytes;
	private final LinkedHashMap<String, Lite> cache = new LinkedHashMap<>(256, 0.75f, true);
	private long cachedBytes = 0;

	public LiteImageService(
			MangaImageNormalizeService images,
			@Value("${app.media.lite-cache-mb:64}") long cacheMb) {
		this.images = images;
		this.budgetBytes = Math.max(0, cacheMb) * 1024 * 1024;
	}

	/** Raster images only; SVG and GIF (possibly animated) are served as they are. */
	public static boolean isLiteCandidate(String contentType) {
		String t = contentType == null ? "" : contentType.toLowerCase();
		return t.startsWith("image/") && !t.contains("svg") && !t.contains("gif");
	}

	public synchronized Lite cached(String key) {
		return cache.get(key);
	}

	/** Makes and caches the lite copy (or keeps the original when it is already smaller); null if unreadable. */
	public Lite create(String key, byte[] original, String originalType) {
		byte[] bytes;
		try {
			bytes = images.liteCopy(original, MAX_WIDTH, QUALITY);
		} catch (IOException | RuntimeException e) {
			log.warn("Lite copy failed for {}: {}", key, e.getMessage());
			return null;
		}
		if (bytes == null) return null;
		Lite lite = bytes.length < original.length ? new Lite(bytes, "image/jpeg") : new Lite(original, originalType);
		store(key, lite);
		return lite;
	}

	private synchronized void store(String key, Lite value) {
		long size = value.bytes().length;
		if (size > budgetBytes) return;
		Lite previous = cache.put(key, value);
		if (previous != null) cachedBytes -= previous.bytes().length;
		cachedBytes += size;
		Iterator<Map.Entry<String, Lite>> it = cache.entrySet().iterator();
		while (cachedBytes > budgetBytes && it.hasNext()) {
			cachedBytes -= it.next().getValue().bytes().length;
			it.remove();
		}
	}
}
