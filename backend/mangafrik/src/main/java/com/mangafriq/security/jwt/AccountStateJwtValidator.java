package com.mangafriq.security.jwt;

import com.mangafriq.jdbc.UserIdJdbc;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Rejects a still-unexpired JWT whose account was deleted, disabled, or given another role since the
 * token was issued (tokens last days; without this a disabled reader or a demoted admin kept access).
 * Account state is cached briefly so this does not cost a query on every request; admin changes call
 * {@link #evict} so a disabled account or a new role takes effect at once.
 */
@Component
public class AccountStateJwtValidator implements OAuth2TokenValidator<Jwt> {
	static final Duration CACHE_TTL = Duration.ofSeconds(30);

	private record State(String role, boolean active, Instant checkedAt) {}

	private final NamedParameterJdbcTemplate jdbc;
	private final Map<String, State> cache = new ConcurrentHashMap<>();

	public AccountStateJwtValidator(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	/** Forget the cached state of an account (after its status or role changed). */
	public void evict(String userId) {
		if (userId != null) cache.remove(userId.trim());
	}

	@Override
	public OAuth2TokenValidatorResult validate(Jwt jwt) {
		Object uidClaim = jwt.getClaim("uid");
		String uid = uidClaim == null ? "" : String.valueOf(uidClaim).trim();
		if (uid.isEmpty()) return fail("token has no account id");

		State state = cache.get(uid);
		if (state == null || state.checkedAt().plus(CACHE_TTL).isBefore(Instant.now())) {
			state = load(uid);
			if (state == null) {
				cache.remove(uid);
				return fail("account no longer exists");
			}
			cache.put(uid, state);
		}
		if (!state.active()) return fail("account is disabled");
		String tokenRole = jwt.getClaimAsString("role");
		if (tokenRole != null && !tokenRole.equalsIgnoreCase(state.role())) {
			return fail("account role changed, sign in again");
		}
		return OAuth2TokenValidatorResult.success();
	}

	private State load(String uid) {
		Object id;
		try {
			id = UserIdJdbc.param(uid);
		} catch (RuntimeException e) {
			return null;
		}
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select coalesce(nullif(trim(role), ''), 'reader') as role, coalesce(status, 'active') as status
				from app_users where id = :id
				""", new MapSqlParameterSource().addValue("id", id));
		if (rows.isEmpty()) return null;
		Map<String, Object> r = rows.get(0);
		return new State(String.valueOf(r.get("role")).toLowerCase(),
			!"disabled".equalsIgnoreCase(String.valueOf(r.get("status"))), Instant.now());
	}

	private static OAuth2TokenValidatorResult fail(String why) {
		return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", why, null));
	}
}
