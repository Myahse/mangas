package com.mangafriq.dto.support;

import java.time.Instant;

public final class SupportDtos {
	private SupportDtos() {}

	public record SupportSummaryDto(
			int ticketsTotal,
			int ticketsNew,
			int ticketsInReview,
			int ticketsValidated,
			int ticketsRejected,
			int auditsTotal
	) {}

	public record TicketUserDto(String id, String name, String email) {}

	public record TicketDto(
			String id,
			String type,
			String status,
			String subject,
			String description,
			TicketUserDto user,
			Instant createdAt,
			Instant updatedAt,
			String validationNote,
			String rejectionReason
	) {}

	public record UpdateTicketRequest(String status) {}
	public record ValidateTicketRequest(String note) {}
	public record RejectTicketRequest(String reason) {}

	public record CreateTicketRequest(
			String type,
			String subject,
			String description,
			String name,
			String email
	) {}

	public record MessageDto(
			String id,
			Instant at,
			String from,
			String text,
			String attachmentKey,
			String attachmentName,
			String attachmentContentType
	) {}

	public record SendMessageRequest(
			String from,
			String text,
			String attachmentKey,
			String attachmentName,
			String attachmentContentType
	) {}

	public record SupportAuditDto(String id, Instant at, String action, Object payload) {}
}

