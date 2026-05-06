package com.mangafriq.services.email.templates;

import java.time.Year;
import java.util.Map;

public final class WelcomeEmailTemplate {
	private WelcomeEmailTemplate() {}

	public static String subject() {
		return "Bienvenue sur MangAfriq";
	}

	public static String text(String displayName, String appUrl) {
		String name = safe(displayName, "là");
		String url = safe(appUrl, "http://localhost:5173");
		return String.join("\n\n",
				"Bonjour " + name + ",",
				"Bienvenue sur MangAfriq !",
				"Découvre des mangas, suis tes créateurs préférés, et rejoins la communauté.",
				"Commencer: " + url,
				"— L’équipe MangAfriq"
		);
	}

	public static String html(String displayName, String appUrl, String logoUrlAbsolute) {
		String name = escapeHtml(safe(displayName, "là"));
		String base = normalizeBase(safe(appUrl, "http://localhost:5173"));
		String href = escapeHtmlAttr(base);
		String logo = escapeHtmlAttr(safeLogo(logoUrlAbsolute, base));

		return EmailTemplateRenderer.render(
				"email/welcome.html",
				Map.of(
						"displayName", name,
						"appUrl", href,
						"logoUrl", logo,
						"year", String.valueOf(Year.now().getValue())
				),
				"<html><body style=\"background:#fff7ed;padding:16px\"><div style=\"max-width:600px;margin:0 auto;background:#fff;padding:24px\"><p>Bienvenue, "
						+ name
						+ "</p><p><a href=\""
						+ href
						+ "\" style=\"color:#ff6a00\">Commencer</a></p></div></body></html>"
		);
	}

	private static String normalizeBase(String appUrl) {
		String u = appUrl == null ? "" : appUrl.trim();
		if (u.isEmpty()) return "http://localhost:5173";
		return u.replaceAll("/+$", "");
	}

	private static String safeLogo(String logoUrlAbsolute, String baseNoSlash) {
		if (logoUrlAbsolute != null && !logoUrlAbsolute.trim().isBlank()) {
			return logoUrlAbsolute.trim();
		}
		return baseNoSlash + "/magafrik-logo.png";
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
		return escapeHtml(s);
	}
}
