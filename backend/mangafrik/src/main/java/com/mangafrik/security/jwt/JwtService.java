package com.mangafrik.security.jwt;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
	private final JwtEncoder encoder;

	@Value("${app.jwt.ttl-hours:168}")
	private long ttlHours;

	public JwtService(JwtEncoder encoder) {
		this.encoder = encoder;
	}

	public String issue(long userId, String email, String role) {
		Instant now = Instant.now();
		Instant exp = now.plus(Math.max(1, ttlHours), ChronoUnit.HOURS);

		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuedAt(now)
				.expiresAt(exp)
				.subject(email == null ? String.valueOf(userId) : email)
				.claim("uid", userId)
				.claim("email", email)
				.claim("role", role == null ? "reader" : role)
				.build();

		return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
	}
}

