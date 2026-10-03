package com.mangafriq.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.stereotype.Component;

/**
 * App session tokens are UUIDs stored in {@code app_sessions}; JWT resource server must not
 * try to parse them (that yields 401 on every request). UUID bearer tokens are left to
 * {@link SessionAuthFilter}.
 */
@Component
public class SessionAwareBearerTokenResolver implements BearerTokenResolver {
	private final DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();

	@Override
	public String resolve(HttpServletRequest request) {
		String token = delegate.resolve(request);
		if (token == null || token.isBlank()) {
			return null;
		}
		try {
			UUID.fromString(token.trim());
			return null;
		} catch (IllegalArgumentException ignored) {
			return token.trim();
		}
	}
}
