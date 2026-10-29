package com.mangafriq.services.store;

import com.mangafriq.dto.store.StoreDtos.CoinPackDto;
import com.mangafriq.dto.store.StoreDtos.CreatePurchaseIntentRequest;
import com.mangafriq.dto.store.StoreDtos.PurchaseIntentDto;
import com.mangafriq.jdbc.UserIdJdbc;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.config.FeatureFlagService;
import com.mangafriq.services.payments.geniuspay.GeniusPayClient;
import com.mangafriq.services.payments.geniuspay.GeniusPayClient.GeniusPayException;
import com.mangafriq.services.payments.geniuspay.GeniusPayClient.Payment;
import com.mangafriq.services.payments.geniuspay.GeniusPayProperties;
import com.mangafriq.services.wallet.WalletService;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
@Slf4j
public class CoinStoreService {
	static final String PROVIDER_GENIUSPAY = "geniuspay";
	private static final Set<String> CLOSED_STATUSES = Set.of("failed", "expired", "cancelled");

	private final NamedParameterJdbcTemplate jdbc;
	private final FeatureFlagService featureFlags;
	private final WalletService walletService;
	private final GeniusPayClient geniusPay;
	private final GeniusPayProperties geniusPayProps;
	private final TransactionTemplate tx;

	@Value("${app.public.base-url:http://localhost:5173}")
	private String publicBaseUrl;

	public CoinStoreService(
			NamedParameterJdbcTemplate jdbc,
			FeatureFlagService featureFlags,
			WalletService walletService,
			GeniusPayClient geniusPay,
			GeniusPayProperties geniusPayProps,
			PlatformTransactionManager txManager
	) {
		this.jdbc = jdbc;
		this.featureFlags = featureFlags;
		this.walletService = walletService;
		this.geniusPay = geniusPay;
		this.geniusPayProps = geniusPayProps;
		this.tx = new TransactionTemplate(txManager);
	}

	public boolean paymentsEnabled() {
		return featureFlags.isEnabled("coins.payments.enabled", false);
	}

	public List<CoinPackDto> coinPacks() {
		// Simple fixed packs for MVP (Côte d’Ivoire / XOF).
		return List.of(
			new CoinPackDto("pack_50", "Starter", 50, "XOF", 500),
			new CoinPackDto("pack_120", "Plus", 120, "XOF", 1000),
			new CoinPackDto("pack_300", "Mega", 300, "XOF", 2000)
		);
	}

