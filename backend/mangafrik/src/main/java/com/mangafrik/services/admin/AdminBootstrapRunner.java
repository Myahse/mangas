package com.mangafrik.services.admin;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class AdminBootstrapRunner implements ApplicationRunner {
	private final NamedParameterJdbcTemplate jdbc;
	private final PasswordEncoder passwordEncoder;

	@Value("${app.bootstrap.admin.enabled:true}")
	private boolean enabled;

	@Value("${app.bootstrap.admin.email:mangafrik@gmail.com}")
	private String adminEmail;

	@Value("${app.bootstrap.admin.password:Mangafrik123}")
	private String adminPassword;

	@Value("${app.bootstrap.admin.display-name:MangAfrik Admin}")
	private String adminDisplayName;

	public AdminBootstrapRunner(NamedParameterJdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
		this.jdbc = jdbc;
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (!enabled) return;

		String email = (adminEmail == null ? "" : adminEmail.trim()).toLowerCase();
		String displayName = (adminDisplayName == null ? "" : adminDisplayName.trim());
		String password = adminPassword == null ? "" : adminPassword;

		if (email.isBlank() || !email.contains("@")) {
			log.warn("Admin bootstrap skipped: invalid email");
			return;
		}
		if (password.length() < 6) {
			log.warn("Admin bootstrap skipped: invalid password");
			return;
		}
		if (displayName.isBlank()) displayName = "Admin";

		boolean exists = adminExists(email);
		if (exists) return;

		// Safety net: ensure auth columns exist even if Flyway hasn't run yet.
		// (Flyway should normally create these via migrations.)
		jdbc.getJdbcTemplate().execute("""
			alter table if exists app_users
			  add column if not exists role text not null default 'reader';
			""");
		jdbc.getJdbcTemplate().execute("""
			alter table if exists app_users
			  add column if not exists password_hash text;
			""");
		jdbc.getJdbcTemplate().execute("""
			alter table if exists app_users
			  add column if not exists must_change_password boolean not null default false;
			""");
		jdbc.getJdbcTemplate().execute("""
			alter table if exists app_users
			  add column if not exists profile jsonb not null default '{}'::jsonb;
			""");
		jdbc.getJdbcTemplate().execute("""
			alter table if exists app_users
			  add column if not exists updated_at timestamptz not null default now();
			""");

		Instant now = Instant.now();
		String passwordHash = passwordEncoder.encode(password);

		jdbc.update("""
				insert into app_users (email, display_name, role, password_hash, must_change_password, profile, updated_at)
				values (:email, :display_name, 'admin', :password_hash, false, '{}'::jsonb, :updated_at)
				""",
			new MapSqlParameterSource()
				.addValue("email", email)
				.addValue("display_name", displayName)
				.addValue("password_hash", passwordHash)
				.addValue("updated_at", Timestamp.from(now))
		);

		log.warn("BOOTSTRAP ADMIN CREATED: {} (please rotate password)", email);
	}

	private boolean adminExists(String email) {
		try {
			Long count = jdbc.queryForObject("""
					select count(1)
					from app_users
					where lower(email) = :email
					""", Map.of("email", email), Long.class);
			return count != null && count > 0;
		} catch (EmptyResultDataAccessException e) {
			return false;
		}
	}
}

