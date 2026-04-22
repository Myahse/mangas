package com.mangafrik.dto.admin;

import java.time.Instant;

public final class AdminDtos {
	private AdminDtos() {}

	public record AdminSummaryDto(
			int usersTotal,
			int requestsTotal,
			int requestsNew,
			int mangasTotal,
			int mangasPublished,
			int auditsTotal,
			int creatorRequestsPending,
			int submissionsPending
	) {}

	public record AdminUserDto(
			String id,
			String email,
			String displayName,
			String role,
			String status,
			Instant createdAt,
			String source
	) {}

	public record UpdateUserRequest(String role, String status, String displayName) {}

	public record CreatorRequestDto(
			String id,
			String email,
			String displayName,
			String status,
			String reason,
			Instant createdAt,
			Instant reviewedAt
	) {}

	public record ReviewRequest(String decision, String reason) {}

	public record MangaRequestDto(
			String id,
			String requestedTitle,
			String requestedBy,
			String notes,
			String status,
			Instant createdAt
	) {}

	public record CreateMangaRequest(String requestedTitle, String requestedBy, String notes) {}
	public record UpdateMangaRequest(String requestedTitle, String requestedBy, String notes, String status) {}

	public record AdminMangaDto(
			String id,
			String title,
			String slug,
			String status,
			Instant createdAt
	) {}

	public record CreateManga(String title, String slug, String status) {}
	public record UpdateManga(String title, String slug, String status) {}

	public record AuditDto(
			String id,
			Instant at,
			String action,
			Object payload
	) {}
}

