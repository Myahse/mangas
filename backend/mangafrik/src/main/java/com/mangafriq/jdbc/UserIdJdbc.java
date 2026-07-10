package com.mangafriq.jdbc;

import java.util.UUID;

/** Binds {@code app_users.id} for JDBC whether the column is legacy {@code bigint} or {@code uuid}. */
public final class UserIdJdbc {
	private UserIdJdbc() {}

	public static Object param(String userId) {
		if (userId == null || userId.isBlank()) {
			throw new IllegalArgumentException("user id is required");
		}
		String raw = userId.trim();
		if (raw.matches("^\\d+$")) {
			return Long.parseLong(raw);
		}
		return UUID.fromString(raw);
	}
}
