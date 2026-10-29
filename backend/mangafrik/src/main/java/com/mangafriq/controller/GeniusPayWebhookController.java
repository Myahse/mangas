package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.services.payments.geniuspay.GeniusPayClient.GeniusPayException;
import com.mangafriq.services.payments.geniuspay.GeniusPayProperties;
import com.mangafriq.services.payments.geniuspay.GeniusPaySignature;
import com.mangafriq.services.store.CoinStoreService;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GeniusPay webhook (public; register its URL with POST /webhooks on GeniusPay). Only signed calls are
 * accepted, and coins are credited after the payment is re-read from GeniusPay, never from this body.
 */
@RestController
@RequestMapping(AppConstants.API_V1 + "/payments/geniuspay")
@Slf4j
public class GeniusPayWebhookController {
	private final CoinStoreService store;
	private final GeniusPayProperties props;

	public GeniusPayWebhookController(CoinStoreService store, GeniusPayProperties props) {
		this.store = store;
		this.props = props;
	}

	@PostMapping("/webhook")
	public ResponseEntity<Map<String, Object>> webhook(
			@RequestBody(required = false) byte[] body,
			@RequestHeader(value = "X-Webhook-Signature", required = false) String signature,
			@RequestHeader(value = "X-Webhook-Timestamp", required = false) String timestamp,
			@RequestHeader(value = "X-Webhook-Event", required = false) String eventHeader
	) {
		if (!props.webhookConfigured()) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", "webhook not configured"));
		}
		byte[] raw = body == null ? new byte[0] : body;
		if (!GeniusPaySignature.verify(props.webhookSecret().trim(), timestamp, raw, signature, Instant.now())) {
			log.warn("GeniusPay webhook rejected: bad signature or timestamp (event {})", eventHeader);
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "invalid signature"));
		}

		Map<String, Object> payload;
		try {
			payload = JsonParserFactory.getJsonParser().parseMap(new String(raw, StandardCharsets.UTF_8));
		} catch (Exception e) {
			return ResponseEntity.badRequest().body(Map.of("error", "invalid json"));
		}
		String event = payload.get("event") != null ? String.valueOf(payload.get("event")) : String.valueOf(eventHeader);
		if (!event.startsWith("payment.")) {
			return ResponseEntity.ok(Map.of("received", true, "event", event));
		}
		String reference = payload.get("data") instanceof Map<?, ?> data && data.get("reference") != null
			? String.valueOf(data.get("reference"))
			: null;

		try {
			boolean matched = store.syncByReference(reference);
			if (!matched) log.warn("GeniusPay webhook {} for unknown reference {}", event, reference);
			return ResponseEntity.ok(Map.of("received", true, "matched", matched));
		} catch (GeniusPayException e) {
			// Non-2xx so GeniusPay delivers it again later.
			log.warn("GeniusPay webhook {} for {}: status check failed: {}", event, reference, e.getMessage());
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", "status check failed"));
		}
	}
}
