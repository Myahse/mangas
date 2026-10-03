package com.mangafriq.services.media;

public enum MangaNormalizeProfile {
	EPISODE_PAGE(800, 1280, 2 * 1024 * 1024),
	THUMB_SQUARE(1080, 1080, 800 * 1024),
	THUMB_VERTICAL(1080, 1920, 800 * 1024);

	private final int width;
	private final int height;
	private final long maxBytes;

	MangaNormalizeProfile(int width, int height, long maxBytes) {
		this.width = width;
		this.height = height;
		this.maxBytes = maxBytes;
	}

	public int width() {
		return width;
	}

	public int height() {
		return height;
	}

	public long maxBytes() {
		return maxBytes;
	}

	public static MangaNormalizeProfile fromParam(String raw) {
		if (raw == null || raw.isBlank()) {
			throw new IllegalArgumentException("normalize profile required");
		}
		String v = raw.trim().toLowerCase().replace('-', '_');
		return switch (v) {
			case "episode_page", "episode", "page" -> EPISODE_PAGE;
			case "thumb_square", "square" -> THUMB_SQUARE;
			case "thumb_vertical", "vertical" -> THUMB_VERTICAL;
			default -> throw new IllegalArgumentException("Unknown normalize profile: " + raw);
		};
	}
}
