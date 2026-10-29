package com.mangafriq.storage;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;

/**
 * Fallback implementation used when no object storage is configured.
 * Storage endpoints should be considered unavailable in this mode.
 * Chosen by {@link com.mangafriq.storage.r2.R2Config#objectStorageService}.
 */
public class NoopStorageService implements ObjectStorageService {
	@Override
	public String put(String key, String contentType, InputStream body, long contentLength) throws IOException {
		throw new IOException("Object storage is not configured");
	}

	@Override
	public StoredObject get(String key) throws IOException {
		throw new IOException("Object storage is not configured");
	}

	@Override
	public Optional<StoredObjectMetadata> head(String key) {
		return Optional.empty();
	}
}

