package com.mangafrik.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * Parse Render/Neon style DATABASE_URL:
 * postgresql://user:password@host:port/database?sslmode=require
 *
 * Postgres JDBC does not accept userinfo in the host part (user:pass@host),
 * so we convert it to a proper jdbc:postgresql://host:port/db?...
 * and set username/password separately.
 */
@Configuration
@Profile("postgres")
public class NeonDatabaseConfig {
	private static final Logger logger = LoggerFactory.getLogger(NeonDatabaseConfig.class);

	@Value("${DATABASE_URL:}")
	private String databaseUrl;

	@Value("${SPRING_DATASOURCE_URL:}")
	private String springDatasourceUrlEnv;

	@Value("${JDBC_DATABASE_URL:}")
	private String jdbcDatabaseUrlEnv;

	@Value("${spring.datasource.url:}")
	private String springDatasourceUrlProp;

	@Value("${spring.datasource.username:}")
	private String springDatasourceUsername;

	@Value("${spring.datasource.password:}")
	private String springDatasourcePassword;

	@Bean
	@Primary
	public DataSource dataSource() {
		String candidate = firstNonBlank(
			springDatasourceUrlProp,
			springDatasourceUrlEnv,
			jdbcDatabaseUrlEnv,
			databaseUrl
		);

		if (candidate == null) {
			throw new IllegalStateException(
				"No database URL found. Set DATABASE_URL (preferred) or SPRING_DATASOURCE_URL/JDBC_DATABASE_URL."
			);
		}

		if (candidate.startsWith("jdbc:")) {
			logger.info("Using JDBC datasource URL from environment/properties (masked).");
			return DataSourceBuilder.create()
				.driverClassName("org.postgresql.Driver")
				.url(candidate)
				.username(blankToNull(springDatasourceUsername))
				.password(blankToNull(springDatasourcePassword))
				.build();
		}

		String normalized = candidate;
		if (normalized.startsWith("postgres://")) {
			normalized = "postgresql://" + normalized.substring("postgres://".length());
		}

		if (!normalized.startsWith("postgresql://")) {
			// Best-effort fallback
			logger.warn("Unknown DB URL scheme; prefixing with jdbc: (may not work).");
			return DataSourceBuilder.create()
				.driverClassName("org.postgresql.Driver")
				.url("jdbc:" + candidate)
				.username(blankToNull(springDatasourceUsername))
				.password(blankToNull(springDatasourcePassword))
				.build();
		}

		try {
			String queryString = "";
			int queryIndex = normalized.indexOf('?');
			String urlWithoutQuery = normalized;
			if (queryIndex > 0) {
				queryString = normalized.substring(queryIndex);
				urlWithoutQuery = normalized.substring(0, queryIndex);
			}

			URI dbUri = new URI(urlWithoutQuery.replace("postgresql://", "http://"));

			String username = null;
			String password = null;
			if (dbUri.getUserInfo() != null && !dbUri.getUserInfo().isBlank()) {
				String[] userInfo = dbUri.getUserInfo().split(":", 2);
				username = URLDecoder.decode(userInfo[0], StandardCharsets.UTF_8);
				if (userInfo.length > 1) password = URLDecoder.decode(userInfo[1], StandardCharsets.UTF_8);
			}

			String host = dbUri.getHost();
			int port = dbUri.getPort() > 0 ? dbUri.getPort() : 5432;
			String database = dbUri.getPath() != null ? dbUri.getPath().replaceFirst("/", "") : "";

			String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s%s", host, port, database, queryString);
			logger.info("Using DATABASE_URL parsed to JDBC (masked).");

			return DataSourceBuilder.create()
				.driverClassName("org.postgresql.Driver")
				.url(jdbcUrl)
				.username(firstNonBlank(username, springDatasourceUsername))
				.password(firstNonBlank(password, springDatasourcePassword))
				.build();
		} catch (Exception e) {
			throw new IllegalStateException("Failed to parse DATABASE_URL. Check its format.", e);
		}
	}

	private static String blankToNull(String s) {
		return (s == null || s.isBlank()) ? null : s;
	}

	private static String firstNonBlank(String... candidates) {
		if (candidates == null) return null;
		for (String c : candidates) {
			if (c != null && !c.isBlank()) return c;
		}
		return null;
	}
}

