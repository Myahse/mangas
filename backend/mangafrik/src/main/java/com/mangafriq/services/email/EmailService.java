package com.mangafriq.services.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.mangafriq.services.email.templates.BrandedMessageEmailTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {
	private final JavaMailSender mailSender;
	private final BrevoEmailClient brevo;

	private static final Pattern FROM_PATTERN = Pattern.compile("^\\s*(.*?)\\s*<\\s*([^>]+)\\s*>\\s*$");

	@Value("${app.email.from:MangAfric <team@mangafric.com>}")
	private String fromEmail;

	@Value("${app.email.subject.prefix:[MangAfric]}")
	private String subjectPrefix;

	@Value("${app.email.provider:smtp}")
	private String provider;

	@Value("${app.brevo.api-key:}")
	private String brevoApiKey;

	@Value("${spring.mail.host:}")
	private String mailHost;

	@Value("${app.public.base-url:http://localhost:5173}")
	private String publicBaseUrl;

	/** Optional full URL to the logo image (PNG). If empty, uses {@code APP_PUBLIC_BASE_URL + /magafrik-logo.png}. */
	@Value("${app.email.logo-url:}")
	private String emailLogoUrlOverride;

	public EmailService(JavaMailSender mailSender, BrevoEmailClient brevo) {
		this.mailSender = mailSender;
		this.brevo = brevo;
	}

	/** Public site origin, trailing slashes stripped. */
	public String getPublicBaseUrlNormalized() {
		String b = publicBaseUrl == null ? "" : publicBaseUrl.trim().replaceAll("/+$", "");
		return b.isBlank() ? "http://localhost:5173" : b;
	}

	/**
	 * Logo used in HTML emails. Override with {@code app.email.logo-url} / {@code APP_EMAIL_LOGO_URL}
	 * (e.g. absolute URL to a CDN); otherwise the reader app’s {@code /magafrik-logo.png}.
	 */
	public String resolveEmailLogoUrl() {
		String o = emailLogoUrlOverride == null ? "" : emailLogoUrlOverride.trim();
		if (!o.isBlank()) {
			return o;
		}
		return getPublicBaseUrlNormalized() + "/magafrik-logo.png";
	}

	public boolean isConfigured() {
		String p = String.valueOf(provider).trim();
		if ("brevo".equalsIgnoreCase(p)) {
			return !String.valueOf(brevoApiKey).trim().isBlank();
		}
		// SMTP requires a host; fromEmail alone is not enough.
		return fromEmail != null
			&& !fromEmail.trim().isBlank()
			&& mailHost != null
			&& !mailHost.trim().isBlank();
	}

	/**
	 * Strict send: throws if not configured or provider fails.
	 * Use for critical one-time credentials emails (so we don't "lose" the password).
	 */
	public void sendHtmlEmailStrict(String toEmail, String subject, String htmlContent) throws MessagingException {
		String p = String.valueOf(provider).trim();
		if ("brevo".equalsIgnoreCase(p)) {
			String apiKey = String.valueOf(brevoApiKey).trim();
			if (apiKey.isBlank()) throw new IllegalStateException("Brevo enabled but api key missing");
			ParsedFrom from = parseFrom(fromEmail);
			String toName = "";
			String to = toEmail == null ? "" : toEmail.trim();
			int at = to.indexOf("@");
			if (at > 0) toName = to.substring(0, at);
			if (toName.isBlank()) toName = "MangAfric";
			Map<String, Object> payload = BrevoEmailClient.buildSingleHtmlEmailPayload(
				from.email(),
				from.name(),
				toEmail,
				toName,
				subjectPrefix + " " + subject,
				htmlContent
			);
			brevo.sendSmtpEmail(apiKey, payload);
			return;
		}

		if (mailHost == null || mailHost.trim().isBlank()) {
			throw new IllegalStateException("SMTP is not configured (spring.mail.host is missing)");
		}

		MimeMessage message = mailSender.createMimeMessage();
		MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
		helper.setFrom(fromEmail);
		helper.setTo(toEmail);
		helper.setSubject(subjectPrefix + " " + subject);
		helper.setText(htmlContent, true);
		mailSender.send(message);
	}

	/**
	 * Sends {@code content} as branded HTML (logo, banner = subject, footer). Plain text only — URLs become links.
	 */
	public void sendSimpleEmail(String toEmail, String subject, String content) {
		if (toEmail == null || toEmail.trim().isBlank()) {
			return;
		}
		String html = BrandedMessageEmailTemplate.html(subject, content, publicBaseUrl, resolveEmailLogoUrl());
		deliverHtmlEmailBestEffort(toEmail, subject, html);
	}

	private void deliverHtmlEmailBestEffort(String toEmail, String subject, String htmlContent) {
		String p = String.valueOf(provider).trim();
		if ("brevo".equalsIgnoreCase(p)) {
			String apiKey = String.valueOf(brevoApiKey).trim();
			if (apiKey.isBlank()) {
				log.warn("Email skipped: Brevo enabled but api key missing (to={}, subject={})", toEmail, subject);
				return;
			}
			ParsedFrom from = parseFrom(fromEmail);
			String toName = "";
			String to = toEmail.trim();
			int at = to.indexOf("@");
			if (at > 0) {
				toName = to.substring(0, at);
			}
			if (toName.isBlank()) {
				toName = "MangAfric";
			}
			Map<String, Object> payload = BrevoEmailClient.buildSingleHtmlEmailPayload(
					from.email(),
					from.name(),
					toEmail,
					toName,
					subjectPrefix + " " + subject,
					htmlContent
			);
			try {
				brevo.sendSmtpEmail(apiKey, payload);
			} catch (Exception e) {
				log.warn("Email send failed (brevo html): to={}, subject={}", toEmail, subject, e);
			}
			return;
		}

		if (mailHost == null || mailHost.trim().isBlank()) {
			log.warn("Email skipped: SMTP host missing (to={}, subject={})", toEmail, subject);
			return;
		}

		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setFrom(fromEmail);
			helper.setTo(toEmail);
			helper.setSubject(subjectPrefix + " " + subject);
			helper.setText(htmlContent, true);
			mailSender.send(message);
		} catch (Exception e) {
			log.warn("Email send failed (smtp html): to={}, subject={}", toEmail, subject, e);
		}
	}

	public void sendHtmlEmail(String toEmail, String subject, String htmlContent) throws MessagingException {
		if ("brevo".equalsIgnoreCase(String.valueOf(provider).trim())) {
			String apiKey = String.valueOf(brevoApiKey).trim();
			if (apiKey.isBlank()) throw new IllegalArgumentException("Brevo is enabled but app.brevo.api-key is not set");

			ParsedFrom from = parseFrom(fromEmail);
			String toName = "";
			String to = toEmail == null ? "" : toEmail.trim();
			int at = to.indexOf("@");
			if (at > 0) toName = to.substring(0, at);
			if (toName.isBlank()) toName = "MangAfric";
			Map<String, Object> payload = BrevoEmailClient.buildSingleHtmlEmailPayload(
					from.email(),
					from.name(),
					toEmail,
					toName,
					subjectPrefix + " " + subject,
					htmlContent
			);
			brevo.sendSmtpEmail(apiKey, payload);
			return;
		}

		MimeMessage message = mailSender.createMimeMessage();
		MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
		helper.setFrom(fromEmail);
		helper.setTo(toEmail);
		helper.setSubject(subjectPrefix + " " + subject);
		helper.setText(htmlContent, true);
		try {
			mailSender.send(message);
		} catch (Exception e) {
			log.warn("Email send failed (html): to={}, subject={}", toEmail, subject, e);
		}
	}

	public void sendPdfAttachmentEmail(String toEmail, String subject, String textContent, String fileName, byte[] pdfBytes) {
		if (toEmail == null || toEmail.trim().isBlank()) return;
		if (pdfBytes == null || pdfBytes.length == 0) throw new IllegalArgumentException("pdfBytes is empty");

		if ("brevo".equalsIgnoreCase(String.valueOf(provider).trim())) {
			String apiKey = String.valueOf(brevoApiKey).trim();
			if (apiKey.isBlank()) {
				log.warn("PDF attachment not sent (brevo): api key missing (to={}, subject={})", toEmail, subject);
				sendSimpleEmail(toEmail, subject, textContent);
				return;
			}
			ParsedFrom from = parseFrom(fromEmail);
			String toName = "";
			String to = toEmail == null ? "" : toEmail.trim();
			int at = to.indexOf("@");
			if (at > 0) toName = to.substring(0, at);
			if (toName.isBlank()) toName = "MangAfric";
			String safeName = (fileName == null || fileName.isBlank()) ? "contrat-createur.pdf" : fileName;
			String html = BrandedMessageEmailTemplate.html(subject, textContent, publicBaseUrl, resolveEmailLogoUrl());
			String b64 = Base64.getEncoder().encodeToString(pdfBytes);
			List<Map<String, Object>> attachments = List.of(Map.of(
					"name", safeName,
					"content", b64
			));
			Map<String, Object> payload = BrevoEmailClient.buildSingleHtmlEmailPayloadWithAttachments(
					from.email(),
					from.name(),
					toEmail,
					toName,
					subjectPrefix + " " + subject,
					html,
					attachments
			);
			try {
				brevo.sendSmtpEmail(apiKey, payload);
			} catch (Exception e) {
				log.warn("Email send failed (brevo pdf attachment): to={}, subject={}", toEmail, subject, e);
				sendSimpleEmail(toEmail, subject, textContent);
			}
			return;
		}

		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setFrom(fromEmail);
			helper.setTo(toEmail);
			helper.setSubject(subjectPrefix + " " + subject);
			String branded = BrandedMessageEmailTemplate.html(subject, textContent, publicBaseUrl, resolveEmailLogoUrl());
			helper.setText(branded, true);
			helper.addAttachment(
				(fileName == null || fileName.isBlank()) ? "contrat-createur.pdf" : fileName,
				new ByteArrayResource(pdfBytes),
				"application/pdf"
			);
			mailSender.send(message);
		} catch (Exception e) {
			log.warn("Email send failed (pdf attachment): to={}, subject={}", toEmail, subject, e);
		}
	}

	private static ParsedFrom parseFrom(String raw) {
		String s = raw == null ? "" : raw.trim();
		if (s.isEmpty()) return new ParsedFrom("MangAfric", "noreply@mangafric.com");

		Matcher m = FROM_PATTERN.matcher(s);
		if (m.matches()) {
			String name = (m.group(1) == null ? "" : m.group(1)).trim();
			String email = (m.group(2) == null ? "" : m.group(2)).trim();
			if (name.isBlank()) name = "MangAfric";
			return new ParsedFrom(name, email);
		}
		// If just an email was provided.
		if (s.contains("@")) return new ParsedFrom("MangAfric", s);
		return new ParsedFrom(s, "noreply@mangafric.com");
	}

	private record ParsedFrom(String name, String email) {}
}

