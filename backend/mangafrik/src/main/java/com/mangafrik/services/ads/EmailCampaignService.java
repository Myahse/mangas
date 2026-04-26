package com.mangafrik.services.ads;

import com.mangafrik.dto.ads.EmailCampaignDtos.EmailCampaignRequest;
import com.mangafrik.dto.ads.EmailCampaignDtos.EmailCampaignResponse;
import com.mangafrik.services.email.EmailService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class EmailCampaignService {
	private final NamedParameterJdbcTemplate jdbc;
	private final EmailService emailService;

	@Value("${app.email.enabled:false}")
	private boolean emailEnabled;

	@Value("${spring.mail.host:}")
	private String mailHost;

	public EmailCampaignService(NamedParameterJdbcTemplate jdbc, EmailService emailService) {
		this.jdbc = jdbc;
		this.emailService = emailService;
	}

	public EmailCampaignResponse sendCampaign(EmailCampaignRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		if (!emailEnabled) throw new IllegalArgumentException("email is disabled (set APP_EMAIL_ENABLED=true)");
		if (mailHost == null || mailHost.isBlank()) throw new IllegalArgumentException("mail is not configured (set MAIL_HOST, etc)");

		String subject = req.subject() == null ? "" : req.subject().trim();
		if (subject.isBlank()) throw new IllegalArgumentException("subject is required");

		boolean hasHtml = req.html() != null && !req.html().isBlank();
		boolean hasText = req.text() != null && !req.text().isBlank();
		if (!hasHtml && !hasText) throw new IllegalArgumentException("text or html is required");

		int max = req.maxRecipients() == null ? 500 : Math.max(1, Math.min(req.maxRecipients(), 5000));
		List<String> recipients = resolveRecipients(req, max);

		int sent = 0;
		int failed = 0;
		for (String to : recipients) {
			try {
				if (hasHtml) emailService.sendHtmlEmail(to, subject, req.html());
				else emailService.sendSimpleEmail(to, subject, req.text());
				sent++;
			} catch (Exception e) {
				failed++;
			}
		}

		return new EmailCampaignResponse(recipients.size(), sent, failed);
	}

	private List<String> resolveRecipients(EmailCampaignRequest req, int max) {
		String target = req.target() == null ? "all" : req.target().trim().toLowerCase();

		if (Objects.equals(target, "list")) {
			List<String> raw = req.to() == null ? List.of() : req.to();
			List<String> out = new ArrayList<>();
			for (String e : raw) {
				if (e == null) continue;
				String email = e.trim().toLowerCase();
				if (email.isBlank() || !email.contains("@")) continue;
				out.add(email);
				if (out.size() >= max) break;
			}
			if (out.isEmpty()) throw new IllegalArgumentException("to must contain at least one email");
			return out;
		}

		if (Objects.equals(target, "role")) {
			String role = req.role() == null ? "" : req.role().trim().toLowerCase();
			if (!Objects.equals(role, "creator") && !Objects.equals(role, "reader")) {
				throw new IllegalArgumentException("role must be reader or creator");
			}
			return jdbc.queryForList(
					"select email from app_users where role = :role order by created_at desc limit :max",
					new MapSqlParameterSource(Map.of("role", role, "max", max)),
					String.class
			);
		}

		// default: all
		return jdbc.queryForList(
				"select email from app_users order by created_at desc limit :max",
				new MapSqlParameterSource(Map.of("max", max)),
				String.class
		);
	}
}

