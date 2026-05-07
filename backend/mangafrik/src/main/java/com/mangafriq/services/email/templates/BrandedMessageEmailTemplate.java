package com.mangafriq.services.email.templates;

import java.time.Year;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Wraps plain-text notification bodies in the shared MangAfric HTML layout (logo, banner, footer).
 */
public final class BrandedMessageEmailTemplate {
	private static final Pattern URL_PATTERN = Pattern.compile("https?://[\\w\\-./?#&=%~:+]+", Pattern.CASE_INSENSITIVE);

	private BrandedMessageEmailTemplate() {}

	public static String html(String subjectLine, String plainBody, String appPublicBaseUrl, String logoUrlAbsolute) {
		String base = normalizeBase(appPublicBaseUrl);
		String logo = (logoUrlAbsolute == null || logoUrlAbsolute.isBlank()) ? (base + "/magafrik-logo.png") : logoUrlAbsolute.trim();
		String headline = escapeHtml(subjectLine == null || subjectLine.isBlank() ? "MangAfric" : subjectLine.trim());
		String bodyHtml = plainBodyToSafeHtml(plainBody);
		String siteHref = escapeHtmlAttr(base);

		return EmailTemplateRenderer.render(
				"email/generic-branded.html",
				Map.of(
						"bannerHeadline", headline,
						"bodyHtml", bodyHtml,
						"logoUrl", escapeHtmlAttr(logo),
						"siteUrl", siteHref,
						"year", String.valueOf(Year.now().getValue())),
				fallback(subjectLine, plainBody, logo));
	}

	static String plainBodyToSafeHtml(String plain) {
		if (plain == null || plain.isBlank()) {
			return "<p style=\"margin:0 0 14px 0;font-size:14px;color:#333;line-height:1.6;\">—</p>";
		}
		String[] blocks = plain.trim().split("\n\n+");
		StringBuilder out = new StringBuilder();
		for (String block : blocks) {
			String trimmed = block.trim();
			if (trimmed.isEmpty()) {
				continue;
			}
			out.append("<p style=\"margin:0 0 14px 0;font-size:14px;color:#333333;line-height:1.6;\">");
			out.append(linkifyParagraph(trimmed));
			out.append("</p>");
		}
		if (out.isEmpty()) {
			return "<p style=\"margin:0 0 14px 0;font-size:14px;color:#333;line-height:1.6;\">—</p>";
		}
		return out.toString();
	}

	private static String linkifyParagraph(String paragraph) {
		Matcher m = URL_PATTERN.matcher(paragraph);
		StringBuilder sb = new StringBuilder();
		int last = 0;
		while (m.find()) {
			sb.append(escapeHtml(paragraph.substring(last, m.start())));
			String url = m.group();
			sb.append("<a href=\"")
					.append(escapeHtmlAttr(url))
					.append("\" style=\"color:#ff6a00;text-decoration:underline;word-break:break-all;font-weight:600;\">")
					.append(escapeHtml(url))
					.append("</a>");
			last = m.end();
		}
		sb.append(escapeHtml(paragraph.substring(last)));
		String withBreaks = sb.toString().replace("\n", "<br>");
		return withBreaks;
	}

	private static String normalizeBase(String appPublicBaseUrl) {
		String b = appPublicBaseUrl == null ? "" : appPublicBaseUrl.trim();
		if (b.isEmpty()) {
			return "http://localhost:5173";
		}
		return b.replaceAll("/+$", "");
	}

	private static String fallback(String subjectLine, String plainBody, String logoUrl) {
		String h = escapeHtml(subjectLine == null ? "" : subjectLine);
		String body = escapeHtml(plainBody == null ? "" : plainBody).replace("\n", "<br>");
		return "<html><body style=\"margin:0;padding:16px;font-family:Arial,sans-serif;background:#fff7ed\"><div style=\"max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:12px\"><img src=\""
				+ escapeHtmlAttr(logoUrl)
				+ "\" alt=\"MangAfric\" style=\"max-width:200px;height:auto\"><h1 style=\"color:#e63946\">"
				+ h
				+ "</h1><p style=\"color:#334155\">"
				+ body
				+ "</p></div></body></html>";
	}

	private static String escapeHtml(String s) {
		if (s == null) {
			return "";
		}
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
