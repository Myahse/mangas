package com.mangafriq.services.config;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class FeatureFlagService {
	private static final Duration CACHE_TTL = Duration.ofSeconds(2);

	private final NamedParameterJdbcTemplate jdbc;
	private final ConcurrentHashMap<String, CachedBool> cache = new ConcurrentHashMap<>();

	public FeatureFlagService(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public boolean isEnabled(String key, boolean fallback) {
		String k = normalizeKey(key);
		CachedBool cached = cache.get(k);
		if (cached != null && Duration.between(cached.at(), Instant.now()).compareTo(CACHE_TTL) < 0) {
			return cached.value();
		}
		Boolean v = readFlag(k);
		boolean out = v != null ? v : fallback;
		cache.put(k, new CachedBool(out, Instant.now()));
		return out;
	}

	public Map<String, Boolean> list(String[] keys, Map<String, Boolean> fallbacks) {
		java.util.LinkedHashMap<String, Boolean> out = new java.util.LinkedHashMap<>();
		for (String k : keys) {
			boolean fb = fallbacks != null && fallbacks.containsKey(k) ? Boolean.TRUE.equals(fallbacks.get(k)) : false;
			out.put(k, isEnabled(k, fb));
		}
		return out;
	}

	public void set(String key, boolean enabled) {
		String k = normalizeKey(key);
		try {
			jdbc.update("""
					insert into app_feature_flags (key, enabled, updated_at)
					values (:key, :enabled, :updated_at)
					on conflict (key) do update
					  set enabled = excluded.enabled,
					      updated_at = excluded.updated_at
					""",
				new MapSqlParameterSource()
					.addValue("key", k)
					.addValue("enabled", enabled)
					.addValue("updated_at", Timestamp.from(Instant.now()))
			);
		} catch (BadSqlGrammarException e) {
			throw new IllegalArgumentException(
				"Feature flags table is missing (app_feature_flags). Restart backend to apply Flyway migrations.",
				e
			);
		}
		cache.put(k, new CachedBool(enabled, Instant.now()));
	}

	private Boolean readFlag(String key) {
		try {
			return jdbc.queryForObject("""
					select enabled
					from app_feature_flags
					where key = :key
					limit 1
					""", Map.of("key", key), Boolean.class);
		} catch (Exception ignored) {
			return null;
		}
	}

	private static String normalizeKey(String raw) {
		String s = raw == null ? "" : raw.trim();
		if (s.isBlank()) throw new IllegalArgumentException("key is required");
		return s;
	}

	private record CachedBool(boolean value, Instant at) {}
}

