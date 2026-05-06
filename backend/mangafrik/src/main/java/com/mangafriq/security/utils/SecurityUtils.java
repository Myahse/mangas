package com.mangafriq.security.utils;

import com.mangafriq.security.SessionAuthFilter.SessionPrincipal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public final class SecurityUtils {
	private SecurityUtils() {}

	public static Optional<String> getCurrentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
			return Optional.empty();
		}
		return Optional.of(auth.getName());
	}

	public static Optional<UUID> getCurrentUserId() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !auth.isAuthenticated()) return Optional.empty();

		if (auth instanceof JwtAuthenticationToken jwtAuth) {
			Jwt jwt = jwtAuth.getToken();
			Object uid = jwt != null ? jwt.getClaim("uid") : null;
			if (uid == null) {
				uid = jwtAuth.getTokenAttributes().get("uid");
			}
			if (uid != null) {
				try {
					return Optional.of(UUID.fromString(String.valueOf(uid)));
				} catch (Exception ignored) {}
			}
		}

		// Session cookie auth: Bearer token is an app_sessions UUID; SessionAuthFilter sets SessionPrincipal.
		if (auth instanceof UsernamePasswordAuthenticationToken up && up.getPrincipal() instanceof SessionPrincipal sp) {
			try {
				return Optional.of(UUID.fromString(sp.id()));
			} catch (Exception ignored) {}
		}
		return Optional.empty();
	}

	/** Email claim / JWT subject / session principal — for notifying the logged-in creator. */
	public static Optional<String> getCurrentUserEmail() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !auth.isAuthenticated()) {
			return Optional.empty();
		}
		if (auth instanceof JwtAuthenticationToken jwtAuth) {
			Jwt jwt = jwtAuth.getToken();
			if (jwt != null) {
				String email = jwt.getClaimAsString("email");
				if (email != null && !email.isBlank()) {
					return Optional.of(email.trim());
				}
				String sub = jwt.getSubject();
				if (sub != null && sub.contains("@")) {
					return Optional.of(sub.trim());
				}
			}
		}
		if (auth instanceof UsernamePasswordAuthenticationToken up && up.getPrincipal() instanceof SessionPrincipal sp) {
			String email = sp.email();
			if (email != null && !email.isBlank()) {
				return Optional.of(email.trim());
			}
		}
		return Optional.empty();
	}
}

