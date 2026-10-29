package com.mangafriq.services.payments.geniuspay;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * GeniusPay merchant API settings. Coin purchases go through GeniusPay only when the API key and
 * secret are both set; otherwise intents stay "manual" (marked paid by an admin).
 */
@ConfigurationProperties(prefix = "geniuspay")
public record GeniusPayProperties(
	String baseUrl,
	String apiKey,
	String apiSecret,
	String webhookSecret,
	String successUrl,
	String errorUrl
) {
	public boolean configured() {
		return notBlank(apiKey) && notBlank(apiSecret);
	}

	public boolean webhookConfigured() {
		return notBlank(webhookSecret);
	}

	private static boolean notBlank(String s) {
		return s != null && !s.isBlank();
	}
}
