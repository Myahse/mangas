package com.mangafrik;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication
@Slf4j

public class Application {

	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(Application.class);
		Map<String, Object> defaults = new HashMap<>();


		String normalized = normalizeToJdbc(firstNonBlank(
			System.getenv("SPRING_DATASOURCE_URL"),
			System.getenv("JDBC_DATABASE_URL"),
			System.getenv("DATABASE_URL")
		));

		if (normalized != null) {
			defaults.put("spring.datasource.url", normalized);
			defaults.put("spring.datasource.hikari.jdbc-url", normalized);
			defaults.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
		}

		app.setDefaultProperties(defaults);
		app.run(args);
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
