package com.mangafrik.security;

import com.mangafrik.constants.AppConstants;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
	private final SessionAuthFilter sessionAuthFilter;

	public SecurityConfig(SessionAuthFilter sessionAuthFilter) {
		this.sessionAuthFilter = sessionAuthFilter;
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		return http
				.csrf(csrf -> csrf.disable())
				.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.addFilterBefore(sessionAuthFilter, UsernamePasswordAuthenticationFilter.class)
				.authorizeHttpRequests(auth -> auth
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
						.requestMatchers(AppConstants.API_V1 + "/storage/upload").authenticated()
						.requestMatchers(AppConstants.API_V1 + "/creator/**").hasRole("CREATOR")
						.requestMatchers(AppConstants.API_V1 + "/admin/**").hasRole("ADMIN")
						.requestMatchers(AppConstants.API_V1 + "/support/**").hasAnyRole("ADMIN", "SUPPORT")
						.requestMatchers(AppConstants.API_V1 + "/ads/**").hasAnyRole("ADMIN", "ADS")
						.anyRequest().authenticated()
				)
				.httpBasic(Customizer.withDefaults())
				.build();
	}
}

