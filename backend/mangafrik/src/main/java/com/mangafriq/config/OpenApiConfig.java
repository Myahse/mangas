package com.mangafriq.config;

import com.mangafriq.constants.AppConstants;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
	public static final String BEARER_SECURITY_SCHEME = "bearerAuth";

	@Value("${app.public.api-base-url:http://localhost:8088}")
	private String apiPublicBaseUrl;

	@Bean
	public OpenAPI openAPI() {
		return new OpenAPI()
				.info(new Info()
						.title("MangAfric API")
						.version("1.0")
						.description("""
								Backend for MangAfric (Webgas): manga catalog, chapters & pages, creator tooling, **coin store & wallet**, episode unlocks, referrals & rewards, **admin**, **ads**, **support**, contracts, and finance exports.

								**Base path:** `%s`

								**Authentication:** `Authorization: Bearer <token>`
								- JWT access tokens (OAuth2 resource server).
								- Legacy sessions: UUID returned by login — same header shape as Bearer.

								Use **Authorize** in Swagger UI to attach the token. Many catalog and public routes stay anonymous; admin / creator / support / ads routes require the matching role."""
								.formatted(AppConstants.API_V1)))
				.externalDocs(new ExternalDocumentation()
						.description("OpenAPI JSON")
						.url("/v3/api-docs"))
				.servers(List.of(
						new Server().url(apiPublicBaseUrl).description("Configured API origin (`app.public.api-base-url`)")))
				.components(new Components()
						.addSecuritySchemes(BEARER_SECURITY_SCHEME,
								new SecurityScheme()
										.name(BEARER_SECURITY_SCHEME)
										.type(SecurityScheme.Type.HTTP)
										.scheme("bearer")
										.bearerFormat("JWT")
										.description("JWT bearer, or legacy session UUID from `/api/v1/auth/login`.")));
	}
}
