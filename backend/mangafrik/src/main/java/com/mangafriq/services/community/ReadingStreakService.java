package com.mangafriq.services.community;

import com.mangafriq.services.wallet.WalletService;
import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Reading streak: consecutive days (UTC) on which the reader opened a chapter. Every
 * {@code rewardEvery} days in a row pays {@code rewardCoins}, once per milestone day.
 */
@Service
@Slf4j
public class ReadingStreakService {
	private final NamedParameterJdbcTemplate jdbc;
	private final WalletService wallet;

	@Value("${app.streak.reward-every-days:7}")
	private int rewardEvery;

	@Value("${app.streak.reward-coins:10}")
	private int rewardCoins;

	public ReadingStreakService(NamedParameterJdbcTemplate jdbc, WalletService wallet) {
		this.jdbc = jdbc;
		this.wallet = wallet;
	}

	/** Called when a signed-in reader opens a chapter. Returns the coins earned today (0 most days). */
	public int recordRead(String userId) {
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		int inserted = jdbc.update("insert into reading_days (user_id, day) values (:user, :day) on conflict do nothing",
			new MapSqlParameterSource().addValue("user", userId).addValue("day", Date.valueOf(today)));
		if (inserted == 0) return 0; // already counted today
		int streak = currentStreak(userId, today);
		if (rewardEvery <= 0 || rewardCoins <= 0 || streak == 0 || streak % rewardEvery != 0) return 0;
		String ref = "streak:" + today;
		Boolean paid = jdbc.queryForObject("""
				select exists (select 1 from coin_ledger where type = 'STREAK_REWARD' and ref_type = 'reading_streak' and ref_id = :ref
				               and user_id::text = :user)
				""", new MapSqlParameterSource().addValue("ref", ref).addValue("user", userId), Boolean.class);
		if (Boolean.TRUE.equals(paid)) return 0;
		try {
			wallet.creditReward(userId, "STREAK_REWARD", rewardCoins, "reading_streak", ref);
			return rewardCoins;
		} catch (RuntimeException e) {
			log.warn("Streak reward failed for {}: {}", userId, e.getMessage());
			return 0;
		}
	}

	/** { current, best, readToday, rewardEvery, rewardCoins, daysToReward } */
	public Map<String, Object> status(String userId) {
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		List<LocalDate> days = days(userId);
		boolean readToday = !days.isEmpty() && days.get(0).equals(today);
		int current = currentStreak(days, today);
		int best = 0, run = 0;
		LocalDate prev = null;
		for (LocalDate d : days) { // newest first
			run = prev != null && prev.minusDays(1).equals(d) ? run + 1 : 1;
			best = Math.max(best, run);
			prev = d;
		}
		Map<String, Object> out = new LinkedHashMap<>();
		out.put("current", current);
		out.put("best", best);
		out.put("readToday", readToday);
		out.put("rewardEvery", rewardEvery);
		out.put("rewardCoins", rewardCoins);
		int toNext = rewardEvery <= 0 ? 0 : rewardEvery - (current % rewardEvery);
		out.put("daysToReward", readToday ? toNext : Math.max(1, toNext));
		return out;
	}

	private int currentStreak(String userId, LocalDate today) {
		return currentStreak(days(userId), today);
	}

	/** Consecutive days ending today, or yesterday when nothing was read yet today. */
	static int currentStreak(List<LocalDate> newestFirst, LocalDate today) {
		if (newestFirst.isEmpty()) return 0;
		LocalDate expected = newestFirst.get(0).equals(today) ? today : today.minusDays(1);
		int n = 0;
		for (LocalDate d : newestFirst) {
			if (!d.equals(expected)) break;
			n++;
			expected = expected.minusDays(1);
		}
		return n;
	}

	private List<LocalDate> days(String userId) {
		return jdbc.query("select day from reading_days where user_id = :user order by day desc limit 400",
			Map.of("user", userId), (rs, i) -> rs.getDate("day").toLocalDate());
	}
}
