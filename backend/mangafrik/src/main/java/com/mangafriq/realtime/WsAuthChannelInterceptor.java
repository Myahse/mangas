package com.mangafriq.realtime;

import java.util.List;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;

@Component
public class WsAuthChannelInterceptor implements ChannelInterceptor {
	private final JwtDecoder jwtDecoder;
	private final JwtAuthenticationConverter jwtAuthenticationConverter;

	public WsAuthChannelInterceptor(JwtDecoder jwtDecoder, JwtAuthenticationConverter jwtAuthenticationConverter) {
		this.jwtDecoder = jwtDecoder;
		this.jwtAuthenticationConverter = jwtAuthenticationConverter;
	}

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
		if (accessor == null) return message;

	
		if (StompCommand.CONNECT.equals(accessor.getCommand())) {
			String authHeader = firstNativeHeader(accessor, "Authorization");
			if (authHeader == null || !authHeader.startsWith("Bearer ")) {
		
				return message;
			}

			String token = authHeader.substring("Bearer ".length()).trim();
			try {
				Jwt jwt = jwtDecoder.decode(token);
				Authentication auth = jwtAuthenticationConverter.convert(jwt);
				accessor.setUser(auth);
			} catch (JwtException ignored) {
				
			}
		}

		return message;
	}

	private static String firstNativeHeader(StompHeaderAccessor accessor, String name) {
		List<String> values = accessor.getNativeHeader(name);
		if (values == null || values.isEmpty()) return null;
		String v = values.get(0);
		return v == null ? null : v.trim();
	}
}

