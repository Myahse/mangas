package com.mangafriq.realtime;

import com.mangafriq.dto.support.SupportDtos.TicketDto;
import com.mangafriq.services.support.SupportStore;
import java.time.Instant;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class SupportTypingRealtime {
	
	public static final class TypingPayload {
		public String ticketId;
		public String from;
		public Boolean typing;
		public Instant at;
	}

	private final SimpMessagingTemplate messaging;
	private final SupportStore supportStore;

	public SupportTypingRealtime(SimpMessagingTemplate messaging, SupportStore supportStore) {
		this.messaging = messaging;
		this.supportStore = supportStore;
	}

	public static String topicForTicket(String ticketId) {
		return "/topic/support/tickets/" + ticketId + "/typing";
	}

	@MessageMapping("/support/typing")
	public void typing(@Payload TypingPayload evt) {
		if (evt == null) return;
		String ticketIdRaw = evt.ticketId == null ? "" : evt.ticketId.trim();
		if (ticketIdRaw.isBlank()) return;

		String ticketId = ticketIdRaw.toLowerCase();

		TicketDto t = supportStore.getTicket(ticketId);
		if (t == null) return;

		String from = "support".equals(evt.from) ? "support" : "user";
		boolean typing = Boolean.TRUE.equals(evt.typing);
		Instant at = evt.at != null ? evt.at : Instant.now();

		TypingPayload out = new TypingPayload();
		out.ticketId = ticketId;
		out.from = from;
		out.typing = typing;
		out.at = at;
		messaging.convertAndSend(topicForTicket(ticketId), out);
	}
}

