package com.mangafrik.config;

import java.util.HashMap;
import java.util.Map;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
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

	private record ParsedJdbcUrl(String jdbcUrl, String username, String password) {}

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		String dsUrl = environment.getProperty("spring.datasource.url");
		String springDatasourceUrl = environment.getProperty("SPRING_DATASOURCE_URL");
		String jdbcDatabaseUrl = environment.getProperty("JDBC_DATABASE_URL");
		String databaseUrl = environment.getProperty("DATABASE_URL");

		logger.info("spring.datasource.url: {}", dsUrl);
		logger.info("SPRING_DATASOURCE_URL: {}", springDatasourceUrl);
		logger.info("JDBC_DATABASE_URL: {}", jdbcDatabaseUrl);
		logger.info("DATABASE_URL: {}", databaseUrl);

		String candidate = firstNonBlank(dsUrl, springDatasourceUrl, jdbcDatabaseUrl, databaseUrl);
		if (candidate == null) return;
		if (candidate.startsWith("jdbc:") && dsUrl != null && dsUrl.startsWith("jdbc:")) return;

		String trimmed = candidate.trim();
		ParsedJdbcUrl parsed = parseToJdbc(trimmed);
		if (parsed == null || parsed.jdbcUrl() == null || parsed.jdbcUrl().isBlank()) return;

		String masked = parsed.jdbcUrl().replaceAll("://[^:]+:[^@]+@", "://****:****@");
		logger.info("normalized datasource url: {}", masked);

		Map<String, Object> map = new HashMap<>();
		map.put("spring.datasource.url", parsed.jdbcUrl());
		map.put("spring.datasource.hikari.jdbc-url", parsed.jdbcUrl());
		if (parsed.username() != null && !parsed.username().isBlank()) {
			map.put("spring.datasource.username", parsed.username());
		}
		if (parsed.password() != null && !parsed.password().isBlank()) {
			map.put("spring.datasource.password", parsed.password());
		}
		map.putIfAbsent("spring.datasource.driver-class-name", "org.postgresql.Driver");
		map.putIfAbsent("spring.sql.init.platform", "postgres");
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

	private ParsedJdbcUrl parseToJdbc(String url) {
		if (url == null || url.isBlank()) return null;
		if (url.startsWith("jdbc:")) {
			// JDBC URL may already include user/password via properties/env; don't try to parse.
			return new ParsedJdbcUrl(url, null, null);
		}

		// Support Render/Neon style URLs:
		// postgresql://user:password@host:port/database?sslmode=require
		// postgres://user:password@host:port/database?sslmode=require
		String schemeNormalized = url;
		if (schemeNormalized.startsWith("postgres://")) {
			schemeNormalized = "postgresql://" + schemeNormalized.substring("postgres://".length());
		}

		if (!schemeNormalized.startsWith("postgresql://")) {
			// Fallback: do the old behavior, but it's best-effort.
			return new ParsedJdbcUrl("jdbc:" + url, null, null);
		}

		try {
			String queryString = "";
			int queryIndex = schemeNormalized.indexOf('?');
			String urlWithoutQuery = schemeNormalized;
			if (queryIndex > 0) {
				queryString = schemeNormalized.substring(queryIndex);
				urlWithoutQuery = schemeNormalized.substring(0, queryIndex);
			}

			// URI can't parse custom schemes with userinfo reliably for all cases, so swap scheme.
			URI dbUri = new URI(urlWithoutQuery.replace("postgresql://", "http://"));

			String username = null;
			String password = null;
			if (dbUri.getUserInfo() != null && !dbUri.getUserInfo().isBlank()) {
				String[] userInfo = dbUri.getUserInfo().split(":", 2);
				username = URLDecoder.decode(userInfo[0], StandardCharsets.UTF_8);
				if (userInfo.length > 1) {
					password = URLDecoder.decode(userInfo[1], StandardCharsets.UTF_8);
				}
			}

			String host = dbUri.getHost();
			int port = dbUri.getPort() > 0 ? dbUri.getPort() : 5432;
			String database = dbUri.getPath() != null ? dbUri.getPath().replaceFirst("/", "") : "";

			String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s%s", host, port, database, queryString);
			return new ParsedJdbcUrl(jdbcUrl, username, password);
		} catch (Exception e) {
			logger.error("Failed to parse DATABASE_URL: {}", e.getMessage());
			// If parsing fails, keep best-effort fallback rather than hard fail boot.
			return new ParsedJdbcUrl("jdbc:" + url, null, null);
		}
	}

	@Override
	public int getOrder() {
		// Run early.
		logger.info("getOrder: {}", Ordered.HIGHEST_PRECEDENCE);
		return Ordered.HIGHEST_PRECEDENCE;
	}
}

