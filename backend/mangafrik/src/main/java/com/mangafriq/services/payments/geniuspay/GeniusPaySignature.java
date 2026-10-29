package com.mangafriq.services.payments.geniuspay;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Webhook signature check: hex HMAC-SHA256 of {@code timestamp + "." + body} with the webhook secret
 * (X-Webhook-Signature / X-Webhook-Timestamp). Checked against the raw request bytes, and timestamps
 * more than 5 minutes away from now are rejected to stop replays.
 */
public final class GeniusPaySignature {
	static final long MAX_SKEW_SECONDS = 300;

	private GeniusPaySignature() {}

	public static boolean verify(String secret, String timestamp, byte[] body, String signature, Instant now) {
		if (secret == null || secret.isBlank() || timestamp == null || signature == null || body == null) return false;
		long ts;
		try {
			ts = Long.parseLong(timestamp.trim());
		} catch (NumberFormatException e) {
			return false;
		}
		// Accept seconds or milliseconds since the epoch.
		if (ts > 100_000_000_000L) ts = ts / 1000;
		if (Math.abs(now.getEpochSecond() - ts) > MAX_SKEW_SECONDS) return false;

		String given = signature.trim().toLowerCase();
		if (given.startsWith("sha256=")) given = given.substring(7);
		byte[] expected = sign(secret, timestamp.trim(), body).getBytes(StandardCharsets.US_ASCII);
		return MessageDigest.isEqual(expected, given.getBytes(StandardCharsets.US_ASCII));
	}

	public static String sign(String secret, String timestamp, byte[] body) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(mac.doFinal(body));
		} catch (Exception e) {
			throw new IllegalStateException("HMAC-SHA256 unavailable", e);
		}
	}
}
