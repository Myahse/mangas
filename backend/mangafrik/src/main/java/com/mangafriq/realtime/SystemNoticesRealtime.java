package com.mangafriq.realtime;

import com.mangafriq.dto.ads.AdsDtos.SystemNoticeDto;
import java.util.List;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class SystemNoticesRealtime {
	public static final String TOPIC = "/topic/system-notices";

	private final SimpMessagingTemplate messaging;

	public SystemNoticesRealtime(SimpMessagingTemplate messaging) {
		this.messaging = messaging;
	}

	public void publish(List<SystemNoticeDto> currentActive) {
		messaging.convertAndSend(TOPIC, currentActive);
	}
}

