package com.mangafrik.config;

import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Render/Neon commonly provide DATABASE_URL in URL form (postgresql://...),
 * while Spring JDBC expects spring.datasource.url to start with jdbc:...
 */
public class DatabaseUrlEnvPostProcessor implements EnvironmentPostProcessor, Ordered {
	private static final String PROPERTY_SOURCE_NAME = "databaseUrlEnvPostProcessor";
	private static final Logger logger = LoggerFactory.getLogger(DatabaseUrlEnvPostProcessor.class);

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		String raw = environment.getProperty("DATABASE_URL");
		logger.info("DATABASE_URL: {}", raw);
		if (raw == null || raw.isBlank()) return;

		String dsUrl = environment.getProperty("spring.datasource.url");
		logger.info("spring.datasource.url: {}", dsUrl);
		if (dsUrl != null && !dsUrl.isBlank() && dsUrl.startsWith("jdbc:")) return;

		String normalized = normalizeToJdbc(raw.trim());
		logger.info("normalized: {}", normalized);
		if (normalized == null) return;

		Map<String, Object> map = new HashMap<>();
		map.put("spring.datasource.url", normalized);
		environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, map));
		logger.info("Added spring.datasource.url to environment");
	}

	private String normalizeToJdbc(String url) {
		if (url.startsWith("jdbc:")) return url;
		if (url.startsWith("postgresql://")) return "jdbc:" + url;
		if (url.startsWith("postgres://")) return "jdbc:postgresql://" + url.substring("postgres://".length());
		logger.info("url: {}", url);
		logger.info("normalized: {}", "jdbc:" + url);
		return "jdbc:" + url;
	}

	@Override
	public int getOrder() {
		// Run early.
		logger.info("getOrder: {}", Ordered.HIGHEST_PRECEDENCE);
		return Ordered.HIGHEST_PRECEDENCE;
	}
}

