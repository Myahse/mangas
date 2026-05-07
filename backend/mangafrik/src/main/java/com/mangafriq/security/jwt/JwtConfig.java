package com.mangafriq.security.jwt;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.security.SecureRandom;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

@Configuration
@Slf4j
public class JwtConfig {

	@Value("${app.jwt.secret:}")
	private String jwtSecret;

	@Value("${app.jwt.require-secret:false}")
	private boolean requireSecret;

	private final Environment environment;

	public JwtConfig(Environment environment) {
		this.environment = environment;
	}

	@Bean
	SecretKey jwtSecretKey() {
		byte[] keyBytes = decodeSecret(jwtSecret);
		if (keyBytes.length == 0) {
			boolean postgresProfileActive = false;
			try {
				for (String p : environment.getActiveProfiles()) {
					if ("postgres".equalsIgnoreCase(p) || "prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p)) {
						postgresProfileActive = true;
						break;
					}
				}
			} catch (Exception ignored) {}

			if (requireSecret || postgresProfileActive) {
				throw new IllegalStateException("APP_JWT_SECRET must be set for this environment (multi-instance safe JWT).");
			}

			// Dev convenience: allow boot without configuring a secret.
			// Tokens will be invalidated on every restart and won't work across replicas.
			keyBytes = new byte[32];
			new SecureRandom().nextBytes(keyBytes);
			log.warn("JWT secret is not set (app.jwt.secret). Generated a temporary key for this run.");
		}
		// Use HS256 (requires at least 256-bit / 32 bytes key).
		if (keyBytes.length < 32) {
			throw new IllegalStateException("app.jwt.secret must be at least 32 bytes (use base64 for convenience)");
		}
		return new SecretKeySpec(keyBytes, "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
		// Pass the SecretKey itself so Nimbus can select the MAC key correctly.
		return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
	}

	@Bean
	JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
		return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
	}

	@Bean
	JwtAuthenticationConverter jwtAuthenticationConverter() {
		// Map our custom "role" claim to ROLE_* authorities expected by hasRole().
		JwtAuthenticationConverter c = new JwtAuthenticationConverter();
		c.setJwtGrantedAuthoritiesConverter(jwt -> {
			// New: roles is an array. Backward compatible: role is a single string.
			Object roles = jwt.getClaim("roles");
			java.util.Collection<org.springframework.security.core.GrantedAuthority> out = new java.util.ArrayList<>();

			if (roles instanceof java.util.Collection<?> coll) {
				for (Object v : coll) {
					String s = v == null ? "" : String.valueOf(v).trim();
					if (s.isBlank()) continue;
					out.add(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + s.toUpperCase()));
				}
			} else {
				Object r = jwt.getClaim("role");
				String s = r == null ? "" : String.valueOf(r).trim();
				if (!s.isBlank()) {
					out.add(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + s.toUpperCase()));
				}
			}
			return out;
		});
		return c;
	}

	private static byte[] decodeSecret(String raw) {
		if (raw == null) raw = "";
		String s = raw.trim();
		if (s.isEmpty()) return new byte[0];
		if (s.startsWith("base64:")) {
			return Base64.getDecoder().decode(s.substring("base64:".length()).trim());
		}
		// Try base64 first if it looks like it.
		try {
			if (s.length() >= 43 && s.matches("^[A-Za-z0-9+/=]+$")) {
				return Base64.getDecoder().decode(s);
			}
		} catch (Exception ignored) {}
		return s.getBytes(StandardCharsets.UTF_8);
	}
}

