package com.mangafrik.services.support;

import com.mangafrik.dto.support.SupportDtos.MessageDto;
import com.mangafrik.dto.support.SupportDtos.RejectTicketRequest;
import com.mangafrik.dto.support.SupportDtos.SendMessageRequest;
import com.mangafrik.dto.support.SupportDtos.SupportAuditDto;
import com.mangafrik.dto.support.SupportDtos.SupportSummaryDto;
import com.mangafrik.dto.support.SupportDtos.TicketDto;
import com.mangafrik.dto.support.SupportDtos.TicketUserDto;
import com.mangafrik.dto.support.SupportDtos.UpdateTicketRequest;
import com.mangafrik.dto.support.SupportDtos.ValidateTicketRequest;
import com.mangafrik.exception.NotFoundException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class SupportStore {
	private final CopyOnWriteArrayList<TicketDto> tickets = new CopyOnWriteArrayList<>();
	private final ConcurrentHashMap<String, CopyOnWriteArrayList<MessageDto>> conversations = new ConcurrentHashMap<>();
	private final CopyOnWriteArrayList<SupportAuditDto> audits = new CopyOnWriteArrayList<>();

	public SupportStore() {
		seed();
	}

	public SupportSummaryDto summary() {
		int ticketsNew = (int) tickets.stream().filter(t -> Objects.equals(t.status(), "new")).count();
		int ticketsInReview = (int) tickets.stream().filter(t -> Objects.equals(t.status(), "in_review")).count();
		int ticketsValidated = (int) tickets.stream().filter(t -> Objects.equals(t.status(), "validated")).count();
		int ticketsRejected = (int) tickets.stream().filter(t -> Objects.equals(t.status(), "rejected")).count();
		return new SupportSummaryDto(tickets.size(), ticketsNew, ticketsInReview, ticketsValidated, ticketsRejected, audits.size());
	}

	public List<TicketDto> listTickets() {
		return tickets.stream().sorted(Comparator.comparing(TicketDto::createdAt).reversed()).toList();
	}

	public TicketDto getTicket(String id) {
		return tickets.stream().filter(t -> Objects.equals(t.id(), id)).findFirst().orElse(null);
	}

	public TicketDto updateTicket(String id, UpdateTicketRequest patch) {
		for (int i = 0; i < tickets.size(); i++) {
			TicketDto t = tickets.get(i);
			if (Objects.equals(t.id(), id)) {
				TicketDto next = new TicketDto(
						t.id(),
						t.type(),
						patch.status() != null ? patch.status() : t.status(),
						t.subject(),
						t.description(),
						t.user(),
						t.createdAt(),
						Instant.now(),
						t.validationNote(),
						t.rejectionReason()
				);
				tickets.set(i, next);
				audit("ticket.update", java.util.Map.of("id", id));
				return next;
			}
		}
		throw new NotFoundException("Ticket not found");
	}

	public TicketDto validateTicket(String id, ValidateTicketRequest req) {
		TicketDto next = updateTicket(id, new UpdateTicketRequest("validated"));
		next = patchTicket(id, "validated", req.note(), null);
		audit("ticket.validate", java.util.Map.of("id", id));
		return next;
	}

	public TicketDto rejectTicket(String id, RejectTicketRequest req) {
		TicketDto next = updateTicket(id, new UpdateTicketRequest("rejected"));
		next = patchTicket(id, "rejected", null, req.reason());
		audit("ticket.reject", java.util.Map.of("id", id));
		return next;
	}

	public List<MessageDto> listMessages(String ticketId) {
		CopyOnWriteArrayList<MessageDto> msgs = conversations.getOrDefault(ticketId, new CopyOnWriteArrayList<>());
		return msgs.stream().sorted(Comparator.comparing(MessageDto::at)).toList();
	}

	public MessageDto sendMessage(String ticketId, SendMessageRequest req) {
		String from = Objects.equals(req.from(), "support") ? "support" : "user";
		String text = req.text() == null ? "" : req.text().trim();
		if (text.isEmpty()) throw new IllegalArgumentException("Message text required");
		MessageDto msg = new MessageDto(uuid(), Instant.now(), from, text);
		conversations.computeIfAbsent(ticketId, k -> new CopyOnWriteArrayList<>()).add(msg);
		audit("chat.send", java.util.Map.of("ticketId", ticketId, "from", from));
		return msg;
	}

	public List<SupportAuditDto> listAudits() {
		return audits.stream().sorted(Comparator.comparing(SupportAuditDto::at).reversed()).toList();
	}

	private TicketDto patchTicket(String id, String status, String validationNote, String rejectionReason) {
		for (int i = 0; i < tickets.size(); i++) {
			TicketDto t = tickets.get(i);
			if (Objects.equals(t.id(), id)) {
				TicketDto next = new TicketDto(
						t.id(),
						t.type(),
						status,
						t.subject(),
						t.description(),
						t.user(),
						t.createdAt(),
						Instant.now(),
						validationNote == null ? t.validationNote() : (validationNote.trim().isEmpty() ? "" : validationNote.trim()),
						rejectionReason == null ? t.rejectionReason() : (rejectionReason.trim().isEmpty() ? "" : rejectionReason.trim())
				);
				tickets.set(i, next);
				return next;
			}
		}
		throw new NotFoundException("Ticket not found");
	}

	private void audit(String action, Object payload) {
		audits.add(0, new SupportAuditDto(uuid(), Instant.now(), action, payload));
		while (audits.size() > 250) audits.remove(audits.size() - 1);
	}

	private String uuid() {
		return UUID.randomUUID().toString();
	}

	private void seed() {
		Instant now = Instant.now();
		TicketDto t1 = new TicketDto(
				uuid(),
				"issue",
				"new",
				"Login error on mobile",
				"I keep getting “Something went wrong” when I try to sign in.",
				new TicketUserDto(uuid(), "Reader One", "reader1@example.com"),
				now,
				now,
				"",
				""
		);
		TicketDto t2 = new TicketDto(
				uuid(),
				"request",
				"new",
				"Add payment method: MTN Mobile Money",
				"Can you add MoMo as a payment option for subscriptions?",
				new TicketUserDto(uuid(), "Creator One", "creator1@example.com"),
				now,
				now,
				"",
				""
		);
		TicketDto t3 = new TicketDto(
				uuid(),
				"issue",
				"in_review",
				"Chapter images not loading",
				"The reader shows blank pages for chapter 4.",
				new TicketUserDto(uuid(), "Reader Two", "reader2@example.com"),
				now,
				now,
				"",
				""
		);
		tickets.addAll(List.of(t1, t2, t3));

		conversations.put(t1.id(), new CopyOnWriteArrayList<>(List.of(
				new MessageDto(uuid(), now, "user", "Hi, I can’t log in from the mobile app.")
		)));
		conversations.put(t3.id(), new CopyOnWriteArrayList<>(List.of(
				new MessageDto(uuid(), now, "user", "It loads the UI but pages are empty for chapter 4."),
				new MessageDto(uuid(), now, "support", "Thanks. Which device + OS version are you on?")
		)));
	}
}

