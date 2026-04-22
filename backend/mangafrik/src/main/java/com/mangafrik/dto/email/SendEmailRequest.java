package com.mangafrik.dto.email;

public record SendEmailRequest(
		String to,
		String subject,
		String text,
		String html
) {}