	/**
	 * Records the purchase, then (when GeniusPay keys are set) opens a hosted checkout for it.
	 * No DB transaction is held during the GeniusPay call.
	 */
	public PurchaseIntentDto createIntent(String userId, CreatePurchaseIntentRequest req) {
		if (!paymentsEnabled()) throw new IllegalArgumentException("payments are disabled");
		if (req == null) throw new IllegalArgumentException("payload is required");
		String packId = req.packId() == null ? "" : req.packId().trim();
		if (packId.isBlank()) throw new IllegalArgumentException("packId is required");

		CoinPackDto pack = coinPacks().stream().filter(p -> p.id().equals(packId)).findFirst()
			.orElseThrow(() -> new IllegalArgumentException("packId is invalid"));

		String provider = geniusPay.configured() ? PROVIDER_GENIUSPAY : "manual";
		UUID id = UUID.randomUUID();
		Instant now = Instant.now();
		jdbc.update("""
				insert into coin_purchase_intents
				  (id, user_id, pack_id, coins, currency, amount, status, provider, created_at, updated_at)
				values
				  (:id, :user_id, :pack_id, :coins, :currency, :amount, 'pending', :provider, :created_at, :updated_at)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("user_id", UserIdJdbc.param(userId))
				.addValue("pack_id", pack.id())
				.addValue("coins", pack.coins())
				.addValue("currency", pack.currency())
				.addValue("amount", pack.amount())
				.addValue("provider", provider)
				.addValue("created_at", Timestamp.from(now))
				.addValue("updated_at", Timestamp.from(now))
		);

		if (PROVIDER_GENIUSPAY.equals(provider)) {
			openCheckout(id, userId, pack);
		}
		return loadIntent(id);
	}

	private void openCheckout(UUID id, String userId, CoinPackDto pack) {
		Map<String, Object> metadata = new LinkedHashMap<>();
		metadata.put("intent_id", id.toString());
		metadata.put("pack_id", pack.id());
		metadata.put("coins", pack.coins());

		Payment payment;
		try {
			payment = geniusPay.createPayment(
				pack.amount(),
				pack.currency(),
				"MangAfric - " + pack.coins() + " coins (" + pack.title() + ")",
				customerOf(userId),
				returnUrl(geniusPayProps.successUrl(), "success", id),
				returnUrl(geniusPayProps.errorUrl(), "error", id),
				metadata
			);
		} catch (GeniusPayException e) {
			log.warn("GeniusPay payment creation failed for intent {}: {}", id, e.getMessage());
			setStatusIfPending(id, "failed");
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Le paiement est indisponible pour le moment, réessayez plus tard.");
		}
		if (payment.reference() == null || payment.checkoutUrl() == null) {
			setStatusIfPending(id, "failed");
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Réponse de paiement invalide.");
		}

		jdbc.update("""
				update coin_purchase_intents
				set provider_ref = :ref, checkout_url = :url, updated_at = now()
				where id = :id
				""", new MapSqlParameterSource()
			.addValue("id", id)
			.addValue("ref", payment.reference())
			.addValue("url", payment.checkoutUrl()));
	}

	/** The reader's own intent. A pending GeniusPay intent is re-checked with GeniusPay first, so the
	 *  store page can confirm a payment even when the webhook never reached us. */
	public PurchaseIntentDto getIntent(String userId, String idRaw) {
		UUID id = parseId(idRaw);
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select id, provider, provider_ref, status
				from coin_purchase_intents
				where id = :id and user_id = :user_id
				""", new MapSqlParameterSource().addValue("id", id).addValue("user_id", UserIdJdbc.param(userId)));
		if (rows.isEmpty()) throw new NotFoundException("Intent not found");
		Map<String, Object> row = rows.get(0);
		if (PROVIDER_GENIUSPAY.equals(row.get("provider")) && "pending".equals(row.get("status")) && row.get("provider_ref") != null) {
			try {
				syncWithGeniusPay(id, String.valueOf(row.get("provider_ref")));
			} catch (GeniusPayException e) {
				log.warn("GeniusPay status check failed for intent {}: {}", id, e.getMessage());
			}
		}
		return loadIntent(id);
	}

	/**
	 * Webhook entry point. The webhook body is only a hint: the payment is always re-read from
	 * GeniusPay before coins are credited. Returns false when no intent matches the reference.
	 */
	public boolean syncByReference(String reference) {
		if (reference == null || reference.isBlank()) return false;
		List<UUID> ids = jdbc.queryForList("""
				select id from coin_purchase_intents
				where provider = :provider and provider_ref = :ref
				""", new MapSqlParameterSource().addValue("provider", PROVIDER_GENIUSPAY).addValue("ref", reference.trim()), UUID.class);
		if (ids.isEmpty()) return false;
		syncWithGeniusPay(ids.get(0), reference.trim());
		return true;
	}

	private void syncWithGeniusPay(UUID id, String reference) {
		Payment payment = geniusPay.getPayment(reference);
		String status = payment.status() == null ? "" : payment.status().trim().toLowerCase();
		if (payment.completed()) {
			Map<String, Object> intent = jdbc.queryForMap(
				"select amount, currency from coin_purchase_intents where id = :id", Map.of("id", id));
			BigDecimal expected = BigDecimal.valueOf(((Number) intent.get("amount")).longValue());
			boolean amountOk = payment.amount() != null && payment.amount().compareTo(expected) >= 0;
			boolean currencyOk = payment.currency() == null || payment.currency().equalsIgnoreCase(String.valueOf(intent.get("currency")));
			if (!amountOk || !currencyOk) {
				log.error("GeniusPay payment {} for intent {} does not match: got {} {}, expected {} {}",
					reference, id, payment.amount(), payment.currency(), expected, intent.get("currency"));
				return;
			}
			markPaid(id);
		} else if (CLOSED_STATUSES.contains(status)) {
			setStatusIfPending(id, status);
		} else if ("refunded".equals(status)) {
			log.warn("GeniusPay payment {} for intent {} was refunded; coins are not taken back automatically", reference, id);
		}
	}

