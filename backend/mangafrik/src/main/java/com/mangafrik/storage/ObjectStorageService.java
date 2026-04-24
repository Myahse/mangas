package com.mangafrik.storage;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;

public interface ObjectStorageService {
	String put(String key, String contentType, InputStream body, long contentLength) throws IOException;
	StoredObject get(String key) throws IOException;
	Optional<StoredObjectMetadata> head(String key);

	record StoredObject(String key, String contentType, long contentLength, InputStream body) {}
	record StoredObjectMetadata(String key, String contentType, long contentLength) {}
}

