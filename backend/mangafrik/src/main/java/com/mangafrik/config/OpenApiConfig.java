package com.mangafrik.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
	@Bean
	public OpenAPI openAPI() {
		return new OpenAPI()
				.info(new Info()
						.title("MangAfrik API")
						.version("v1")
						.description("Webgas backend API (catalog, creator, admin, ads, support, email)."))
				.servers(List.of(new Server().url("http://localhost:8088")));
	}
}

