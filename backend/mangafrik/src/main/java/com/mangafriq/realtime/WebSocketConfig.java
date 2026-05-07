package com.mangafriq.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
	private final WsAuthChannelInterceptor wsAuthChannelInterceptor;
	private final Environment environment;

	public WebSocketConfig(WsAuthChannelInterceptor wsAuthChannelInterceptor, Environment environment) {
		this.wsAuthChannelInterceptor = wsAuthChannelInterceptor;
		this.environment = environment;
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		String relayHost = environment.getProperty("app.realtime.broker.relay.host", "");
		Integer relayPort = environment.getProperty("app.realtime.broker.relay.port", Integer.class);

		boolean relayEnabled = relayHost != null && !relayHost.isBlank() && relayPort != null;
		if (relayEnabled) {
			String relayLogin = environment.getProperty("app.realtime.broker.relay.login", "guest");
			String relayPasscode = environment.getProperty("app.realtime.broker.relay.passcode", "guest");
			String systemLogin = environment.getProperty("app.realtime.broker.relay.system-login", relayLogin);
			String systemPasscode = environment.getProperty("app.realtime.broker.relay.system-passcode", relayPasscode);

			registry.enableStompBrokerRelay("/topic")
					.setRelayHost(relayHost)
					.setRelayPort(relayPort)
					.setClientLogin(relayLogin)
					.setClientPasscode(relayPasscode)
					.setSystemLogin(systemLogin)
					.setSystemPasscode(systemPasscode)
					.setSystemHeartbeatReceiveInterval(10000)
					.setSystemHeartbeatSendInterval(10000);
		} else {
			// Dev fallback: single-instance only.
			registry.enableSimpleBroker("/topic");
		}

		// Client-to-server messages go to /app/**
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

