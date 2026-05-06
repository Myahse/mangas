package com.mangafriq.services.email.templates;

import java.time.Year;
import java.util.Map;

public final class PasswordResetEmailTemplate {
	private PasswordResetEmailTemplate() {}

	public static String subject() {
		return "Réinitialisation de votre mot de passe";
	}

	public static String text(String displayName, String resetUrl) {
		String name = displayName == null || displayName.isBlank() ? "" : displayName.trim();
		return String.join("\n\n",
				(name.isEmpty() ? "Bonjour," : "Bonjour " + name + ","),
				"Nous avons reçu une demande de réinitialisation de mot de passe.",
				"Pour choisir un nouveau mot de passe, ouvrez ce lien :",
				resetUrl,
				"Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.",
				"— L’équipe MangAfriq"
		);
	}

	public static String html(String displayName, String resetUrl, String appUrl, String logoUrlAbsolute) {
		String name = escapeHtml(displayName == null || displayName.isBlank() ? "là" : displayName.trim());
		String url = escapeHtmlAttr(resetUrl);

		String rawBase = appUrl == null ? "" : appUrl.trim();
		if (rawBase.isBlank()) rawBase = "http://localhost:5173";
		rawBase = rawBase.replaceAll("/+$", "");
		String logoRaw = (logoUrlAbsolute != null && !logoUrlAbsolute.trim().isBlank())
				? logoUrlAbsolute.trim()
				: rawBase + "/magafrik-logo.png";

		return EmailTemplateRenderer.render(
				"email/password-reset.html",
				Map.of(
						"displayName", name,
						"resetUrl", url,
						"appUrl", escapeHtmlAttr(rawBase),
						"logoUrl", escapeHtmlAttr(logoRaw),
						"year", String.valueOf(Year.now().getValue())
				),
				"<html><body style=\"background:#fff7ed;padding:16px\"><div style=\"max-width:600px;margin:0 auto;background:#fff;padding:24px\"><p>Bonjour "
						+ name
						+ ",</p><p><a href=\""
						+ url
						+ "\" style=\"color:#ff6a00\">Réinitialiser</a></p></div></body></html>"
		);
	}

	private static String escapeHtml(String s) {
		return s.replace("&", "&amp;")
				.replace("<", "&lt;")
				.replace(">", "&gt;")
				.replace("\"", "&quot;")
				.replace("'", "&#39;");
	}

	private static String escapeHtmlAttr(String s) {
		return escapeHtml(s == null ? "" : s);
	}
}
