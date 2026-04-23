package com.mangafrik.config;

import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class JacksonConfig {
	@Bean
	ObjectMapper objectMapper() {
		return new ObjectMapper().registerModule(new JavaTimeModule());
	}

	@Bean
	Module javaTimeModule() {
		return new JavaTimeModule();
	}
}

