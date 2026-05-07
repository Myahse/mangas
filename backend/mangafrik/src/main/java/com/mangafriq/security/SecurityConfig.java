package com.mangafriq.security;

import com.mangafriq.constants.AppConstants;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;

@Configuration
public class SecurityConfig {
	private final JwtAuthenticationConverter jwtAuthenticationConverter;

	public SecurityConfig(JwtAuthenticationConverter jwtAuthenticationConverter) {
		this.jwtAuthenticationConverter = jwtAuthenticationConverter;
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, SessionAuthFilter sessionAuthFilter) throws Exception {
		return http
				.cors(Customizer.withDefaults())
				.csrf(csrf -> csrf.disable())
				.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers("/ws/**").permitAll()
						.requestMatchers(AppConstants.API_V1 + "/ws/**").permitAll()
						.requestMatchers(
								"/swagger-ui.html",
								"/swagger-ui/**",
								"/v3/api-docs",
								"/v3/api-docs/**"
						).permitAll()
						.requestMatchers(
								AppConstants.API_V1 + "/auth/**",
								AppConstants.API_V1 + "/health",
								AppConstants.API_V1 + "/genres",
								AppConstants.API_V1 + "/assets/**",
								AppConstants.API_V1 + "/storage/**"
						).permitAll()
						// Paywall: reading pages requires auth; other catalog endpoints remain public.
						.requestMatchers(HttpMethod.GET, AppConstants.API_V1 + "/manga/*/chapters/*/pages").authenticated()
						.requestMatchers(AppConstants.API_V1 + "/manga/**").permitAll()
						// Public support (contact page): must come before /support/** so nested paths are not role-gated.
						.requestMatchers(AppConstants.API_V1 + "/support/public/**").permitAll()
						.requestMatchers(HttpMethod.POST, AppConstants.API_V1 + "/creator-requests").permitAll()
						.requestMatchers(AppConstants.API_V1 + "/creator-contracts/**").permitAll()
						.requestMatchers(HttpMethod.GET, AppConstants.API_V1 + "/ads/system-notices").permitAll()
						.requestMatchers(AppConstants.API_V1 + "/storage/upload").authenticated()
						.requestMatchers(AppConstants.API_V1 + "/store/**").authenticated()
						.requestMatchers(AppConstants.API_V1 + "/creator/**").hasAnyRole("ADMIN", "SUPPORT", "CREATOR")
						.requestMatchers(AppConstants.API_V1 + "/admin/**").hasRole("ADMIN")
						.requestMatchers(AppConstants.API_V1 + "/support/**").hasAnyRole("ADMIN", "SUPPORT")
						.requestMatchers(AppConstants.API_V1 + "/ads/**").hasAnyRole("ADMIN", "ADS", "SUPPORT")
						.requestMatchers(AppConstants.API_V1 + "/finance/**").hasRole("ADMIN")
						.anyRequest().authenticated()
				)
				.oauth2ResourceServer(oauth2 -> oauth2
						.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
				)
				/* After JWT Bearer: resolve legacy session tokens that are raw UUIDs (app_sessions). */
				.addFilterAfter(sessionAuthFilter, BearerTokenAuthenticationFilter.class)
				.httpBasic(Customizer.withDefaults())
				.build();
	}
}

