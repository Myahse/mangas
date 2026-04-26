package com.mangafrik.services.email.templates;

import java.util.Map;

public final class CreatorCredentialsEmailTemplate {
	private CreatorCredentialsEmailTemplate() {}

	public static String subject() {
		return "Vos identifiants Créateur";
	}

	public static String html(String displayName, String email, String temporaryPassword, String loginUrl, String logoUrl) {
		return EmailTemplateRenderer.render(
				"email/creator-credentials.html",
				Map.of(
						"displayName", escapeHtml(displayName),
						"email", escapeHtml(email),
						"temporaryPassword", escapeHtml(temporaryPassword),
						"loginUrl", escapeHtmlAttr(loginUrl),
						"logoUrl", escapeHtmlAttr(logoUrl)
				),
				"<html><body><p>Bonjour {{displayName}}</p><p>Email: {{email}}</p><p>Mot de passe: {{temporaryPassword}}</p><p><a href=\"{{loginUrl}}\">Connexion</a></p></body></html>"
		);
	}

	public static String text(String displayName, String email, String temporaryPassword, String loginUrl) {
		String name = safe(displayName, "là");
		return String.join("\n\n",
				"Bonjour " + name + ",",
				"Votre compte Créateur MangAfrik a été créé.",
				"Email: " + (email == null ? "" : email),
				"Mot de passe temporaire: " + (temporaryPassword == null ? "" : temporaryPassword),
				"Connexion: " + (loginUrl == null ? "" : loginUrl),
				"Important: vous devrez changer votre mot de passe lors de votre première connexion.",
				"— L’équipe MangAfrik"
		);
	}

	private static String safe(String s, String fallback) {
		if (s == null) return fallback;
		String t = s.trim();
		return t.isEmpty() ? fallback : t;
	}

	private static String escapeHtml(String s) {
		if (s == null) return "";
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

