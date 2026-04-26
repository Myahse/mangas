package com.mangafrik.services.email.templates;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;

public final class EmailTemplateRenderer {
	private EmailTemplateRenderer() {}

	public static String render(String classpathPath, Map<String, String> variables, String fallbackHtml) {
		String template = loadOr(classpathPath, fallbackHtml);
		String out = template;
		if (variables != null) {
			for (Map.Entry<String, String> e : variables.entrySet()) {
				String key = e.getKey() == null ? "" : e.getKey().trim();
				if (key.isEmpty()) continue;
				String value = e.getValue() == null ? "" : e.getValue();
				out = out.replace("{{" + key + "}}", value);
			}
		}
		return out;
	}

	private static String loadOr(String classpathPath, String fallbackHtml) {
		try {
			ClassPathResource r = new ClassPathResource(classpathPath);
			byte[] bytes = r.getInputStream().readAllBytes();
			return new String(bytes, StandardCharsets.UTF_8);
		} catch (Exception e) {
			return fallbackHtml;
		}
	}
}

