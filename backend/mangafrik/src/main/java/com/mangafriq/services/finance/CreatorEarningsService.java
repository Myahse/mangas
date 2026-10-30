package com.mangafriq.services.finance;

import com.mangafriq.exception.NotFoundException;
import com.mangafriq.jdbc.UserIdJdbc;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Creator revenue (see V47__creator_earnings.sql): splits every coin spend into reward and purchased
 * coins (reward first), credits the series' creator with their share of the purchased part, and
 * handles payout requests that the finance team pays by mobile money.
 */
@Service
@Slf4j
public class CreatorEarningsService {
	static final Set<String> EARNING_SPENDS = Set.of("SPEND_UNLOCK_CHAPTER", "SPEND_UNLOCK_MANGA", "POLL_VOTE");
	static final Set<String> METHODS = Set.of("wave", "orange_money", "mtn_money", "moov_money");

	private final NamedParameterJdbcTemplate jdbc;

	@Value("${app.creator.revenue-share:0.70}")
	private BigDecimal share;

	@Value("${app.creator.coin-value-xof:7.5}")
	private BigDecimal coinValueXof;

	@Value("${app.creator.min-payout-xof:500}")
	private BigDecimal minPayoutXof;

	public CreatorEarningsService(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	/* ─── Spends (called by WalletService right after debiting coins) ─── */

	/**
	 * Records how a spend was paid (reward coins first) and, when purchased coins were used on a series
	 * that has a creator, that creator's earning. Never throws: a revenue bug must not block reading.
	 */
	public void recordSpend(String userId, String type, int amount, String refType, String refId) {
		if (amount <= 0 || type == null) return;
		try {
			int rewardLeft = rewardCoinsLeft(userId);
			int rewardPart = Math.min(amount, rewardLeft);
			int paidPart = amount - rewardPart;
			UUID splitId = UUID.randomUUID();
			jdbc.update("""
					insert into coin_spend_splits (id, user_id, type, ref_type, ref_id, amount, reward_part, paid_part)
					values (:id, :user, :type, :ref_type, :ref_id, :amount, :reward, :paid)
					""", new MapSqlParameterSource().addValue("id", splitId).addValue("user", userId).addValue("type", type)
				.addValue("ref_type", refType).addValue("ref_id", refId).addValue("amount", amount)
				.addValue("reward", rewardPart).addValue("paid", paidPart));
			if (paidPart == 0 || !EARNING_SPENDS.contains(type)) return;

			String slug = slugOf(refType, refId);
			if (slug == null) return;
			String creator = creatorEmailOf(slug);
			if (creator == null) return; // a series without a creator account: the platform keeps it
			String readerEmail = jdbc.queryForList("select lower(email) from app_users where id = :id",
				Map.of("id", UserIdJdbc.param(userId)), String.class).stream().findFirst().orElse("");
			if (creator.equalsIgnoreCase(readerEmail)) return; // creators reading their own series earn nothing

			BigDecimal creatorCoins = BigDecimal.valueOf(paidPart).multiply(share).setScale(2, RoundingMode.HALF_UP);
			BigDecimal xof = creatorCoins.multiply(coinValueXof).setScale(2, RoundingMode.HALF_UP);
			jdbc.update("""
					insert into creator_earnings (id, creator_email, manga_slug, source_type, split_id, paid_coins, creator_coins, amount_xof)
					values (:id, :creator, :slug, :type, :split, :paid, :coins, :xof)
					""", new MapSqlParameterSource().addValue("id", UUID.randomUUID()).addValue("creator", creator)
				.addValue("slug", slug).addValue("type", type).addValue("split", splitId).addValue("paid", paidPart)
				.addValue("coins", creatorCoins).addValue("xof", xof));
		} catch (RuntimeException e) {
			log.error("Creator earning not recorded for spend {} {} by {}: {}", type, refId, userId, e.getMessage());
		}
	}

	/** Reward coins received minus the reward part of earlier spends (spends before V47 are not counted). */
	private int rewardCoinsLeft(String userId) {
		Integer received = jdbc.queryForObject("""
				select coalesce(sum(amount), 0) from coin_ledger
				where user_id = :id and upper(coalesce(bucket, '')) = 'REWARD' and amount > 0
				""", Map.of("id", UserIdJdbc.param(userId)), Integer.class);
		Integer used = jdbc.queryForObject(
			"select coalesce(sum(reward_part), 0) from coin_spend_splits where user_id = :user", Map.of("user", userId), Integer.class);
		return Math.max(0, (received == null ? 0 : received) - (used == null ? 0 : used));
	}

	private String slugOf(String refType, String refId) {
		if (refId == null) return null;
		return switch (refType == null ? "" : refType) {
			case "chapter" -> refId.contains("#") ? refId.substring(0, refId.lastIndexOf('#')) : refId;
			case "manga" -> refId;
			case "chapter_poll" -> jdbc.queryForList("select manga_slug from chapter_polls where id::text = :id",
				Map.of("id", refId), String.class).stream().findFirst().orElse(null);
			default -> null;
		};
	}

	/** The creator account behind a catalog series (latest approved submission with that title). */
	private String creatorEmailOf(String slug) {
		return jdbc.queryForList("""
				select lower(s.creator_email) from creator_manga_submissions s
				join manga m on lower(trim(s.payload->>'title')) = lower(trim(m.title))
				where m.slug = :slug and coalesce(s.creator_email, '') <> ''
				order by s.created_at desc limit 1
				""", Map.of("slug", slug), String.class).stream().findFirst().orElse(null);
	}

	/* ─── Creator side ─── */

	public Map<String, Object> summary(String creatorEmail) {
		String email = normEmail(creatorEmail);
		BigDecimal earned = sum("select coalesce(sum(amount_xof), 0) from creator_earnings where lower(creator_email) = :email", email);
		BigDecimal paid = sum("select coalesce(sum(amount_xof), 0) from creator_payouts where lower(creator_email) = :email and status = 'paid'", email);
		BigDecimal pending = sum("select coalesce(sum(amount_xof), 0) from creator_payouts where lower(creator_email) = :email and status = 'requested'", email);
		List<Map<String, Object>> bySeries = jdbc.query("""
				select e.manga_slug, coalesce(m.title, e.manga_slug) as title, sum(e.amount_xof) as xof,
				       sum(e.paid_coins) as coins, count(*) filter (where e.source_type like 'SPEND_UNLOCK%') as unlocks,
				       count(*) filter (where e.source_type = 'POLL_VOTE') as votes
				from creator_earnings e left join manga m on m.slug = e.manga_slug
				where lower(e.creator_email) = :email
				group by e.manga_slug, m.title order by xof desc
				""", Map.of("email", email), (rs, i) -> {
				Map<String, Object> row = new LinkedHashMap<>();
				row.put("slug", rs.getString("manga_slug"));
				row.put("title", rs.getString("title"));
				row.put("xof", rs.getBigDecimal("xof"));
				row.put("paidCoins", rs.getInt("coins"));
				row.put("unlocks", rs.getInt("unlocks"));
				row.put("votes", rs.getInt("votes"));
				return row;
			});
		Map<String, Object> out = new LinkedHashMap<>();
		out.put("earnedXof", earned);
		out.put("paidXof", paid);
		out.put("pendingXof", pending);
		out.put("availableXof", earned.subtract(paid).subtract(pending).max(BigDecimal.ZERO));
		out.put("minPayoutXof", minPayoutXof);
		out.put("sharePercent", share.multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString());
		out.put("coinValueXof", coinValueXof);
		out.put("bySeries", bySeries);
		out.put("payouts", payouts(email, null));
		return out;
	}

	@Transactional
	public Map<String, Object> requestPayout(String creatorEmail, BigDecimal amountRaw, String methodRaw, String phoneRaw) {
		String email = normEmail(creatorEmail);
		String method = methodRaw == null ? "" : methodRaw.trim().toLowerCase();
		if (!METHODS.contains(method)) throw new IllegalArgumentException("method must be one of " + METHODS);
		String phone = phoneRaw == null ? "" : phoneRaw.replaceAll("[^0-9+]", "");
		if (phone.replace("+", "").length() < 8 || phone.length() > 16) throw new IllegalArgumentException("phone number is invalid");
		BigDecimal amount = amountRaw == null ? BigDecimal.ZERO : amountRaw.setScale(2, RoundingMode.DOWN);
		if (amount.compareTo(minPayoutXof) < 0) throw new IllegalArgumentException("minimum payout is " + minPayoutXof.stripTrailingZeros().toPlainString() + " XOF");
		// One request at a time, never more than what is available: a per-creator lock against double clicks
		// (a "select ... for update" would lock nothing for a creator with no payout row yet).
		jdbc.queryForList("select pg_advisory_xact_lock(hashtext(:key))", Map.of("key", "creator-payout:" + email));
		Integer open = jdbc.queryForObject("select count(*) from creator_payouts where lower(creator_email) = :email and status = 'requested'",
			Map.of("email", email), Integer.class);
		if (open != null && open > 0) throw new IllegalArgumentException("a payout request is already waiting");
		BigDecimal available = (BigDecimal) summary(email).get("availableXof");
		if (amount.compareTo(available) > 0) throw new IllegalArgumentException("amount is more than your available earnings");
		jdbc.update("""
				insert into creator_payouts (id, creator_email, amount_xof, method, phone)
				values (:id, :email, :amount, :method, :phone)
				""", new MapSqlParameterSource().addValue("id", UUID.randomUUID()).addValue("email", email)
			.addValue("amount", amount).addValue("method", method).addValue("phone", phone));
		return summary(email);
	}

	/* ─── Finance side ─── */

	/** Payout requests (all creators), oldest waiting first. */
	public List<Map<String, Object>> payouts(String creatorEmailOrNull, String status) {
		MapSqlParameterSource p = new MapSqlParameterSource()
			.addValue("email", creatorEmailOrNull == null ? "" : normEmail(creatorEmailOrNull))
			.addValue("all", creatorEmailOrNull == null)
			.addValue("status", status == null ? "" : status.trim().toLowerCase())
			.addValue("anyStatus", status == null || status.isBlank());
		return jdbc.query("""
				select id::text as id, creator_email, amount_xof, method, phone, status, reference, note, created_at, processed_at
				from creator_payouts
				where (:all or lower(creator_email) = :email) and (:anyStatus or status = :status)
				order by case when status = 'requested' then 0 else 1 end, created_at desc
				limit 200
				""", p, (rs, i) -> {
				Map<String, Object> row = new LinkedHashMap<>();
				row.put("id", rs.getString("id"));
				row.put("creatorEmail", rs.getString("creator_email"));
				row.put("amountXof", rs.getBigDecimal("amount_xof"));
				row.put("method", rs.getString("method"));
				row.put("phone", rs.getString("phone"));
				row.put("status", rs.getString("status"));
				row.put("reference", rs.getString("reference"));
				row.put("note", rs.getString("note"));
				row.put("createdAt", rs.getTimestamp("created_at").toInstant());
				Timestamp processed = rs.getTimestamp("processed_at");
				row.put("processedAt", processed == null ? null : processed.toInstant());
				return row;
			});
	}

	/** Marks a request paid (after the mobile-money transfer) and books it in the finance ledger. */
	@Transactional
	public Map<String, Object> markPaid(String id, String reference, String byEmail) {
		Map<String, Object> payout = open(id);
		String ref = reference == null ? "" : reference.trim();
		if (ref.isEmpty()) throw new IllegalArgumentException("reference of the mobile-money transfer is required");
		jdbc.update("""
				update creator_payouts set status = 'paid', reference = :ref, processed_at = now(), processed_by = :by
				where id = :id and status = 'requested'
				""", new MapSqlParameterSource().addValue("id", payout.get("id")).addValue("ref", ref).addValue("by", byEmail));
		jdbc.update("""
				insert into finance_transactions (id, type, amount, currency, reference, note, created_at)
				values (:id, 'PAYOUT', :amount, 'XOF', :ref, :note, :now)
				""", new MapSqlParameterSource().addValue("id", UUID.randomUUID()).addValue("amount", payout.get("amount_xof"))
			.addValue("ref", ref).addValue("note", "Creator payout to " + payout.get("creator_email") + " (" + payout.get("method") + ")")
			.addValue("now", Timestamp.from(Instant.now())));
		return Map.of("id", id, "status", "paid");
	}

	public Map<String, Object> reject(String id, String note, String byEmail) {
		Map<String, Object> payout = open(id);
		jdbc.update("""
				update creator_payouts set status = 'rejected', note = :note, processed_at = now(), processed_by = :by
				where id = :id and status = 'requested'
				""", new MapSqlParameterSource().addValue("id", payout.get("id")).addValue("note", note == null ? null : note.trim())
			.addValue("by", byEmail));
		return Map.of("id", id, "status", "rejected");
	}

	private Map<String, Object> open(String idRaw) {
		UUID id;
		try {
			id = UUID.fromString(idRaw == null ? "" : idRaw.trim());
		} catch (Exception e) {
			throw new NotFoundException("Payout not found");
		}
		List<Map<String, Object>> rows = jdbc.queryForList(
			"select id, creator_email, amount_xof, method, status from creator_payouts where id = :id for update", Map.of("id", id));
		if (rows.isEmpty()) throw new NotFoundException("Payout not found");
		if (!"requested".equals(rows.get(0).get("status"))) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "this payout was already processed");
		}
		return rows.get(0);
	}

	private BigDecimal sum(String sql, String email) {
		BigDecimal v = jdbc.queryForObject(sql, Map.of("email", email), BigDecimal.class);
		return v == null ? BigDecimal.ZERO : v;
	}

	private static String normEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase();
	}
}
