package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.email.SendEmailRequest;
import com.mangafriq.services.email.EmailService;
import jakarta.mail.MessagingException;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/email")
public class EmailController {
	private final EmailService emailService;

	public EmailController(EmailService emailService) {
		this.emailService = emailService;
	}

	@PostMapping("/send")
	public ResponseEntity<?> send(@RequestBody SendEmailRequest req) throws MessagingException {
		if (req == null || req.to() == null || req.to().isBlank()) {
			return ResponseEntity.badRequest().body(Map.of("error", "to is required"));
		}
		if (req.subject() == null || req.subject().isBlank()) {
			return ResponseEntity.badRequest().body(Map.of("error", "subject is required"));
		}
		if (req.html() != null && !req.html().isBlank()) {
			emailService.sendHtmlEmail(req.to(), req.subject(), req.html());
		} else {
			emailService.sendSimpleEmail(req.to(), req.subject(), req.text() == null ? "" : req.text());
		}
		return ResponseEntity.ok(Map.of("status", "sent"));
	}
}

