package com.mangafrik.services.email;

import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class BrevoEmailClient {
	private final RestClient restClient;

	public BrevoEmailClient(RestClient.Builder builder) {
		this.restClient = builder
				.baseUrl("https://api.brevo.com/v3")
				.build();
	}

	public void sendSmtpEmail(String apiKey, Map<String, Object> payload) {
		restClient.post()
				.uri("/smtp/email")
				.accept(MediaType.APPLICATION_JSON)
				.contentType(MediaType.APPLICATION_JSON)
				.header("api-key", apiKey)
				.body(payload)
				.retrieve()
				.toBodilessEntity();
	}

	public static Map<String, Object> buildSingleHtmlEmailPayload(
			String fromEmail,
			String fromName,
			String toEmail,
			String toName,
			String subject,
			String htmlContent
	) {
		return Map.of(
				"sender", Map.of(
						"email", fromEmail,
						"name", fromName
				),
				"to", List.of(Map.of(
						"email", toEmail,
						"name", toName
				)),
				"subject", subject,
				"htmlContent", htmlContent
		);
	}
}

