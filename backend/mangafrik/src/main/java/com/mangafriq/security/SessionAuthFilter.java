package com.mangafriq.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SessionAuthFilter extends OncePerRequestFilter {
	private final NamedParameterJdbcTemplate jdbc;

	public SessionAuthFilter(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
		throws ServletException, IOException {
		Authentication cur = SecurityContextHolder.getContext().getAuthentication();
		if (cur != null && cur.isAuthenticated() && !(cur instanceof AnonymousAuthenticationToken)) {
			filterChain.doFilter(request, response);
			return;
		}

		String auth = request.getHeader("Authorization");
		if (auth != null && auth.startsWith("Bearer ")) {
			String raw = auth.substring("Bearer ".length()).trim();
			try {
				UUID token = UUID.fromString(raw);
				Map<String, Object> row = jdbc.queryForMap("""
						select u.id as user_id, u.email, u.display_name, u.role, s.expires_at
						from app_sessions s
						join app_users u on u.id = s.user_id
						where s.token = :token
						limit 1
						""", new MapSqlParameterSource().addValue("token", token));

				Instant expires = row.get("expires_at") instanceof Timestamp ts ? ts.toInstant() : Instant.EPOCH;
				if (expires.isAfter(Instant.now())) {
					String role = String.valueOf(row.get("role"));
					var principal = new SessionPrincipal(
						String.valueOf(row.get("user_id")),
						String.valueOf(row.get("email")),
						String.valueOf(row.get("display_name")),
						role
					);
					var authToken = new UsernamePasswordAuthenticationToken(
						principal,
						null,
						List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
					);
					SecurityContextHolder.getContext().setAuthentication(authToken);
				}
			} catch (Exception ignored) {
				// Ignore invalid token
			}
		}

		filterChain.doFilter(request, response);
	}

	public record SessionPrincipal(String id, String email, String displayName, String role) {}
}

