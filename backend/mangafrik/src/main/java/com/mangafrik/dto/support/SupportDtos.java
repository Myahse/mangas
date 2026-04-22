package com.mangafrik.dto.support;

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

	public record MessageDto(
			String id,
			Instant at,
			String from,
			String text
	) {}

	public record SendMessageRequest(String from, String text) {}

	public record SupportAuditDto(String id, Instant at, String action, Object payload) {}
}

