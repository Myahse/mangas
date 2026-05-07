package com.mangafriq.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
@Slf4j
public class JacksonConfig {
	@Bean
	ObjectMapper objectMapper() {
		// Keep Jackson capable of handling records/JsonNode/etc while still picking up
		// classpath modules (e.g. Java time) via ServiceLoader.
		return JsonMapper.builder().findAndAddModules().build();
	}

	@Bean
	Module javaTimeModule() {
		return new JavaTimeModule();
	}
}

