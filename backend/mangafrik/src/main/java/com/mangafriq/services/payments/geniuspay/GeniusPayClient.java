package com.mangafriq.services.payments.geniuspay;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/** Thin client for the GeniusPay merchant API (https://geniuspay.ci/docs/api). */
@Component
@EnableConfigurationProperties(GeniusPayProperties.class)
public class GeniusPayClient {
	static final String DEFAULT_BASE_URL = "https://geniuspay.ci/api/v1/merchant";

	private final RestClient restClient;
	private final GeniusPayProperties props;

	public GeniusPayClient(RestClient.Builder builder, GeniusPayProperties props) {
		this.props = props;
		String baseUrl = props.baseUrl() == null || props.baseUrl().isBlank() ? DEFAULT_BASE_URL : props.baseUrl().trim();
		this.restClient = builder.baseUrl(baseUrl).build();
	}

	public boolean configured() {
		return props.configured();
	}

	public record Payment(String reference, String status, BigDecimal amount, String currency, String checkoutUrl) {
		public boolean completed() {
			return "completed".equalsIgnoreCase(status);
		}
	}

	/** Creates a hosted-checkout payment (no payment_method, so the reader picks Wave, Orange Money, etc.). */
	public Payment createPayment(
			int amount,
			String currency,
			String description,
			Map<String, Object> customer,
			String successUrl,
			String errorUrl,
			Map<String, Object> metadata
	) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("amount", amount);
		body.put("currency", currency);
		body.put("description", description);
		if (customer != null && !customer.isEmpty()) body.put("customer", customer);
		if (successUrl != null) body.put("success_url", successUrl);
		if (errorUrl != null) body.put("error_url", errorUrl);
		if (metadata != null) body.put("metadata", metadata);
		return call(() -> restClient.post()
				.uri("/payments")
				.headers(h -> auth(h))
				.contentType(MediaType.APPLICATION_JSON)
				.accept(MediaType.APPLICATION_JSON)
				.body(body)
				.retrieve()
				.body(Map.class));
	}

	public Payment getPayment(String reference) {
		return call(() -> restClient.get()
				.uri("/payments/{reference}", reference)
				.headers(h -> auth(h))
				.accept(MediaType.APPLICATION_JSON)
				.retrieve()
				.body(Map.class));
	}

	private void auth(org.springframework.http.HttpHeaders h) {
		h.set("X-API-Key", props.apiKey().trim());
		h.set("X-API-Secret", props.apiSecret().trim());
	}

	@SuppressWarnings("rawtypes")
	private Payment call(java.util.function.Supplier<Map> request) {
		if (!configured()) throw new GeniusPayException("GeniusPay is not configured");
		Map response;
		try {
			response = request.get();
		} catch (RestClientResponseException e) {
			throw new GeniusPayException("GeniusPay HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString());
		} catch (RestClientException e) {
			throw new GeniusPayException("GeniusPay unreachable: " + e.getMessage());
		}
		if (response == null || !Boolean.TRUE.equals(response.get("success")) || !(response.get("data") instanceof Map data)) {
			throw new GeniusPayException("GeniusPay error: " + response);
		}
		return toPayment(data);
	}

	@SuppressWarnings("rawtypes")
	static Payment toPayment(Map data) {
		Object checkout = data.get("checkout_url") != null ? data.get("checkout_url") : data.get("payment_url");
		return new Payment(
				str(data.get("reference")),
				str(data.get("status")),
				decimal(data.get("amount")),
				str(data.get("currency")),
				str(checkout)
		);
	}

	private static String str(Object o) {
		return o == null ? null : String.valueOf(o);
	}

	private static BigDecimal decimal(Object o) {
		if (o == null) return null;
		try {
			return new BigDecimal(String.valueOf(o).trim());
		} catch (NumberFormatException e) {
			return null;
		}
	}

	public static class GeniusPayException extends RuntimeException {
		public GeniusPayException(String message) {
			super(message);
		}
	}
}
