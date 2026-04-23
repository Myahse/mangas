package com.mangafrik.config;

import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Render/Neon commonly provide DATABASE_URL in URL form (postgresql://...),
 * while Spring JDBC expects spring.datasource.url to start with jdbc:...
 */
public class DatabaseUrlEnvPostProcessor implements EnvironmentPostProcessor, Ordered {
	private static final String PROPERTY_SOURCE_NAME = "databaseUrlEnvPostProcessor";

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		String raw = environment.getProperty("DATABASE_URL");
		if (raw == null || raw.isBlank()) return;

		String dsUrl = environment.getProperty("spring.datasource.url");
		if (dsUrl != null && !dsUrl.isBlank() && dsUrl.startsWith("jdbc:")) return;

		String normalized = normalizeToJdbc(raw.trim());
		if (normalized == null) return;

		Map<String, Object> map = new HashMap<>();
		map.put("spring.datasource.url", normalized);
		environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, map));
	}

	private String normalizeToJdbc(String url) {
		if (url.startsWith("jdbc:")) return url;
		if (url.startsWith("postgresql://")) return "jdbc:" + url;
		if (url.startsWith("postgres://")) return "jdbc:postgresql://" + url.substring("postgres://".length());
		return null;
	}

	@Override
	public int getOrder() {
		// Run early.
		return Ordered.HIGHEST_PRECEDENCE;
	}
}

