package com.mangafriq;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@Slf4j
public class Application {

	public static void main(String[] args) {
		loadDotEnvIfPresent();

		SpringApplication app = new SpringApplication(Application.class);
		Map<String, Object> defaults = new HashMap<>();

		String normalized = normalizeToJdbc(firstNonBlank(
			System.getenv("SPRING_DATASOURCE_URL"),
			System.getenv("JDBC_DATABASE_URL"),
			System.getenv("DATABASE_URL"),
			System.getProperty("SPRING_DATASOURCE_URL"),
			System.getProperty("JDBC_DATABASE_URL"),
			System.getProperty("DATABASE_URL")
		));

		if (normalized != null) {
			defaults.put("spring.datasource.url", normalized);
			defaults.put("spring.datasource.hikari.jdbc-url", normalized);
			defaults.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
		}

		app.setDefaultProperties(defaults);
		app.run(args);
	}

	private static void loadDotEnvIfPresent() {
		try {
			loadEnvFileIfPresent(Path.of(".env"));
			loadEnvFileIfPresent(Path.of(".env.local"));
		} catch (Exception e) {
			log.warn("Failed to load .env: {}", e.toString());
		}
	}

	private static void loadEnvFileIfPresent(Path env) throws Exception {
		if (!Files.isRegularFile(env)) return;

		for (String rawLine : Files.readAllLines(env, StandardCharsets.UTF_8)) {
			String line = rawLine == null ? "" : rawLine.trim();
			if (line.isEmpty() || line.startsWith("#")) continue;

			int eq = line.indexOf('=');
			if (eq <= 0) continue;

			String key = line.substring(0, eq).trim();
			String value = line.substring(eq + 1).trim();

		
			if (value.length() >= 2) {
				char a = value.charAt(0);
				char b = value.charAt(value.length() - 1);
				if ((a == '"' && b == '"') || (a == '\'' && b == '\'')) {
					value = value.substring(1, value.length() - 1);
				}
			}

			if (key.isBlank()) continue;
			if (System.getenv(key) != null) continue; 
			if (System.getProperty(key) != null) continue; 

			System.setProperty(key, value);

		
			if ("SPRING_PROFILES_ACTIVE".equals(key) && System.getProperty("spring.profiles.active") == null) {
				System.setProperty("spring.profiles.active", value);
			}
		}
	}

	private static String firstNonBlank(String... candidates) {
		if (candidates == null) return null;
		for (String c : candidates) {
			if (c != null && !c.isBlank()) return c;
		}
		return null;
	}

	private static String normalizeToJdbc(String url) {
		if (url == null || url.isBlank()) return null;
		String trimmed = url.trim();
		if (trimmed.startsWith("jdbc:")) return trimmed;
		if (trimmed.startsWith("postgresql://")) return "jdbc:" + trimmed;
		if (trimmed.startsWith("postgres://")) return "jdbc:postgresql://" + trimmed.substring("postgres://".length());
		return "jdbc:" + trimmed;
	}

}
