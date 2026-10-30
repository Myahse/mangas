package com.mangafriq.services.poll;

import com.mangafriq.dto.poll.PollDtos.CreatePollRequest;
import com.mangafriq.dto.poll.PollDtos.PollDto;
import com.mangafriq.dto.poll.PollDtos.PollOptionDto;
import com.mangafriq.dto.poll.PollDtos.VoteRequest;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.translation.TranslationService;
import com.mangafriq.services.wallet.WalletService;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * "Les lecteurs votent la suite" (see V44__chapter_polls.sql): one poll per chapter, a free vote per
 * reader, extra votes bought with coins, results shown after voting, closed by the series' creator.
 */
@Service
public class PollService {
	static final int MAX_EXTRA_VOTES = 20;
	static final int MAX_QUESTION = 200;
	static final int MAX_OPTION = 120;

	private final NamedParameterJdbcTemplate jdbc;
	private final TranslationService translations;
	private final WalletService wallet;

	@Value("${app.polls.vote-cost-coins:10}")
	private int boostCost;

	public PollService(NamedParameterJdbcTemplate jdbc, TranslationService translations, WalletService wallet) {
		this.jdbc = jdbc;
		this.translations = translations;
		this.wallet = wallet;
	}

	/** The chapter's poll, or null. userId may be null (signed out). */
	public PollDto chapterPoll(String slug, int chapter, String userId) {
		List<UUID> ids = jdbc.queryForList(
			"select id from chapter_polls where manga_slug = :slug and chapter_number = :chapter",
			new MapSqlParameterSource().addValue("slug", slug).addValue("chapter", chapter), UUID.class);
		return ids.isEmpty() ? null : load(ids.get(0), userId, false);
	}

