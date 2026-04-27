package com.mangafrik.services.email.templates;

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
				"— L’équipe MangAfrik"
		);
	}

	public static String html(String displayName, String resetUrl, String appUrl) {
		String name = escapeHtml(displayName == null || displayName.isBlank() ? "là" : displayName.trim());
		String url = escapeHtmlAttr(resetUrl);
		String base = escapeHtmlAttr(appUrl);

		return EmailTemplateRenderer.render(
				"email/password-reset.html",
				Map.of(
						"displayName", name,
						"resetUrl", url,
						"appUrl", base,
						"logoUrl", base + "/favicon.svg"
				),
				"<html><body>" +
						"<p>Bonjour {{displayName}},</p>" +
						"<p>Pour réinitialiser votre mot de passe, cliquez ici :</p>" +
						"<p><a href=\"{{resetUrl}}\">Réinitialiser mon mot de passe</a></p>" +
						"<p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>" +
						"</body></html>"
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

