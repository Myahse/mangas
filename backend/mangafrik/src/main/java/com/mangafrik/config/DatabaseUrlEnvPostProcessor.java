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
		String dsUrl = environment.getProperty("spring.datasource.url");
		String jdbcDatabaseUrl = environment.getProperty("JDBC_DATABASE_URL");
		String databaseUrl = environment.getProperty("DATABASE_URL");

		logger.info("spring.datasource.url: {}", dsUrl);
		logger.info("JDBC_DATABASE_URL: {}", jdbcDatabaseUrl);
		logger.info("DATABASE_URL: {}", databaseUrl);

		String candidate = firstNonBlank(dsUrl, jdbcDatabaseUrl, databaseUrl);
		if (candidate == null) return;
		if (candidate.startsWith("jdbc:") && dsUrl != null && dsUrl.startsWith("jdbc:")) return;

		String normalized = normalizeToJdbc(candidate.trim());
		logger.info("normalized datasource url: {}", normalized);
		if (normalized == null || normalized.isBlank()) return;

		Map<String, Object> map = new HashMap<>();
		map.put("spring.datasource.url", normalized);
		map.putIfAbsent("spring.datasource.driver-class-name", "org.postgresql.Driver");
		environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, map));
		logger.info("Added spring.datasource.url to environment");
	}

	private String firstNonBlank(String... candidates) {
		if (candidates == null) return null;
		for (String c : candidates) {
			if (c != null && !c.isBlank()) return c;
		}
		return null;
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

