package com.mangafriq.realtime;

import com.mangafriq.dto.wallet.WalletDtos.WalletUpdateEvent;
import java.time.Instant;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WalletRealtime {
	/**
	 * Client subscription destination:
	 * - subscribe to {@code /user/queue/wallet}
	 */
	public static final String USER_QUEUE = "/queue/wallet";

	private final SimpMessagingTemplate messaging;

	public WalletRealtime(SimpMessagingTemplate messaging) {
		this.messaging = messaging;
	}

	public void publishToUser(String username, WalletUpdateEvent event) {
		String u = username == null ? "" : username.trim();
		if (u.isBlank()) return;
		WalletUpdateEvent out = event == null
				? new WalletUpdateEvent(0, 0, 0, Instant.now(), "unknown")
				: event;
		messaging.convertAndSendToUser(u, USER_QUEUE, out);
	}
}

