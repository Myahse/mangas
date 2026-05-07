package com.mangafriq.services.store;

import com.mangafriq.dto.store.StoreDtos.CoinPackDto;
import com.mangafriq.dto.store.StoreDtos.CreatePurchaseIntentRequest;
import com.mangafriq.dto.store.StoreDtos.PurchaseIntentDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.config.FeatureFlagService;
import com.mangafriq.services.wallet.WalletService;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CoinStoreService {
	private final NamedParameterJdbcTemplate jdbc;
	private final FeatureFlagService featureFlags;
	private final WalletService walletService;

	public CoinStoreService(NamedParameterJdbcTemplate jdbc, FeatureFlagService featureFlags, WalletService walletService) {
		this.jdbc = jdbc;
		this.featureFlags = featureFlags;
		this.walletService = walletService;
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

	@Transactional
	public PurchaseIntentDto createIntent(String userId, CreatePurchaseIntentRequest req) {
		if (!paymentsEnabled()) throw new IllegalArgumentException("payments are disabled");
		if (req == null) throw new IllegalArgumentException("payload is required");
		String packId = req.packId() == null ? "" : req.packId().trim();
		if (packId.isBlank()) throw new IllegalArgumentException("packId is required");

		CoinPackDto pack = coinPacks().stream().filter(p -> p.id().equals(packId)).findFirst()
			.orElseThrow(() -> new IllegalArgumentException("packId is invalid"));

		UUID id = UUID.randomUUID();
		Instant now = Instant.now();
		jdbc.update("""
				insert into coin_purchase_intents
				  (id, user_id, pack_id, coins, currency, amount, status, provider, created_at, updated_at)
				values
				  (:id, :user_id, :pack_id, :coins, :currency, :amount, 'pending', 'manual', :created_at, :updated_at)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("user_id", java.util.UUID.fromString(userId))
				.addValue("pack_id", pack.id())
				.addValue("coins", pack.coins())
				.addValue("currency", pack.currency())
				.addValue("amount", pack.amount())
				.addValue("created_at", Timestamp.from(now))
				.addValue("updated_at", Timestamp.from(now))
		);

		return new PurchaseIntentDto(id.toString(), pack.id(), pack.coins(), pack.currency(), pack.amount(), "pending", "manual", null, now);
	}

	@Transactional
	public PurchaseIntentDto adminMarkPaid(String idRaw) {
		UUID id;
		try {
			id = UUID.fromString(idRaw == null ? "" : idRaw.trim());
		} catch (Exception e) {
			throw new NotFoundException("Intent not found");
		}

		List<Map<String, Object>> rows = jdbc.queryForList("""
				select id::text as id, user_id, pack_id, coins, currency, amount, status, provider, provider_ref, created_at
				from coin_purchase_intents
				where id = :id
				limit 1
				""", Map.of("id", id));

		if (rows.isEmpty()) throw new NotFoundException("Intent not found");
		Map<String, Object> row = rows.get(0);
		String status = String.valueOf(row.get("status"));
		if ("paid".equalsIgnoreCase(status)) {
			return mapRow(row);
		}

		Instant now = Instant.now();
		jdbc.update("""
				update coin_purchase_intents
				set status = 'paid',
				    updated_at = :updated_at
				where id = :id
				""", new MapSqlParameterSource()
			.addValue("id", id)
			.addValue("updated_at", Timestamp.from(now)));

		String userId = String.valueOf(row.get("user_id"));
		int coins = ((Number) row.get("coins")).intValue();
		// Credit wallet ledger
		jdbc.update("""
				insert into coin_ledger (id, user_id, type, amount, ref_type, ref_id, created_at)
				values (:id, :user_id, 'PURCHASE_TOPUP', :amount, 'purchase_intent', :ref_id, :created_at)
				""", new MapSqlParameterSource()
			.addValue("id", UUID.randomUUID())
			.addValue("user_id", java.util.UUID.fromString(userId))
			.addValue("amount", coins)
			.addValue("ref_id", id.toString())
			.addValue("created_at", Timestamp.from(now)));

		// Return fresh row
		Map<String, Object> next = jdbc.queryForMap("""
				select id::text as id, user_id, pack_id, coins, currency, amount, status, provider, provider_ref, created_at
				from coin_purchase_intents
				where id = :id
				limit 1
				""", Map.of("id", id));

		// ensure balance is up-to-date (touch)
		walletService.balance(userId);
		return mapRow(next);
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
			createdAt
		);
	}
}