	public PurchaseIntentDto adminMarkPaid(String idRaw) {
		UUID id = parseId(idRaw);
		loadIntent(id);
		markPaid(id);
		return loadIntent(id);
	}

	/**
	 * Flips the intent to paid and credits its coins in one transaction. The conditional update
	 * lets exactly one caller win, so concurrent webhooks / polls / admin clicks credit once.
	 */
	private void markPaid(UUID id) {
		tx.executeWithoutResult(status -> {
			List<Map<String, Object>> won = jdbc.queryForList("""
					update coin_purchase_intents
					set status = 'paid', paid_at = now(), updated_at = now()
					where id = :id and status <> 'paid'
					returning user_id::text as user_id, coins
					""", Map.of("id", id));
			if (won.isEmpty()) return;
			Map<String, Object> row = won.get(0);
			walletService.creditPurchase(String.valueOf(row.get("user_id")), ((Number) row.get("coins")).intValue(), id.toString());
		});
	}

	private void setStatusIfPending(UUID id, String status) {
		jdbc.update("""
				update coin_purchase_intents
				set status = :status, updated_at = now()
				where id = :id and status = 'pending'
				""", new MapSqlParameterSource().addValue("id", id).addValue("status", status));
	}

	private Map<String, Object> customerOf(String userId) {
		List<Map<String, Object>> rows = jdbc.queryForList(
			"select email, display_name from app_users where id = :id", Map.of("id", UserIdJdbc.param(userId)));
		Map<String, Object> customer = new LinkedHashMap<>();
		if (rows.isEmpty()) return customer;
		Object email = rows.get(0).get("email");
		Object name = rows.get(0).get("display_name");
		if (email != null) customer.put("email", String.valueOf(email));
		if (name != null && !String.valueOf(name).isBlank()) customer.put("name", String.valueOf(name));
		return customer;
	}

	/** Configured return URL, or the reader site's store page, tagged with the outcome and intent id. */
	private String returnUrl(String configured, String outcome, UUID id) {
		String base = configured != null && !configured.isBlank()
			? configured.trim()
			: (publicBaseUrl == null ? "" : publicBaseUrl.trim().replaceAll("/+$", "")) + "/store";
		return base + (base.contains("?") ? "&" : "?") + "payment=" + outcome + "&intent=" + id;
	}

	private static UUID parseId(String idRaw) {
		try {
			return UUID.fromString(idRaw == null ? "" : idRaw.trim());
		} catch (Exception e) {
			throw new NotFoundException("Intent not found");
		}
	}

	private PurchaseIntentDto loadIntent(UUID id) {
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select id::text as id, pack_id, coins, currency, amount, status, provider, provider_ref, checkout_url, created_at
				from coin_purchase_intents
				where id = :id
				limit 1
				""", Map.of("id", id));
		if (rows.isEmpty()) throw new NotFoundException("Intent not found");
		return mapRow(rows.get(0));
	}

	private static PurchaseIntentDto mapRow(Map<String, Object> row) {
		Instant createdAt = Instant.now();
		Object ca = row.get("created_at");
		if (ca instanceof Timestamp ts) createdAt = ts.toInstant();
		else if (ca != null && !"null".equals(String.valueOf(ca))) {
			try { createdAt = Instant.parse(String.valueOf(ca)); } catch (Exception ignored) {}
		}
		return new PurchaseIntentDto(
			String.valueOf(row.get("id")),
			String.valueOf(row.get("pack_id")),
			((Number) row.get("coins")).intValue(),
			String.valueOf(row.get("currency")),
			((Number) row.get("amount")).intValue(),
			String.valueOf(row.get("status")),
			String.valueOf(row.get("provider")),
			row.get("provider_ref") == null ? null : String.valueOf(row.get("provider_ref")),
			createdAt,
			row.get("checkout_url") == null ? null : String.valueOf(row.get("checkout_url"))
		);
	}
}
