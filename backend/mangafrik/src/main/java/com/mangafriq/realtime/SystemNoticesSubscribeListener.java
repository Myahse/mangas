package com.mangafriq.realtime;

import com.mangafriq.services.ads.AdsStore;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

@Component
public class SystemNoticesSubscribeListener {
	private final AdsStore adsStore;

	public SystemNoticesSubscribeListener(AdsStore adsStore) {
		this.adsStore = adsStore;
	}

	@EventListener
	public void onSubscribe(SessionSubscribeEvent event) {
		StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(event.getMessage(), StompHeaderAccessor.class);
		if (accessor == null) return;
		String dest = accessor.getDestination();
		if (!SystemNoticesRealtime.TOPIC.equals(dest)) return;

		adsStore.publishActiveSystemNotices();
	}
}

