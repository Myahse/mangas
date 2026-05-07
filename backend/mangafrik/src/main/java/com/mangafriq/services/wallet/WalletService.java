package com.mangafriq.services.wallet;

import com.mangafriq.services.config.FeatureFlagService;
import com.mangafriq.dto.wallet.WalletDtos.AdminGrantCoinsRequest;
import com.mangafriq.dto.wallet.WalletDtos.AdminGrantCoinsResponse;
import com.mangafriq.dto.wallet.WalletDtos.DailyClaimResponse;
import com.mangafriq.dto.wallet.WalletDtos.LedgerRowDto;
import com.mangafriq.dto.wallet.WalletDtos.PendingReferralRewardDto;
import com.mangafriq.dto.wallet.WalletDtos.UnlockResponse;
import com.mangafriq.dto.wallet.WalletDtos.WalletDto;
import com.mangafriq.dto.wallet.WalletDtos.ClaimReferralRewardResponse;
import com.mangafriq.dto.wallet.WalletDtos.WalletUpdateEvent;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.realtime.WalletRealtime;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WalletService {
	private final NamedParameterJdbcTemplate jdbc;
	private final FeatureFlagService featureFlags;
	private final WalletRealtime walletRealtime;
	private volatile Boolean coinLedgerHasBucketCache = null;

	@Value("${app.coins.rewards.enabled:true}")
	private boolean rewardsEnabled;

	@Value("${app.coins.payments.enabled:false}")
	private boolean paymentsEnabled;

	@Value("${app.coins.daily-claim.amount:5}")
	private int dailyClaimAmount;

	@Value("${app.coins.price.chapter:10}")
	private int chapterUnlockPrice;

	@Value("${app.coins.price.manga:120}")
	private int mangaUnlockPrice;

	@Value("${app.coins.referral.referrer-bonus:20}")
	private int referralReferrerBonus;

	@Value("${app.public.base-url:http://localhost:5173}")
	private String publicBaseUrl;

	public WalletService(NamedParameterJdbcTemplate jdbc, FeatureFlagService featureFlags, WalletRealtime walletRealtime) {
		this.jdbc = jdbc;
		this.featureFlags = featureFlags;
		this.walletRealtime = walletRealtime;
	}

	public WalletDto wallet(String userId) {
		int balTotal = balance(userId);
		int balPaid = balancePaid(userId);
		int balReward = balanceReward(userId);

		List<LedgerRowDto> recent;
		try {
			recent = jdbc.query("""
					select id::text as id, type, amount, ref_type, ref_id, created_at
					from coin_ledger
					where user_id = :user_id
					order by created_at desc
					limit 30
					""",
				Map.of("user_id", UUID.fromString(userId)),
				(rs, i) -> new LedgerRowDto(
					rs.getString("id"),
					rs.getString("type"),
					rs.getInt("amount"),
					rs.getString("ref_type"),
					rs.getString("ref_id"),
					rs.getTimestamp("created_at").toInstant()
				)
			);
		} catch (BadSqlGrammarException e) {
			// Migrations not applied yet (coin_ledger missing). Avoid crashing the app.
			recent = List.of();
		}

		boolean rewards = rewardsEnabled;
		boolean payments = paymentsEnabled;
		try {
			rewards = featureFlags.isEnabled("coins.rewards.enabled", rewardsEnabled);
			payments = featureFlags.isEnabled("coins.payments.enabled", paymentsEnabled);
		} catch (Exception ignored) {}
		return new WalletDto(balTotal, balPaid, balReward, recent, rewards, payments);
	}

	public int balance(String userId) {
		try {
			Integer v = jdbc.queryForObject("""
					select coalesce(sum(amount), 0)
					from coin_ledger
					where user_id = :user_id
					""", Map.of("user_id", UUID.fromString(userId)), Integer.class);
			return v == null ? 0 : v;
		} catch (BadSqlGrammarException e) {
			return 0;
		}
	}

	public int balancePaid(String userId) {
		try {
			Integer v = jdbc.queryForObject("""
					select coalesce(sum(amount), 0)
					from coin_ledger
					where user_id = :user_id
					  and upper(bucket) = 'PAID'
					""", Map.of("user_id", UUID.fromString(userId)), Integer.class);
			return v == null ? 0 : v;
		} catch (BadSqlGrammarException e) {
			return 0;
		}
	}

	public int balanceReward(String userId) {
		try {
			Integer v = jdbc.queryForObject("""
					select coalesce(sum(amount), 0)
					from coin_ledger
					where user_id = :user_id
					  and upper(bucket) = 'REWARD'
					""", Map.of("user_id", UUID.fromString(userId)), Integer.class);
			return v == null ? 0 : v;
		} catch (BadSqlGrammarException e) {
			return 0;
		}
	}

	@Transactional
	public String getOrCreateReferralCode(String userId) {
		lockUserRow(userId);
		try {
			List<Map<String, Object>> rows = jdbc.queryForList("""
					select referral_code
					from app_users
					where id = :id
					limit 1
					""", Map.of("id", UUID.fromString(userId)));
			String existing = rows.isEmpty() ? "" : String.valueOf(rows.get(0).getOrDefault("referral_code", "")).trim();
			if (!existing.isBlank() && !"null".equalsIgnoreCase(existing)) return existing;
		} catch (BadSqlGrammarException e) {
			// Migrations not applied yet.
			return "";
		}

		for (int i = 0; i < 6; i++) {
			String code = randomReferralCode(8);
			int updated = jdbc.update("""
					update app_users
					set referral_code = :code
					where id = :id
					  and (referral_code is null or trim(referral_code) = '')
					""", new MapSqlParameterSource()
				.addValue("id", UUID.fromString(userId))
				.addValue("code", code));
			if (updated == 1) return code;
		}
		// Fallback: read whatever is stored now.
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select referral_code
				from app_users
				where id = :id
				limit 1
				""", Map.of("id", UUID.fromString(userId)));
		return rows.isEmpty() ? "" : String.valueOf(rows.get(0).getOrDefault("referral_code", "")).trim();
	}

	@Transactional
	public boolean createPendingReferralReward(String referredUserId) {
		// Creates a pending reward for the referrer, to be claimed later via UI modal.
		try {
			List<Map<String, Object>> rows = jdbc.queryForList("""
					select referred_by_user_id, referral_rewarded
					from app_users
					where id = :id
					limit 1
					""", Map.of("id", UUID.fromString(referredUserId)));
			if (rows.isEmpty()) return false;
			Map<String, Object> row = rows.get(0);
			Object refByObj = row.get("referred_by_user_id");
			boolean rewarded = Boolean.parseBoolean(String.valueOf(row.getOrDefault("referral_rewarded", "false")));
			if (rewarded) return false;
			if (refByObj == null) return false;
			String referrerId = String.valueOf(refByObj);
			if (referrerId.isBlank() || "null".equalsIgnoreCase(referrerId)) return false;
			if (referrerId.equalsIgnoreCase(referredUserId)) return false;

			// Lock both users.
			List<String> ids = new ArrayList<>();
			ids.add(referrerId);
			ids.add(referredUserId);
			ids.sort(String::compareTo);
			for (String id : ids) lockUserRow(id);

			// If already created, no-op.
			Integer existing = jdbc.queryForObject("""
					select count(*)
					from referral_rewards
					where referred_user_id = :referred
					""", Map.of("referred", UUID.fromString(referredUserId)), Integer.class);
			if (existing != null && existing > 0) {
				return false;
			}

			int amt = Math.max(0, referralReferrerBonus);
			if (amt == 0) return false;
			Instant now = Instant.now();
			jdbc.update("""
					insert into referral_rewards (id, referrer_user_id, referred_user_id, amount, status, created_at)
					values (:id, :referrer, :referred, :amount, 'pending', :created_at)
					""", new MapSqlParameterSource()
				.addValue("id", UUID.randomUUID())
				.addValue("referrer", UUID.fromString(referrerId))
				.addValue("referred", UUID.fromString(referredUserId))
				.addValue("amount", amt)
				.addValue("created_at", Timestamp.from(now)));

			jdbc.update("""
					update app_users
					set referral_rewarded = true
					where id = :id
					""", Map.of("id", UUID.fromString(referredUserId)));
			return true;
		} catch (BadSqlGrammarException e) {
			return false;
		}
	}

	public List<PendingReferralRewardDto> listPendingReferralRewards(String referrerUserId) {
		try {
			return jdbc.query("""
					select rr.id::text as id, rr.amount, rr.created_at, u.display_name as referred_display_name
					from referral_rewards rr
					join app_users u on u.id = rr.referred_user_id
					where rr.referrer_user_id = :uid
					  and rr.status = 'pending'
					order by rr.created_at desc
					limit 20
					""",
				Map.of("uid", UUID.fromString(referrerUserId)),
				(rs, i) -> new PendingReferralRewardDto(
					rs.getString("id"),
					rs.getInt("amount"),
					rs.getString("referred_display_name"),
					rs.getTimestamp("created_at").toInstant()
				)
			);
		} catch (BadSqlGrammarException e) {
			return List.of();
		}
	}

	@Transactional
	public ClaimReferralRewardResponse claimReferralReward(String referrerUserId, String rewardIdRaw) {
		UUID rewardId;
		try {
			rewardId = UUID.fromString(rewardIdRaw == null ? "" : rewardIdRaw.trim());
		} catch (Exception e) {
			throw new IllegalArgumentException("reward id is invalid");
		}
		lockUserRow(referrerUserId);
		try {
			List<Map<String, Object>> rows = jdbc.queryForList("""
					select id, amount, status, referred_user_id
					from referral_rewards
					where id = :id
					  and referrer_user_id = :uid
					limit 1
					""", Map.of("id", rewardId, "uid", UUID.fromString(referrerUserId)));
			if (rows.isEmpty()) throw new NotFoundException("Reward not found");
			Map<String, Object> row = rows.get(0);
			String status = String.valueOf(row.get("status"));
			int amt = ((Number) row.get("amount")).intValue();
			if ("claimed".equalsIgnoreCase(status)) {
				return new ClaimReferralRewardResponse(false, amt, balance(referrerUserId), balancePaid(referrerUserId), balanceReward(referrerUserId));
			}
			Instant now = Instant.now();
			jdbc.update("""
					update referral_rewards
					set status = 'claimed',
					    claimed_at = :at
					where id = :id
					  and referrer_user_id = :uid
					  and status = 'pending'
					""", new MapSqlParameterSource()
				.addValue("id", rewardId)
				.addValue("uid", UUID.fromString(referrerUserId))
				.addValue("at", Timestamp.from(now)));

			credit(referrerUserId, "REFERRAL_BONUS", Math.max(0, amt), "referral_reward", rewardId.toString());
			ClaimReferralRewardResponse out = new ClaimReferralRewardResponse(true, amt, balance(referrerUserId), balancePaid(referrerUserId), balanceReward(referrerUserId));
			publishWalletUpdate(referrerUserId, out.balance(), out.balancePaid(), out.balanceReward(), "referral_claimed");
			return out;
		} catch (BadSqlGrammarException e) {
			throw new IllegalStateException("referrals are not available (migrations missing)");
		}
	}

	public String findUserIdByReferralCode(String codeRaw) {
		String code = codeRaw == null ? "" : codeRaw.trim().toLowerCase();
		if (code.isBlank()) return null;
		try {
			List<Map<String, Object>> rows = jdbc.queryForList("""
					select id
					from app_users
					where lower(referral_code) = :code
					limit 1
					""", Map.of("code", code));
			if (rows.isEmpty()) return null;
			return String.valueOf(rows.get(0).get("id"));
		} catch (BadSqlGrammarException e) {
			return null;
		}
	}

	@Transactional
	public void attachReferrerIfMissing(String userId, String referrerId) {
		if (userId == null || userId.isBlank()) return;
		if (referrerId == null || referrerId.isBlank()) return;
		if (userId.equalsIgnoreCase(referrerId)) return;
		lockUserRow(userId);
		Instant now = Instant.now();
		try {
			jdbc.update("""
					update app_users
					set referred_by_user_id = :referrer_id,
					    referred_at = :referred_at
					where id = :id
					  and referred_by_user_id is null
					""", new MapSqlParameterSource()
				.addValue("id", UUID.fromString(userId))
				.addValue("referrer_id", UUID.fromString(referrerId))
				.addValue("referred_at", Timestamp.from(now)));
		} catch (BadSqlGrammarException ignored) {}
	}

	public String referralLinkForCode(String codeRaw) {
		String code = codeRaw == null ? "" : codeRaw.trim();
		if (code.isBlank()) return "";
		String base = (publicBaseUrl == null ? "" : publicBaseUrl.trim());
		if (base.isBlank()) base = "http://localhost:5173";
		base = base.replaceAll("/+$", "");
		return base + "/register?ref=" + code;
	}

	private static String randomReferralCode(int length) {
		final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		Random rng = new Random();
		StringBuilder sb = new StringBuilder(length);
		for (int i = 0; i < length; i++) sb.append(alphabet.charAt(rng.nextInt(alphabet.length())));
		return sb.toString();
	}

	@Transactional
	public DailyClaimResponse dailyClaim(String userId) {
		boolean rewards = rewardsEnabled;
		try {
			rewards = featureFlags.isEnabled("coins.rewards.enabled", rewardsEnabled);
		} catch (Exception ignored) {}
		if (!rewards) {
			int bal = balance(userId);
			return new DailyClaimResponse(false, 0, bal, null);
		}
		lockUserRow(userId);
		Instant now = Instant.now();

		List<Map<String, Object>> rows;
		try {
			rows = jdbc.queryForList("""
					select last_claim_at, last_claim_date
					from daily_coin_claims
					where user_id = :user_id
					limit 1
					""", Map.of("user_id", UUID.fromString(userId)));
		} catch (BadSqlGrammarException e) {
			// Migrations not applied yet (daily_coin_claims missing). Avoid crashing the app.
			int bal = balance(userId);
			return new DailyClaimResponse(false, 0, bal, null);
		}

		if (!rows.isEmpty()) {
			Instant prevAt = readLastClaimAt(rows.get(0));
			if (prevAt != null) {
				Instant eligibleAt = prevAt.plus(Duration.ofHours(24));
				if (eligibleAt.isAfter(now)) {
					int bal = balance(userId);
					return new DailyClaimResponse(false, 0, bal, eligibleAt);
				}
			} else {
				// Legacy fallback: once per UTC day (kept for compatibility).
				LocalDate today = LocalDate.now(ZoneOffset.UTC);
				Object prevObj = rows.get(0).get("last_claim_date");
				LocalDate prev = prevObj instanceof Date d ? d.toLocalDate() : LocalDate.parse(String.valueOf(prevObj));
				if (!prev.isBefore(today)) {
					int bal = balance(userId);
					return new DailyClaimResponse(false, 0, bal, null);
				}
			}
			LocalDate today = LocalDate.now(ZoneOffset.UTC);
			Date todaySql = Date.valueOf(today);
			jdbc.update("""
					update daily_coin_claims
					set last_claim_date = :d,
					    last_claim_at = :at
					where user_id = :user_id
					""", new MapSqlParameterSource()
				.addValue("d", todaySql)
				.addValue("at", Timestamp.from(now))
				.addValue("user_id", UUID.fromString(userId)));
		} else {
			LocalDate today = LocalDate.now(ZoneOffset.UTC);
			Date todaySql = Date.valueOf(today);
			jdbc.update("""
					insert into daily_coin_claims (user_id, last_claim_date, last_claim_at)
					values (:user_id, :d, :at)
					""", new MapSqlParameterSource()
				.addValue("user_id", UUID.fromString(userId))
				.addValue("d", todaySql)
				.addValue("at", Timestamp.from(now)));
		}

		int credited = Math.max(0, dailyClaimAmount);
		if (credited == 0) {
			int bal = balance(userId);
			return new DailyClaimResponse(false, 0, bal, null);
		}
		credit(userId, "DAILY_REWARD", credited, "daily", String.valueOf(now));
		int bal = balance(userId);
		DailyClaimResponse out = new DailyClaimResponse(true, credited, bal, now.plus(Duration.ofHours(24)));
		publishWalletUpdate(userId, bal, balancePaid(userId), balanceReward(userId), "daily_claim");
		return out;
	}

	public com.mangafriq.dto.wallet.WalletDtos.DailyClaimStatusResponse dailyClaimStatus(String userId) {
		boolean rewards = rewardsEnabled;
		try {
			rewards = featureFlags.isEnabled("coins.rewards.enabled", rewardsEnabled);
		} catch (Exception ignored) {}
		int amount = Math.max(0, dailyClaimAmount);
		if (!rewards) {
			return new com.mangafriq.dto.wallet.WalletDtos.DailyClaimStatusResponse(false, false, amount, null, null);
		}
		Instant now = Instant.now();
		try {
			List<Map<String, Object>> rows = jdbc.queryForList("""
					select last_claim_at, last_claim_date
					from daily_coin_claims
					where user_id = :user_id
					limit 1
					""", Map.of("user_id", UUID.fromString(userId)));
			if (rows.isEmpty()) {
				return new com.mangafriq.dto.wallet.WalletDtos.DailyClaimStatusResponse(true, true, amount, null, now);
			}
			Instant prevAt = readLastClaimAt(rows.get(0));
			if (prevAt == null) {
				LocalDate today = LocalDate.now(ZoneOffset.UTC);
				Object prevObj = rows.get(0).get("last_claim_date");
				LocalDate prev = prevObj instanceof Date d ? d.toLocalDate() : LocalDate.parse(String.valueOf(prevObj));
				boolean can = prev.isBefore(today);
				return new com.mangafriq.dto.wallet.WalletDtos.DailyClaimStatusResponse(true, can, amount, null, can ? now : null);
			}
			Instant eligibleAt = prevAt.plus(Duration.ofHours(24));
			boolean canClaim = !eligibleAt.isAfter(now);
			return new com.mangafriq.dto.wallet.WalletDtos.DailyClaimStatusResponse(true, canClaim, amount, prevAt, eligibleAt);
		} catch (BadSqlGrammarException e) {
			return new com.mangafriq.dto.wallet.WalletDtos.DailyClaimStatusResponse(true, false, amount, null, null);
		}
	}

	private static Instant readLastClaimAt(Map<String, Object> row) {
		Object v = row.get("last_claim_at");
		if (v instanceof Timestamp ts) return ts.toInstant();
		if (v instanceof java.time.OffsetDateTime odt) return odt.toInstant();
		if (v instanceof java.time.Instant i) return i;
		if (v == null) return null;
		String s = String.valueOf(v).trim();
		if (s.isBlank() || "null".equalsIgnoreCase(s)) return null;
		try {
			return Instant.parse(s);
		} catch (Exception ignored) {
			return null;
		}
	}

	@Transactional
	public UnlockResponse unlockManga(String userId, String mangaSlugRaw) {
		String slug = normalizeSlug(mangaSlugRaw);
		lockUserRow(userId);
		boolean already = hasMangaEntitlement(userId, slug);
		if (already) {
			return new UnlockResponse(false, 0, balance(userId));
		}
		int price = Math.max(0, mangaUnlockPrice);
		spendOrThrow(userId, price, "SPEND_UNLOCK_MANGA", "manga", slug);
		insertEntitlement(userId, "MANGA", slug, -1);
		int bal = balance(userId);
		UnlockResponse out = new UnlockResponse(true, price, bal);
		publishWalletUpdate(userId, bal, balancePaid(userId), balanceReward(userId), "unlock_manga");
		return out;
	}

	@Transactional
	public UnlockResponse unlockChapter(String userId, String mangaSlugRaw, int chapterNumber) {
		String slug = normalizeSlug(mangaSlugRaw);
		if (chapterNumber < 1) throw new IllegalArgumentException("chapterNumber is invalid");
		lockUserRow(userId);

		if (hasMangaEntitlement(userId, slug) || hasChapterEntitlement(userId, slug, chapterNumber)) {
			return new UnlockResponse(false, 0, balance(userId));
		}

		int price = Math.max(0, chapterUnlockPrice);
		spendOrThrow(userId, price, "SPEND_UNLOCK_CHAPTER", "chapter", slug + "#" + chapterNumber);
		insertEntitlement(userId, "CHAPTER", slug, chapterNumber);
		int bal = balance(userId);
		UnlockResponse out = new UnlockResponse(true, price, bal);
		publishWalletUpdate(userId, bal, balancePaid(userId), balanceReward(userId), "unlock_chapter");
		return out;
	}

	@Transactional
	public AdminGrantCoinsResponse adminGrant(AdminGrantCoinsRequest req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		int amount = req.amount();
		if (amount <= 0) throw new IllegalArgumentException("amount must be positive");

		String userId = null;
		String userIdRaw = req.userId() == null ? "" : req.userId().trim();
		if (!userIdRaw.isBlank()) {
			try {
				userId = UUID.fromString(userIdRaw).toString();
			} catch (Exception ignored) {}
		}
		if (userId == null) {
			String email = (req.email() == null ? "" : req.email().trim()).toLowerCase();
			if (email.isBlank() || !email.contains("@")) throw new IllegalArgumentException("email is invalid");
			userId = findUserIdByEmail(email);
		}

		lockUserRow(userId);
		String note = req.note() == null ? "" : req.note().trim();
		credit(userId, "ADMIN_GRANT", amount, "admin_note", note.isBlank() ? null : note);
		int bal = balance(userId);
		AdminGrantCoinsResponse out = new AdminGrantCoinsResponse(String.valueOf(userId), amount, bal);
		publishWalletUpdate(userId, bal, balancePaid(userId), balanceReward(userId), "admin_grant");
		return out;
	}

	public boolean hasMangaEntitlement(String userId, String slug) {
		Integer c = jdbc.queryForObject("""
				select count(*)
				from content_entitlements
				where user_id = :user_id
				  and upper(scope) = 'MANGA'
				  and manga_slug = :slug
				  and chapter_number = -1
				""", Map.of("user_id", UUID.fromString(userId), "slug", slug), Integer.class);
		return c != null && c > 0;
	}

	public boolean hasChapterEntitlement(String userId, String slug, int chapterNumber) {
		Integer c = jdbc.queryForObject("""
				select count(*)
				from content_entitlements
				where user_id = :user_id
				  and (
				    (upper(scope) = 'MANGA' and manga_slug = :slug and chapter_number = -1)
				    or
				    (upper(scope) = 'CHAPTER' and manga_slug = :slug and chapter_number = :chapter_number)
				  )
				""", Map.of("user_id", UUID.fromString(userId), "slug", slug, "chapter_number", chapterNumber), Integer.class);
		return c != null && c > 0;
	}

	private void insertEntitlement(String userId, String scope, String slug, int chapterNumber) {
		Instant now = Instant.now();
		jdbc.update("""
				insert into content_entitlements (id, user_id, scope, manga_slug, chapter_number, unlocked_at)
				values (:id, :user_id, :scope, :slug, :chapter_number, :unlocked_at)
				on conflict (user_id, scope, manga_slug, chapter_number) do nothing
				""", new MapSqlParameterSource()
			.addValue("id", UUID.randomUUID())
			.addValue("user_id", UUID.fromString(userId))
			.addValue("scope", scope)
			.addValue("slug", slug)
			.addValue("chapter_number", chapterNumber)
			.addValue("unlocked_at", Timestamp.from(now)));
	}

	private void spendOrThrow(String userId, int amount, String type, String refType, String refId) {
		if (amount <= 0) return;
		int bal = balance(userId);
		if (bal < amount) throw new IllegalArgumentException("insufficient coins");
		credit(userId, type, -amount, refType, refId);
	}

	private void credit(String userId, String type, int amount, String refType, String refId) {
		Instant now = Instant.now();
		String bucket = inferBucket(type, amount);
		if (coinLedgerHasBucket()) {
			jdbc.update("""
					insert into coin_ledger (id, user_id, type, amount, ref_type, ref_id, created_at, bucket)
					values (:id, :user_id, :type, :amount, :ref_type, :ref_id, :created_at, :bucket)
					""", new MapSqlParameterSource()
				.addValue("id", UUID.randomUUID())
				.addValue("user_id", UUID.fromString(userId))
				.addValue("type", type)
				.addValue("amount", amount)
				.addValue("ref_type", refType)
				.addValue("ref_id", refId)
				.addValue("created_at", Timestamp.from(now))
				.addValue("bucket", bucket));
		} else {
			jdbc.update("""
					insert into coin_ledger (id, user_id, type, amount, ref_type, ref_id, created_at)
					values (:id, :user_id, :type, :amount, :ref_type, :ref_id, :created_at)
					""", new MapSqlParameterSource()
				.addValue("id", UUID.randomUUID())
				.addValue("user_id", UUID.fromString(userId))
				.addValue("type", type)
				.addValue("amount", amount)
				.addValue("ref_type", refType)
				.addValue("ref_id", refId)
				.addValue("created_at", Timestamp.from(now)));
		}
	}

	private boolean coinLedgerHasBucket() {
		Boolean cached = coinLedgerHasBucketCache;
		if (cached != null) return cached;
		synchronized (this) {
			Boolean cached2 = coinLedgerHasBucketCache;
			if (cached2 != null) return cached2;
			try {
				Integer n = jdbc.queryForObject("""
						select count(*)
						from information_schema.columns
						where table_name = 'coin_ledger'
						  and column_name = 'bucket'
						""", Map.of(), Integer.class);
				boolean ok = n != null && n > 0;
				coinLedgerHasBucketCache = ok;
				return ok;
			} catch (Exception e) {
				coinLedgerHasBucketCache = false;
				return false;
			}
		}
	}

	private static String inferBucket(String type, int amount) {
		String t = type == null ? "" : type.trim().toUpperCase();
		if ("PURCHASE_TOPUP".equals(t)) return "PAID";
		if (amount < 0) return "SPEND";
		return "REWARD";
	}

	private void lockUserRow(String userId) {
		Integer ok = jdbc.getJdbcTemplate().queryForObject(
			"select 1 from app_users where id = ? for update",
			Integer.class,
			UUID.fromString(userId)
		);
		if (ok == null) throw new NotFoundException("User not found");
	}

	private String findUserIdByEmail(String email) {
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select id
				from app_users
				where lower(email) = :email
				limit 1
				""", Map.of("email", email));
		if (rows.isEmpty()) throw new NotFoundException("User not found");
		return String.valueOf(rows.get(0).get("id"));
	}

	private String findEmailByUserId(String userId) {
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select email
				from app_users
				where id = :id
				limit 1
				""", Map.of("id", UUID.fromString(userId)));
		if (rows.isEmpty()) return "";
		return String.valueOf(rows.get(0).getOrDefault("email", "")).trim().toLowerCase();
	}

	private void publishWalletUpdate(String userId, int balance, int balancePaid, int balanceReward, String reason) {
		try {
			String email = findEmailByUserId(userId);
			if (email.isBlank() || !email.contains("@")) return;
			walletRealtime.publishToUser(email, new WalletUpdateEvent(balance, balancePaid, balanceReward, Instant.now(), reason));
		} catch (Exception ignored) {}
	}

	private static String normalizeSlug(String raw) {
		String s = raw == null ? "" : raw.trim();
		if (s.isBlank()) throw new IllegalArgumentException("mangaSlug is required");
		return s;
	}
}

