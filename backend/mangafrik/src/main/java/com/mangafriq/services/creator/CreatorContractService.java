package com.mangafriq.services.creator;

import com.mangafriq.dto.admin.AdminDtos.CreatorRequestDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.email.EmailService;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class CreatorContractService {
	private final NamedParameterJdbcTemplate jdbc;
	private final EmailService emailService;

	@Value("${app.public.frontend-url:}")
	private String publicFrontendUrl;

	@Value("${app.public.base-url:http://localhost:5173}")
	private String publicBaseUrl;

	@Value("${app.email.enabled:false}")
	private boolean emailEnabled;

	@Value("${spring.mail.host:}")
	private String mailHost;

	@Value("${app.public.api-base-url:http://localhost:8088}")
	private String publicApiBaseUrl;

	public CreatorContractService(NamedParameterJdbcTemplate jdbc, EmailService emailService) {
		this.jdbc = jdbc;
		this.emailService = emailService;
	}

	public record ContractView(
		String token,
		String status,
		String contractHtml,
		String creatorRequestId,
		String signerName,
		String signatureData,
		String signedAt,
		String adminSignerName,
		String adminSignatureData,
		String adminSignedAt
	) {}

	public record ContractStatusView(String token, String status) {}

	public record SignContractRequest(
		String signerName,
		boolean accept,
		String signatureData
	) {}

	public ContractView createAndSend(CreatorRequestDto req) {
		ensureTable();
		UUID token = UUID.randomUUID();
		String html = renderContractHtml(req);
		Instant now = Instant.now();

		jdbc.update("""
				insert into creator_request_contracts (
				  id, creator_request_id, token, status, contract_html, created_at
				) values (
				  cast(:id as uuid), :creator_request_id, :token, 'sent', :contract_html, :created_at
				)
				""",
			new MapSqlParameterSource()
				.addValue("id", java.util.UUID.randomUUID().toString())
				.addValue("creator_request_id", java.util.UUID.fromString(req.id()))
				.addValue("token", token)
				.addValue("contract_html", html)
				.addValue("created_at", Timestamp.from(now))
		);

		maybeSendContractEmail(req, token);

		return new ContractView(token.toString(), "sent", html, req.id(), "", "", "", "", "", "");
	}

	public ContractView getByToken(String tokenRaw) {
		ensureTable();
		UUID token = parseToken(tokenRaw);
		Map<String, Object> row = rowByToken(token);
		String status = String.valueOf(row.get("status")).trim().toLowerCase();
		String contractHtml = String.valueOf(row.get("contract_html"));

		// If the contract is not fully signed yet, render from the latest template
		// so template improvements show up immediately (and refresh stored HTML).
		if (!"fully_signed".equals(status)) {
			String creatorRequestId = String.valueOf(row.get("creator_request_id"));
			CreatorRequestDto req = loadCreatorRequestDto(creatorRequestId);
			contractHtml = renderContractHtml(req);
			jdbc.update("""
					update creator_request_contracts
					set contract_html = :contract_html
					where token = :token
					""",
				new MapSqlParameterSource()
					.addValue("token", token)
					.addValue("contract_html", contractHtml)
			);
		}
		// Safety net: even if a legacy row somehow contains the placeholder, fix it.
		contractHtml = replaceLogoPlaceholder(contractHtml, creatorLogoUrl());

		return new ContractView(
			token.toString(),
			String.valueOf(row.get("status")),
			contractHtml,
			String.valueOf(row.get("creator_request_id")),
			String.valueOf(row.getOrDefault("signer_name", "")),
			String.valueOf(row.getOrDefault("signature_data", "")),
			row.get("signed_at") == null ? "" : String.valueOf(row.get("signed_at")),
			String.valueOf(row.getOrDefault("admin_signer_name", "")),
			String.valueOf(row.getOrDefault("admin_signature_data", "")),
			row.get("admin_signed_at") == null ? "" : String.valueOf(row.get("admin_signed_at"))
		);
	}

	public ContractView signByToken(String tokenRaw, SignContractRequest req, String ip, String userAgent) {
		ensureTable();
		UUID token = parseToken(tokenRaw);
		Map<String, Object> row = rowByToken(token);
		String status = String.valueOf(row.get("status")).trim().toLowerCase();
		if (!status.equals("sent")) throw new IllegalArgumentException("contract is archived");

		String signer = (req == null || req.signerName() == null) ? "" : req.signerName().trim();
		if (signer.isBlank()) throw new IllegalArgumentException("signerName is required");
		if (req == null || !req.accept()) throw new IllegalArgumentException("accept must be true");

		Instant now = Instant.now();
		jdbc.update("""
				update creator_request_contracts
				set status = 'creator_signed',
				    signer_name = :signer_name,
				    signature_data = :signature_data,
				    signed_at = :signed_at,
				    signer_ip = :signer_ip,
				    signer_user_agent = :signer_user_agent
				where token = :token
				""",
			new MapSqlParameterSource()
				.addValue("token", token)
				.addValue("signer_name", signer)
				.addValue("signature_data", (req.signatureData() == null ? "" : req.signatureData()))
				.addValue("signed_at", Timestamp.from(now))
				.addValue("signer_ip", ip == null ? "" : ip)
				.addValue("signer_user_agent", userAgent == null ? "" : userAgent)
		);

		Map<String, Object> next = rowByToken(token);
		return new ContractView(
			token.toString(),
			String.valueOf(next.get("status")),
			String.valueOf(next.get("contract_html")),
			String.valueOf(next.get("creator_request_id")),
			String.valueOf(next.getOrDefault("signer_name", "")),
			String.valueOf(next.getOrDefault("signature_data", "")),
			next.get("signed_at") == null ? "" : String.valueOf(next.get("signed_at")),
			String.valueOf(next.getOrDefault("admin_signer_name", "")),
			String.valueOf(next.getOrDefault("admin_signature_data", "")),
			next.get("admin_signed_at") == null ? "" : String.valueOf(next.get("admin_signed_at"))
		);
	}

	public ContractView adminSignLatestByCreatorRequestId(String creatorRequestId, String signerName, String signatureData, String ip, String userAgent) {
		ensureTable();
		ContractView cur = latestByCreatorRequestId(creatorRequestId);
		String status = String.valueOf(cur.status()).trim().toLowerCase();
		if (!"creator_signed".equals(status)) {
			throw new IllegalArgumentException("creator must sign first");
		}
		// Admin signer name is fixed server-side (admin should never have to type it).
		String signer = "Admin";
		Instant now = Instant.now();
		jdbc.update("""
				update creator_request_contracts
				set status = 'fully_signed',
				    admin_signer_name = :admin_signer_name,
				    admin_signature_data = :admin_signature_data,
				    admin_signed_at = :admin_signed_at,
				    admin_signer_ip = :admin_signer_ip,
				    admin_signer_user_agent = :admin_signer_user_agent
				where token = :token
				""",
			new MapSqlParameterSource()
				.addValue("token", java.util.UUID.fromString(cur.token()))
				.addValue("admin_signer_name", signer)
				.addValue("admin_signature_data", signatureData == null ? "" : signatureData)
				.addValue("admin_signed_at", Timestamp.from(now))
				.addValue("admin_signer_ip", ip == null ? "" : ip)
				.addValue("admin_signer_user_agent", userAgent == null ? "" : userAgent)
		);
		return latestByCreatorRequestId(creatorRequestId);
	}

	public ContractView latestByCreatorRequestId(String creatorRequestId) {
		ensureTable();
		try {
			UUID rid = UUID.fromString(creatorRequestId == null ? "" : creatorRequestId.trim());
			Map<String, Object> row = jdbc.queryForMap("""
					select id, creator_request_id, token, status, contract_html,
					  signer_name, signature_data, signed_at,
					  admin_signer_name, admin_signature_data, admin_signed_at
					from creator_request_contracts
					where creator_request_id = :id
					order by created_at desc
					limit 1
					""", Map.of("id", rid));

			String status = String.valueOf(row.get("status")).trim().toLowerCase();
			String contractHtml = String.valueOf(row.get("contract_html"));
			if (!"fully_signed".equals(status)) {
				CreatorRequestDto req = loadCreatorRequestDto(String.valueOf(rid));
				contractHtml = renderContractHtml(req);
				jdbc.update("""
						update creator_request_contracts
						set contract_html = :contract_html
						where token = :token
						""",
					new MapSqlParameterSource()
						.addValue("token", java.util.UUID.fromString(String.valueOf(row.get("token"))))
						.addValue("contract_html", contractHtml)
				);
			}
			contractHtml = replaceLogoPlaceholder(contractHtml, creatorLogoUrl());

			return new ContractView(
				String.valueOf(row.get("token")),
				String.valueOf(row.get("status")),
				contractHtml,
				String.valueOf(row.get("creator_request_id")),
				String.valueOf(row.getOrDefault("signer_name", "")),
				String.valueOf(row.getOrDefault("signature_data", "")),
				row.get("signed_at") == null ? "" : String.valueOf(row.get("signed_at")),
				String.valueOf(row.getOrDefault("admin_signer_name", "")),
				String.valueOf(row.getOrDefault("admin_signature_data", "")),
				row.get("admin_signed_at") == null ? "" : String.valueOf(row.get("admin_signed_at"))
			);
		} catch (Exception e) {
			throw new NotFoundException("Contract not found");
		}
	}

	private CreatorRequestDto loadCreatorRequestDto(String id) {
		try {
			Map<String, Object> row = jdbc.queryForMap("""
					select id, email, creator_email, display_name, pen_name, genres, status, review_reason, created_at, reviewed_at
					from creator_requests
					where id = :id
					limit 1
					""",
				Map.of("id", UUID.fromString(id))
			);
			return new CreatorRequestDto(
				String.valueOf(row.get("id")),
				String.valueOf(row.get("email")),
				String.valueOf(row.get("creator_email")),
				String.valueOf(row.get("display_name")),
				String.valueOf(row.getOrDefault("pen_name", "")),
				String.valueOf(row.getOrDefault("genres", "")),
				String.valueOf(row.getOrDefault("status", "pending")),
				String.valueOf(row.getOrDefault("review_reason", "")),
				row.get("created_at") instanceof java.sql.Timestamp ts ? ts.toInstant() : Instant.now(),
				row.get("reviewed_at") == null ? null : ((java.sql.Timestamp) row.get("reviewed_at")).toInstant()
			);
		} catch (Exception e) {
			throw new NotFoundException("Creator request not found");
		}
	}

	public boolean isSignedForCreatorRequest(String creatorRequestId) {
		ensureTable();
		UUID rid = UUID.fromString(creatorRequestId == null ? "" : creatorRequestId.trim());
		Long count = jdbc.queryForObject("""
				select count(1)
				from creator_request_contracts
				where creator_request_id = :id
				  and status = 'fully_signed'
				""", Map.of("id", rid), Long.class);
		return count != null && count > 0;
	}

	public ContractStatusView latestStatusForCreatorRequest(String creatorRequestId) {
		ensureTable();
		try {
			UUID rid = UUID.fromString(creatorRequestId == null ? "" : creatorRequestId.trim());
			Map<String, Object> row = jdbc.queryForMap("""
					select token, status
					from creator_request_contracts
					where creator_request_id = :id
					order by created_at desc
					limit 1
					""", Map.of("id", rid));
			return new ContractStatusView(
				String.valueOf(row.get("token")),
				String.valueOf(row.get("status"))
			);
		} catch (Exception e) {
			throw new NotFoundException("Contract not found");
		}
	}

	private void maybeSendContractEmail(CreatorRequestDto req, UUID token) {
		if (!emailEnabled) return;
		if (mailHost == null || mailHost.isBlank()) return;

		String frontend = (publicFrontendUrl == null ? "" : publicFrontendUrl.trim());
		String base = (publicBaseUrl == null ? "" : publicBaseUrl.trim());
	
		String chosen = !frontend.isEmpty() ? frontend : base;
		if (chosen.toLowerCase().contains("mangafriq.com") && base.toLowerCase().contains("localhost")) {
			chosen = base;
		}
		// Hard safety: never generate GoDaddy/parked-domain links in local dev by accident.
		if (chosen.toLowerCase().contains("mangafriq.com")) {
			chosen = "http://localhost:5173";
		}
		chosen = chosen.replaceAll("/$", "");

		String link = chosen + "/compte/contrat-createur?token=" + token;
		String subject = "Contrat créateur à signer";
		String text = """
			Bonjour %s,

			Avant de finaliser votre accès créateur, merci de signer le contrat numérique.

			Lien de signature:
			%s

			MangAfriq
			""".formatted(req.displayName(), link);

		
		emailService.sendSimpleEmail(req.email(), subject, text);
		if (req.creatorEmail() != null && !req.creatorEmail().isBlank() && !req.creatorEmail().equalsIgnoreCase(req.email())) {
			emailService.sendSimpleEmail(req.creatorEmail(), subject, text);
		}
	}

	private static UUID parseToken(String raw) {
		try {
			return UUID.fromString(raw == null ? "" : raw.trim());
		} catch (Exception e) {
			throw new NotFoundException("Contract not found");
		}
	}

	private Map<String, Object> rowByToken(UUID token) {
		try {
			return jdbc.queryForMap("""
					select id, creator_request_id, token, status, contract_html,
					  signer_name, signature_data, signed_at,
					  admin_signer_name, admin_signature_data, admin_signed_at
					from creator_request_contracts
					where token = :token
					limit 1
					""", Map.of("token", token));
		} catch (Exception e) {
			throw new NotFoundException("Contract not found");
		}
	}

	private String renderContractHtml(CreatorRequestDto req) {
		String tpl = loadTemplateHtml();
		String creatorName = escapeHtml(req.displayName());
		String creatorEmail = escapeHtml(req.creatorEmail());
		String penName = escapeHtml(req.penName());
		String genres = escapeHtml(req.genres());
		String logoUrl = creatorLogoUrl();
		String html = tpl
			.replace("{{DISPLAY_NAME}}", creatorName)
			.replace("{{CREATOR_EMAIL}}", creatorEmail)
			.replace("{{PEN_NAME}}", penName)
			.replace("{{GENRES}}", genres);
		// Replace logo placeholder last (and robustly) so it never leaks to the client.
		return replaceLogoPlaceholder(html, logoUrl);
	}

	private String creatorLogoUrl() {
		String apiBase = (publicApiBaseUrl == null ? "" : publicApiBaseUrl.trim()).replaceAll("/$", "");
		if (apiBase.isBlank()) apiBase = "http://localhost:8088";
		return apiBase + "/api/v1/assets/creator-panel-logo.png";
	}

	private static final Pattern LOGO_PLACEHOLDER = Pattern.compile("\\{\\{\\s*LOGO_URL\\s*\\}\\}");

	private String replaceLogoPlaceholder(String html, String logoUrl) {
		String h = html == null ? "" : html;
		String url = logoUrl == null ? "" : logoUrl;
		Matcher m = LOGO_PLACEHOLDER.matcher(h);
		return m.replaceAll(Matcher.quoteReplacement(url));
	}

	private String loadTemplateHtml() {
		try (InputStream in = new ClassPathResource("templates/creator-contract-v2.html").getInputStream()) {
			return new String(in.readAllBytes(), StandardCharsets.UTF_8);
		} catch (Exception e) {
			log.warn("Failed to load creator contract template; using fallback", e);
			return "<div><h2>Contrat Créateur — MangAfriq</h2><p>{{DISPLAY_NAME}} — {{CREATOR_EMAIL}}</p></div>";
		}
	}

	private static String escapeHtml(String s) {
		String v = s == null ? "" : s;
		return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
	}

	private void ensureTable() {
		// Flyway V11 created bigint FKs; runtime expects UUID (V24+). Empty legacy tables block
		// "create table if not exists" from fixing the schema — drop when safe.
		jdbc.getJdbcTemplate().execute("""
			do $$
			begin
			  if to_regclass(format('%I.creator_request_contracts', current_schema())) is null then
			    return;
			  end if;
			  if not exists (
			    select 1 from information_schema.columns
			    where table_schema = current_schema()
			      and table_name = 'creator_request_contracts'
			      and column_name = 'creator_request_id'
			      and udt_name <> 'uuid'
			  ) then
			    return;
			  end if;
			  if exists (
			    select 1 from information_schema.columns
			    where table_schema = current_schema()
			      and table_name = 'creator_requests'
			      and column_name = 'id'
			      and udt_name = 'uuid'
			  ) and not exists (select 1 from creator_request_contracts limit 1) then
			    execute 'drop table creator_request_contracts';
			  end if;
			end $$;
			""");
		jdbc.getJdbcTemplate().execute("""
			create table if not exists creator_request_contracts (
			  id uuid primary key,
			  creator_request_id uuid not null references creator_requests(id) on delete cascade,
			  token uuid not null unique,
			  status text not null default 'sent',
			  contract_html text not null,
			  signer_name text,
			  signature_data text,
			  signed_at timestamptz,
			  signer_ip text,
			  signer_user_agent text,
			  admin_signer_name text,
			  admin_signature_data text,
			  admin_signed_at timestamptz,
			  admin_signer_ip text,
			  admin_signer_user_agent text,
			  created_at timestamptz not null default now()
			);
			""");
		jdbc.getJdbcTemplate().execute("""
			alter table if exists creator_request_contracts add column if not exists admin_signer_name text;
			alter table if exists creator_request_contracts add column if not exists admin_signature_data text;
			alter table if exists creator_request_contracts add column if not exists admin_signed_at timestamptz;
			alter table if exists creator_request_contracts add column if not exists admin_signer_ip text;
			alter table if exists creator_request_contracts add column if not exists admin_signer_user_agent text;
			""");
		jdbc.getJdbcTemplate().execute("""
			create index if not exists idx_creator_request_contracts_request_id
			  on creator_request_contracts(creator_request_id);
			""");
	}
}

