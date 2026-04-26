package com.mangafrik.services.email.templates;

import java.util.Map;

public final class WelcomeEmailTemplate {
	private WelcomeEmailTemplate() {}

	public static String subject() {
		return "Bienvenue sur MangAfrik";
	}

	public static String text(String displayName, String appUrl) {
		String name = safe(displayName, "là");
		String url = safe(appUrl, "https://mangafrik.com");
		return String.join("\n\n",
				"Bonjour " + name + ",",
				"Bienvenue sur MangAfrik !",
				"Découvre des mangas, suis tes créateurs préférés, et rejoins la communauté.",
				"Commencer: " + url,
				"— L’équipe MangAfrik"
		);
	}

	/**
	 * Loads HTML from `src/main/resources/email/welcome.html`.
	 * Placeholders:
	 * - {{displayName}}
	 * - {{appUrl}}
	 */
	public static String html(String displayName, String appUrl) {
		String name = escapeHtml(safe(displayName, "là"));
		String url = escapeHtmlAttr(safe(appUrl, "https://mangafrik.com"));

		return EmailTemplateRenderer.render(
				"email/welcome.html",
				Map.of(
						"displayName", name,
						"appUrl", url,
						"logoUrl", url + "/favicon.svg"
				),
				"<html><body><p>Bienvenue, {{displayName}}</p><p><a href=\"{{appUrl}}\">Commencer</a></p></body></html>"
		);
	}

	private static String safe(String s, String fallback) {
		if (s == null) return fallback;
		String t = s.trim();
		return t.isEmpty() ? fallback : t;
	}

	private static String escapeHtml(String s) {
		return s.replace("&", "&amp;")
				.replace("<", "&lt;")
				.replace(">", "&gt;")
				.replace("\"", "&quot;")
				.replace("'", "&#39;");
	}

	private static String escapeHtmlAttr(String s) {
		// Good enough for href attribute in this use-case.
		return escapeHtml(s);
	}
}

