package com.mangafriq.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.web.socket.EnableWebSocketSecurity;
import org.springframework.security.messaging.access.intercept.MessageMatcherDelegatingAuthorizationManager;

/**
 * STOMP over plain WebSocket must allow anonymous public-support typing without SockJS CSRF tokens.
 * Spring Security registers {@code XorCsrfChannelInterceptor} unless a bean named {@code csrfChannelInterceptor}
 * is provided; we replace it with a no-op so CONNECT/SEND work from the browser client.
 */
@Configuration
@EnableWebSocketSecurity
public class WebSocketSecurityConfig {

	@Bean(name = "csrfChannelInterceptor")
	ChannelInterceptor websocketCsrfDisabled() {
		return new ChannelInterceptor() {};
	}

	@Bean
	AuthorizationManager<Message<?>> webSocketAuthorizationManager(
			MessageMatcherDelegatingAuthorizationManager.Builder messages) {
		messages
				.simpTypeMatchers(SimpMessageType.CONNECT, SimpMessageType.HEARTBEAT, SimpMessageType.DISCONNECT)
						.permitAll()
				.simpSubscribeDestMatchers("/topic/**")
				.permitAll()
				.simpDestMatchers("/app/support/**")
				.permitAll()
				.anyMessage()
				.authenticated();
		return messages.build();
	}
}
