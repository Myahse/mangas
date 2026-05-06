package com.mangafriq.services.email.templates;

import java.time.Year;
import java.util.Map;

public final class UserCredentialsEmailTemplate {
	private UserCredentialsEmailTemplate() {}

	public static String subject() {
		return "Vos identifiants";
	}

	public static String html(String displayName, String email, String temporaryPassword, String role, String loginUrl, String logoUrl) {
		return EmailTemplateRenderer.render(
				"email/user-credentials.html",
				Map.of(
						"displayName", escapeHtml(displayName),
						"email", escapeHtml(email),
						"temporaryPassword", escapeHtml(temporaryPassword),
						"role", escapeHtml(role),
						"loginUrl", escapeHtmlAttr(loginUrl),
						"logoUrl", escapeHtmlAttr(logoUrl),
						"year", String.valueOf(Year.now().getValue())
				),
				"<html><body>" +
						"<p>Bonjour {{displayName}}</p>" +
						"<p>Votre compte a été créé / mis à jour.</p>" +
						"<p><strong>Rôle</strong>: {{role}}</p>" +
						"<p><strong>Email</strong>: {{email}}</p>" +
						"<p><strong>Mot de passe temporaire</strong>: {{temporaryPassword}}</p>" +
						"<p><a href=\"{{loginUrl}}\">Se connecter</a></p>" +
						"</body></html>"
		);
	}

	public static String text(String displayName, String email, String temporaryPassword, String role, String loginUrl) {
		String name = safe(displayName, "là");
		return String.join("\n\n",
				"Bonjour " + name + ",",
				"Votre compte MangAfriq a été créé / mis à jour.",
				"Rôle: " + safe(role, ""),
				"Email: " + safe(email, ""),
				"Mot de passe temporaire: " + safe(temporaryPassword, ""),
				"Connexion: " + safe(loginUrl, ""),
				"Important: vous devrez changer votre mot de passe lors de votre première connexion.",
				"— L’équipe MangAfriq"
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

