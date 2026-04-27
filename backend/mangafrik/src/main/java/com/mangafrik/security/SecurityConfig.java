package com.mangafrik.security;

import com.mangafrik.constants.AppConstants;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

@Configuration
public class SecurityConfig {
	private final JwtAuthenticationConverter jwtAuthenticationConverter;

	public SecurityConfig(JwtAuthenticationConverter jwtAuthenticationConverter) {
		this.jwtAuthenticationConverter = jwtAuthenticationConverter;
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		return http
				.cors(Customizer.withDefaults())
				.csrf(csrf -> csrf.disable())
				.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers("/ws/**").permitAll()
						.requestMatchers(
								"/swagger-ui.html",
								"/swagger-ui/**",
								"/v3/api-docs",
								"/v3/api-docs/**"
						).permitAll()
						.requestMatchers(
								AppConstants.API_V1 + "/auth/**",
								AppConstants.API_V1 + "/health",
								AppConstants.API_V1 + "/manga/**",
								AppConstants.API_V1 + "/genres",
								AppConstants.API_V1 + "/storage/{key:.+}"
						).permitAll()
						.requestMatchers(HttpMethod.POST, AppConstants.API_V1 + "/creator-requests").permitAll()
						.requestMatchers(AppConstants.API_V1 + "/storage/upload").authenticated()
						.requestMatchers(AppConstants.API_V1 + "/creator/**").hasRole("CREATOR")
						.requestMatchers(AppConstants.API_V1 + "/admin/**").hasRole("ADMIN")
						.requestMatchers(AppConstants.API_V1 + "/support/**").hasAnyRole("ADMIN", "SUPPORT")
						.requestMatchers(AppConstants.API_V1 + "/ads/**").hasAnyRole("ADMIN", "ADS")
						.anyRequest().authenticated()
				)
				.oauth2ResourceServer(oauth2 -> oauth2
						.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
				)
				.httpBasic(Customizer.withDefaults())
				.build();
	}
}

