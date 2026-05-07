package com.mangafriq.security.jwt;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
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

	public String issue(String userId, String email, String role) {
		return issue(userId, email, role, role == null ? List.of("reader") : List.of(role));
	}

	public String issue(String userId, String email, String role, List<String> roles) {
		Instant now = Instant.now();
		Instant exp = now.plus(Math.max(1, ttlHours), ChronoUnit.HOURS);

		List<String> safeRoles = (roles == null || roles.isEmpty())
			? List.of(role == null ? "reader" : role)
			: roles.stream()
				.filter(r -> r != null && !r.trim().isEmpty())
				.map(r -> r.trim().toLowerCase())
				.distinct()
				.toList();

		String primaryRole = (role == null || role.trim().isEmpty())
			? safeRoles.get(0)
			: role.trim().toLowerCase();

		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuedAt(now)
				.expiresAt(exp)
				.subject(email == null ? String.valueOf(userId) : email)
				.claim("uid", String.valueOf(userId))
				.claim("email", email)
				// Backward compatible: keep "role" as a single string.
				.claim("role", primaryRole)
				// New: multiple roles.
				.claim("roles", safeRoles)
				.build();

		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}
}

