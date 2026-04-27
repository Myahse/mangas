package com.mangafrik.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
	private final WsAuthChannelInterceptor wsAuthChannelInterceptor;

	public WebSocketConfig(WsAuthChannelInterceptor wsAuthChannelInterceptor) {
		this.wsAuthChannelInterceptor = wsAuthChannelInterceptor;
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		// Clients subscribe to /topic/**; server sends messages there.
		registry.enableSimpleBroker("/topic");
		// Client-to-server messages would go to /app/** if we add them later.
		registry.setApplicationDestinationPrefixes("/app");
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
	
		registry.addEndpoint("/ws")
		
				.setAllowedOriginPatterns("*");
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(wsAuthChannelInterceptor);
	}
}

