package com.mangafrik.services.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
	private final JavaMailSender mailSender;
	private final BrevoEmailClient brevo;

	private static final Pattern FROM_PATTERN = Pattern.compile("^\\s*(.*?)\\s*<\\s*([^>]+)\\s*>\\s*$");

	@Value("${app.email.from:MangAfrik <noreply@mangafrik.com>}")
	private String fromEmail;

	@Value("${app.email.subject.prefix:[MangAfrik]}")
	private String subjectPrefix;

	@Value("${app.email.provider:smtp}")
	private String provider;

	@Value("${app.brevo.api-key:}")
	private String brevoApiKey;

	public EmailService(JavaMailSender mailSender, BrevoEmailClient brevo) {
		this.mailSender = mailSender;
		this.brevo = brevo;
	}

	public void sendSimpleEmail(String toEmail, String subject, String content) {
		// Keep simple emails on SMTP for now (we mostly use HTML templates anyway).
		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(fromEmail);
		message.setTo(toEmail);
		message.setSubject(subjectPrefix + " " + subject);
		message.setText(content);
		mailSender.send(message);
	}

	public void sendHtmlEmail(String toEmail, String subject, String htmlContent) throws MessagingException {
		if ("brevo".equalsIgnoreCase(String.valueOf(provider).trim())) {
			String apiKey = String.valueOf(brevoApiKey).trim();
			if (apiKey.isBlank()) throw new IllegalArgumentException("Brevo is enabled but app.brevo.api-key is not set");

			ParsedFrom from = parseFrom(fromEmail);
			Map<String, Object> payload = BrevoEmailClient.buildSingleHtmlEmailPayload(
					from.email(),
					from.name(),
					toEmail,
					"",
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
		mailSender.send(message);
	}

	private static ParsedFrom parseFrom(String raw) {
		String s = raw == null ? "" : raw.trim();
		if (s.isEmpty()) return new ParsedFrom("MangAfrik", "noreply@mangafrik.com");

		Matcher m = FROM_PATTERN.matcher(s);
		if (m.matches()) {
			String name = (m.group(1) == null ? "" : m.group(1)).trim();
			String email = (m.group(2) == null ? "" : m.group(2)).trim();
			if (name.isBlank()) name = "MangAfrik";
			return new ParsedFrom(name, email);
		}
		// If just an email was provided.
		if (s.contains("@")) return new ParsedFrom("MangAfrik", s);
		return new ParsedFrom(s, "noreply@mangafrik.com");
	}

	private record ParsedFrom(String name, String email) {}
}