	public PollDto create(String userId, String email, boolean staff, CreatePollRequest req) {
		if (req == null || req.slug() == null || req.chapterNumber() == null) throw new IllegalArgumentException("slug and chapterNumber are required");
		String slug = req.slug().trim();
		if (!staff && !translations.ownsSeriesOf(email, slug)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only the series' creator can ask its readers");
		}
		translations.pageCount(slug, req.chapterNumber()); // the chapter must exist
		String question = trim(req.question(), MAX_QUESTION);
		if (question == null) throw new IllegalArgumentException("question is required");
		List<String> labels = new ArrayList<>();
		for (String o : req.options() == null ? List.<String>of() : req.options()) {
			String label = trim(o, MAX_OPTION);
			if (label != null && !labels.contains(label)) labels.add(label);
		}
		if (labels.size() < 2 || labels.size() > 4) throw new IllegalArgumentException("a poll needs 2 to 4 different choices");
		if (req.closesAt() != null && req.closesAt().isBefore(Instant.now())) throw new IllegalArgumentException("closesAt is in the past");

		UUID id = UUID.randomUUID();
		try {
			jdbc.update("""
					insert into chapter_polls (id, manga_slug, chapter_number, question, closes_at, created_by)
					values (:id, :slug, :chapter, :question, :closes, :user)
					""", new MapSqlParameterSource().addValue("id", id).addValue("slug", slug)
				.addValue("chapter", req.chapterNumber()).addValue("question", question)
				.addValue("closes", req.closesAt() == null ? null : Timestamp.from(req.closesAt())).addValue("user", userId));
		} catch (org.springframework.dao.DuplicateKeyException e) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "this chapter already has a poll");
		}
		for (int i = 0; i < labels.size(); i++) {
			jdbc.update("insert into poll_options (id, poll_id, label, position) values (:id, :poll, :label, :pos)",
				new MapSqlParameterSource().addValue("id", UUID.randomUUID()).addValue("poll", id)
					.addValue("label", labels.get(i)).addValue("pos", i));
		}
		return load(id, userId, true);
	}

	/**
	 * The first vote of a reader is free and fixes their choice; extra votes (bought with coins) go to
	 * that same choice.
	 */
	@Transactional
	public PollDto vote(String userId, String pollIdRaw, VoteRequest req) {
		UUID pollId = TranslationService.parseId(pollIdRaw);
		Map<String, Object> poll = pollRow(pollId);
		if (!isOpen(poll)) throw new IllegalArgumentException("this poll is closed");
		int extra = req == null || req.extraVotes() == null ? 0 : req.extraVotes();
		if (extra < 0 || extra > MAX_EXTRA_VOTES) throw new IllegalArgumentException("extraVotes must be between 0 and " + MAX_EXTRA_VOTES);

		List<UUID> free = jdbc.queryForList(
			"select option_id from poll_votes where poll_id = :poll and user_id = :user and coins_spent = 0",
			new MapSqlParameterSource().addValue("poll", pollId).addValue("user", userId), UUID.class);
		UUID optionId;
		if (free.isEmpty()) {
			optionId = TranslationService.parseId(req == null ? null : req.optionId());
			Integer belongs = jdbc.queryForObject("select count(*) from poll_options where id = :id and poll_id = :poll",
				new MapSqlParameterSource().addValue("id", optionId).addValue("poll", pollId), Integer.class);
			if (belongs == null || belongs == 0) throw new IllegalArgumentException("optionId is not a choice of this poll");
			jdbc.update("""
					insert into poll_votes (id, poll_id, option_id, user_id, votes, coins_spent)
					values (:id, :poll, :option, :user, 1, 0)
					on conflict do nothing
					""", new MapSqlParameterSource().addValue("id", UUID.randomUUID()).addValue("poll", pollId)
				.addValue("option", optionId).addValue("user", userId));
		} else {
			optionId = free.get(0);
			if (extra == 0) throw new IllegalArgumentException("you already voted on this poll");
		}

		if (extra > 0) {
			int cost = extra * Math.max(1, boostCost);
			wallet.spend(userId, "POLL_VOTE", cost, "chapter_poll", pollId.toString());
			jdbc.update("""
					insert into poll_votes (id, poll_id, option_id, user_id, votes, coins_spent)
					values (:id, :poll, :option, :user, :votes, :coins)
					""", new MapSqlParameterSource().addValue("id", UUID.randomUUID()).addValue("poll", pollId)
				.addValue("option", optionId).addValue("user", userId).addValue("votes", extra).addValue("coins", cost));
		}
		return load(pollId, userId, false);
	}

	/** Polls on my series (all for staff), newest first, with full results. */
	public List<PollDto> myPolls(String userId, String email, boolean staff) {
		List<UUID> ids = jdbc.queryForList("""
				select p.id from chapter_polls p
				join manga m on m.slug = p.manga_slug
				where :all or exists (
				  select 1 from creator_manga_submissions s
				  where lower(s.creator_email) = :email and lower(trim(s.payload->>'title')) = lower(trim(m.title))
				)
				order by p.created_at desc
				limit 100
				""", new MapSqlParameterSource().addValue("all", staff).addValue("email", email == null ? "" : email.trim().toLowerCase()),
			UUID.class);
		return ids.stream().map(id -> load(id, userId, true)).toList();
	}

	/** Closes the poll; the choice with the most votes wins (ties: the first listed). */
	@Transactional
	public PollDto close(String userId, String email, boolean staff, String pollIdRaw) {
		UUID pollId = TranslationService.parseId(pollIdRaw);
		Map<String, Object> poll = pollRow(pollId);
		if (!staff && !translations.ownsSeriesOf(email, String.valueOf(poll.get("manga_slug")))) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only the series' creator can close its poll");
		}
		jdbc.update("""
				update chapter_polls p
				set status = 'closed', closed_at = now(),
				    winner_option_id = (
				      select o.id from poll_options o
				      left join poll_votes v on v.option_id = o.id
				      where o.poll_id = p.id
				      group by o.id, o.position
				      order by coalesce(sum(v.votes), 0) desc, o.position
				      limit 1)
				where p.id = :id and p.status = 'open'
				""", Map.of("id", pollId));
		return load(pollId, userId, true);
	}

	/* ─── helpers ─── */

	private PollDto load(UUID pollId, String userId, boolean showResults) {
		Map<String, Object> p = pollRow(pollId);
		boolean open = isOpen(p);
		Integer myVotes = null;
		String myOption = null;
		if (userId != null) {
			Map<String, Object> mine = jdbc.queryForMap("""
					select coalesce(sum(votes), 0) as votes,
					       max(case when coins_spent = 0 then option_id::text end) as option_id
					from poll_votes where poll_id = :poll and user_id = :user
					""", new MapSqlParameterSource().addValue("poll", pollId).addValue("user", userId));
			myVotes = ((Number) mine.get("votes")).intValue();
			myOption = (String) mine.get("option_id");
		}
		boolean reveal = showResults || !open || (myVotes != null && myVotes > 0);
		Map<String, Integer> tallies = new LinkedHashMap<>();
		jdbc.query("""
				select o.id::text as id, coalesce(sum(v.votes), 0) as votes
				from poll_options o left join poll_votes v on v.option_id = o.id
				where o.poll_id = :poll group by o.id
				""", Map.of("poll", pollId), rs -> { tallies.put(rs.getString("id"), rs.getInt("votes")); });
		List<PollOptionDto> options = jdbc.query("""
				select id::text as id, label from poll_options where poll_id = :poll order by position
				""", Map.of("poll", pollId), (rs, i) -> new PollOptionDto(rs.getString("id"), rs.getString("label"),
				reveal ? tallies.getOrDefault(rs.getString("id"), 0) : null));
		Integer total = reveal ? tallies.values().stream().mapToInt(Integer::intValue).sum() : null;
		Object closes = p.get("closes_at");
		return new PollDto(pollId.toString(), String.valueOf(p.get("manga_slug")), (String) p.get("series_title"),
			((Number) p.get("chapter_number")).intValue(), String.valueOf(p.get("question")), open ? "open" : "closed",
			closes instanceof Timestamp ts ? ts.toInstant() : null,
			p.get("winner_option_id") == null ? null : String.valueOf(p.get("winner_option_id")),
			options, total, myVotes, myOption, Math.max(1, boostCost));
	}

	private Map<String, Object> pollRow(UUID id) {
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select p.*, m.title as series_title from chapter_polls p left join manga m on m.slug = p.manga_slug
				where p.id = :id
				""", Map.of("id", id));
		if (rows.isEmpty()) throw new NotFoundException("Poll not found");
		return rows.get(0);
	}

	private static boolean isOpen(Map<String, Object> p) {
		if (!"open".equals(p.get("status"))) return false;
		Object closes = p.get("closes_at");
		return !(closes instanceof Timestamp ts) || ts.toInstant().isAfter(Instant.now());
	}

	private static String trim(String s, int max) {
		if (s == null) return null;
		String t = s.trim();
		if (t.isEmpty()) return null;
		return t.length() > max ? t.substring(0, max) : t;
	}
}
