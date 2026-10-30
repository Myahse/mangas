package com.mangafriq.services.translation;

import com.mangafriq.dto.translation.TranslationDtos.BubbleDto;
import com.mangafriq.dto.translation.TranslationDtos.ChapterBubblesDto;
import com.mangafriq.dto.translation.TranslationDtos.ChapterLanguageDto;
import com.mangafriq.dto.translation.TranslationDtos.CreateBubbleRequest;
import com.mangafriq.dto.translation.TranslationDtos.LanguageDto;
import com.mangafriq.dto.translation.TranslationDtos.PendingTranslationDto;
import com.mangafriq.dto.translation.TranslationDtos.ReviewResultDto;
import com.mangafriq.dto.translation.TranslationDtos.SubmitTranslationRequest;
import com.mangafriq.dto.translation.TranslationDtos.TranslatorBubbleDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.creator.CreatorStore;
import com.mangafriq.services.wallet.WalletService;
import java.sql.Timestamp;
import java.time.Instant;
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

/** Community translations of speech bubbles into African languages (see V41__community_translations.sql). */
@Service
public class TranslationService {
	/** Languages readers can translate into, in the order the reader shows them. */
	public static final Map<String, String> LANGUAGES = new LinkedHashMap<>();
	static {
		LANGUAGES.put("wo", "Wolof");
		LANGUAGES.put("dyu", "Dioula");
		LANGUAGES.put("bm", "Bambara");
		LANGUAGES.put("nouchi", "Nouchi");
		LANGUAGES.put("sw", "Swahili");
		LANGUAGES.put("ln", "Lingala");
		LANGUAGES.put("ha", "Haoussa");
		LANGUAGES.put("yo", "Yoruba");
		LANGUAGES.put("ff", "Peul");
		LANGUAGES.put("mos", "Mooré");
		LANGUAGES.put("ee", "Éwé");
		LANGUAGES.put("en", "English");
	}

	static final int MAX_BUBBLES_PER_PAGE = 80;
	static final int MAX_TEXT = 600;

	private final NamedParameterJdbcTemplate jdbc;
	private final CreatorStore creatorStore;
	private final WalletService wallet;

	@Value("${app.translations.reward-coins:2}")
	private int rewardCoins;

	public TranslationService(NamedParameterJdbcTemplate jdbc, CreatorStore creatorStore, WalletService wallet) {
		this.jdbc = jdbc;
		this.creatorStore = creatorStore;
		this.wallet = wallet;
	}

	public List<LanguageDto> languages() {
		return LANGUAGES.entrySet().stream().map(e -> new LanguageDto(e.getKey(), e.getValue())).toList();
	}

	/* ─── Reader ─── */

	/** Languages with at least one approved bubble in this chapter. */
	public List<ChapterLanguageDto> chapterLanguages(String slug, int chapter) {
		int total = countBubbles(slug, chapter);
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select t.lang, count(*) as n
				from bubble_translations t
				join page_bubbles b on b.id = t.bubble_id
				where b.manga_slug = :slug and b.chapter_number = :chapter and t.status = 'approved'
				group by t.lang
				""", chapterParams(slug, chapter));
		Map<String, Integer> counts = new LinkedHashMap<>();
		rows.forEach(r -> counts.put(String.valueOf(r.get("lang")), ((Number) r.get("n")).intValue()));
		return LANGUAGES.entrySet().stream()
			.filter(e -> counts.containsKey(e.getKey()))
			.map(e -> new ChapterLanguageDto(e.getKey(), e.getValue(), counts.get(e.getKey()), total))
			.toList();
	}

	/** Bubbles with an approved translation in {@code lang}. */
	public ChapterBubblesDto chapterBubbles(String slug, int chapter, String langRaw) {
		String lang = requireLang(langRaw);
		List<BubbleDto> bubbles = jdbc.query("""
				select b.id, b.page_number, b.x, b.y, b.w, b.h, b.original_text, t.text
				from page_bubbles b
				join bubble_translations t on t.bubble_id = b.id and t.lang = :lang and t.status = 'approved'
				where b.manga_slug = :slug and b.chapter_number = :chapter
				order by b.page_number, b.y, b.x
				""", chapterParams(slug, chapter).addValue("lang", lang),
			(rs, i) -> new BubbleDto(rs.getString("id"), rs.getInt("page_number"), rs.getDouble("x"), rs.getDouble("y"),
				rs.getDouble("w"), rs.getDouble("h"), rs.getString("original_text"), rs.getString("text")));
		return new ChapterBubblesDto(lang, bubbles);
	}

	/* ─── Translator ─── */

	/** Every bubble of the chapter, with the approved text and my own submission in {@code lang}. */
	public List<TranslatorBubbleDto> translatorBubbles(String userId, String slug, int chapter, String langRaw) {
		String lang = requireLang(langRaw);
		return jdbc.query("""
				select b.id, b.page_number, b.x, b.y, b.w, b.h, b.original_text,
				       a.text as approved_text, m.text as my_text, m.status as my_status
				from page_bubbles b
				left join bubble_translations a on a.bubble_id = b.id and a.lang = :lang and a.status = 'approved'
				left join bubble_translations m on m.bubble_id = b.id and m.lang = :lang and m.translator_id = :user
				where b.manga_slug = :slug and b.chapter_number = :chapter
				order by b.page_number, b.y, b.x
				""", chapterParams(slug, chapter).addValue("lang", lang).addValue("user", userId),
			(rs, i) -> new TranslatorBubbleDto(rs.getString("id"), rs.getInt("page_number"), rs.getDouble("x"),
				rs.getDouble("y"), rs.getDouble("w"), rs.getDouble("h"), rs.getString("original_text"),
				rs.getString("approved_text"), rs.getString("my_text"), rs.getString("my_status")));
	}

	public TranslatorBubbleDto createBubble(String userId, String slug, int chapter, CreateBubbleRequest req) {
		if (req == null || req.page() == null) throw new IllegalArgumentException("page is required");
		double x = pct(req.x(), "x"), y = pct(req.y(), "y"), w = pct(req.w(), "w"), h = pct(req.h(), "h");
		if (w < 1 || h < 1) throw new IllegalArgumentException("bubble is too small");
		if (x + w > 100.001 || y + h > 100.001) throw new IllegalArgumentException("bubble is outside the page");
		int pages = pageCount(slug, chapter);
		if (req.page() < 1 || req.page() > pages) throw new IllegalArgumentException("page is invalid");
		Integer onPage = jdbc.queryForObject("""
				select count(*) from page_bubbles
				where manga_slug = :slug and chapter_number = :chapter and page_number = :page
				""", chapterParams(slug, chapter).addValue("page", req.page()), Integer.class);
		if (onPage != null && onPage >= MAX_BUBBLES_PER_PAGE) throw new IllegalArgumentException("too many bubbles on this page");

		UUID id = UUID.randomUUID();
		String original = trimTo(req.originalText(), MAX_TEXT);
		jdbc.update("""
				insert into page_bubbles (id, manga_slug, chapter_number, page_number, x, y, w, h, original_text, created_by)
				values (:id, :slug, :chapter, :page, :x, :y, :w, :h, :original, :user)
				""", chapterParams(slug, chapter).addValue("id", id).addValue("page", req.page())
			.addValue("x", x).addValue("y", y).addValue("w", w).addValue("h", h)
			.addValue("original", original).addValue("user", userId));
		return new TranslatorBubbleDto(id.toString(), req.page(), x, y, w, h, original, null, null, null);
	}

	/** A bubble can be removed by whoever drew it while nothing is approved on it, or by the series owner / staff. */
	public void deleteBubble(String userId, String email, boolean staff, String bubbleIdRaw) {
		UUID id = parseId(bubbleIdRaw);
		Map<String, Object> b = bubble(id);
		boolean owner = staff || ownsSeriesOf(email, String.valueOf(b.get("manga_slug")));
		Integer approved = jdbc.queryForObject(
			"select count(*) from bubble_translations where bubble_id = :id and status = 'approved'", Map.of("id", id), Integer.class);
		boolean mineAndUnused = userId.equals(b.get("created_by")) && (approved == null || approved == 0);
		if (!owner && !mineAndUnused) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not allowed");
		jdbc.update("delete from page_bubbles where id = :id", Map.of("id", id));
	}

	/** Creates or updates my translation of a bubble; an edit goes back to pending review. */
	public TranslatorBubbleDto submit(String userId, String bubbleIdRaw, SubmitTranslationRequest req) {
		UUID bubbleId = parseId(bubbleIdRaw);
		if (req == null) throw new IllegalArgumentException("payload is required");
		String lang = requireLang(req.lang());
		String text = trimTo(req.text(), MAX_TEXT);
		if (text == null) throw new IllegalArgumentException("text is required");
		Map<String, Object> b = bubble(bubbleId);
		jdbc.update("""
				insert into bubble_translations (id, bubble_id, lang, text, translator_id, status)
				values (:id, :bubble, :lang, :text, :user, 'pending')
				on conflict (bubble_id, lang, translator_id) do update
				set text = excluded.text, status = 'pending', reviewed_by = null, reviewed_at = null, updated_at = now()
				where bubble_translations.text <> excluded.text or bubble_translations.status = 'rejected'
				""", new MapSqlParameterSource().addValue("id", UUID.randomUUID()).addValue("bubble", bubbleId)
			.addValue("lang", lang).addValue("text", text).addValue("user", userId));
		return translatorBubbles(userId, String.valueOf(b.get("manga_slug")), ((Number) b.get("chapter_number")).intValue(), lang)
			.stream().filter(x -> x.id().equals(bubbleId.toString())).findFirst().orElseThrow();
	}

	/* ─── Review (series owner or staff) ─── */

	public List<PendingTranslationDto> pending(String email, boolean staff) {
		return jdbc.query("""
				select t.id, t.bubble_id, b.manga_slug, m.title, b.chapter_number, b.page_number, t.lang,
				       b.original_text, t.text, a.text as approved_text,
				       coalesce(nullif(u.display_name, ''), 'Lecteur') as translator_name, t.created_at
				from bubble_translations t
				join page_bubbles b on b.id = t.bubble_id
				join manga m on m.slug = b.manga_slug
				left join bubble_translations a on a.bubble_id = t.bubble_id and a.lang = t.lang and a.status = 'approved'
				left join app_users u on u.id::text = t.translator_id
				where t.status = 'pending'
				  and (:all or exists (
				    select 1 from creator_manga_submissions s
				    where lower(s.creator_email) = :email and lower(trim(s.payload->>'title')) = lower(trim(m.title))
				  ))
				order by t.created_at
				limit 200
				""", new MapSqlParameterSource().addValue("all", staff).addValue("email", email == null ? "" : email.trim().toLowerCase()),
			(rs, i) -> new PendingTranslationDto(rs.getString("id"), rs.getString("bubble_id"), rs.getString("manga_slug"),
				rs.getString("title"), rs.getInt("chapter_number"), rs.getInt("page_number"), rs.getString("lang"),
				LANGUAGES.getOrDefault(rs.getString("lang"), rs.getString("lang")), rs.getString("original_text"),
				rs.getString("text"), rs.getString("approved_text"), rs.getString("translator_name"),
				rs.getTimestamp("created_at").toInstant()));
	}

	/**
	 * Approves a pending translation: it replaces the bubble's current approved text in that language,
	 * and its translator is paid once (never when reviewing one's own translation).
	 */
	@Transactional
	public ReviewResultDto approve(String reviewerId, String email, boolean staff, String idRaw) {
		UUID id = parseId(idRaw);
		Map<String, Object> t = translationForReview(id, email, staff);
		// Lock the row so two reviewers clicking at once cannot both approve it.
		String current = jdbc.queryForObject(
			"select status from bubble_translations where id = :id for update", Map.of("id", id), String.class);
		if (!"pending".equals(current)) return new ReviewResultDto(id.toString(), current, 0);
		jdbc.update("""
				update bubble_translations set status = 'superseded', updated_at = now()
				where bubble_id = :bubble and lang = :lang and status = 'approved' and id <> :id
				""", new MapSqlParameterSource().addValue("bubble", t.get("bubble_id")).addValue("lang", t.get("lang")).addValue("id", id));
		List<String> won = jdbc.queryForList("""
				update bubble_translations
				set status = 'approved', reviewed_by = :reviewer, reviewed_at = :now, updated_at = :now
				where id = :id and status = 'pending'
				returning translator_id
				""", new MapSqlParameterSource().addValue("id", id).addValue("reviewer", reviewerId)
			.addValue("now", Timestamp.from(Instant.now())), String.class);
		if (won.isEmpty()) return new ReviewResultDto(id.toString(), String.valueOf(t.get("status")), 0);
		String translator = won.get(0);
		// An edited translation goes back to pending; approving it again must not pay twice.
		Boolean alreadyPaid = jdbc.queryForObject("""
				select exists (select 1 from coin_ledger where type = 'TRANSLATION_REWARD' and ref_type = 'bubble_translation' and ref_id = :id)
				""", Map.of("id", id.toString()), Boolean.class);
		int paid = translator.equals(reviewerId) || Boolean.TRUE.equals(alreadyPaid) ? 0 : Math.max(0, rewardCoins);
		if (paid > 0) wallet.creditReward(translator, "TRANSLATION_REWARD", paid, "bubble_translation", id.toString());
		return new ReviewResultDto(id.toString(), "approved", paid);
	}

	public ReviewResultDto reject(String reviewerId, String email, boolean staff, String idRaw) {
		UUID id = parseId(idRaw);
		translationForReview(id, email, staff);
		jdbc.update("""
				update bubble_translations
				set status = 'rejected', reviewed_by = :reviewer, reviewed_at = now(), updated_at = now()
				where id = :id and status = 'pending'
				""", new MapSqlParameterSource().addValue("id", id).addValue("reviewer", reviewerId));
		return new ReviewResultDto(id.toString(), "rejected", 0);
	}

	/* ─── helpers ─── */

	private Map<String, Object> translationForReview(UUID id, String email, boolean staff) {
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select t.id, t.bubble_id, t.lang, t.status, b.manga_slug
				from bubble_translations t join page_bubbles b on b.id = t.bubble_id
				where t.id = :id
				""", Map.of("id", id));
		if (rows.isEmpty()) throw new NotFoundException("Translation not found");
		Map<String, Object> t = rows.get(0);
		if (!staff && !ownsSeriesOf(email, String.valueOf(t.get("manga_slug")))) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only the series' creator can review its translations");
		}
		return t;
	}

	public boolean ownsSeriesOf(String email, String slug) {
		List<String> titles = jdbc.queryForList("select title from manga where slug = :slug", Map.of("slug", slug), String.class);
		return !titles.isEmpty() && creatorStore.ownsSeries(email, titles.get(0));
	}

	private Map<String, Object> bubble(UUID id) {
		List<Map<String, Object>> rows = jdbc.queryForList(
			"select id, manga_slug, chapter_number, created_by from page_bubbles where id = :id", Map.of("id", id));
		if (rows.isEmpty()) throw new NotFoundException("Bubble not found");
		return rows.get(0);
	}

	public int pageCount(String slug, int chapter) {
		Integer n = jdbc.queryForObject("""
				select count(p.*) from pages p
				join chapters c on c.id = p.chapter_id
				join manga m on m.id = c.manga_id
				where m.slug = :slug and c.number = :chapter
				""", chapterParams(slug, chapter), Integer.class);
		if (n == null || n == 0) throw new NotFoundException("Chapter not found");
		return n;
	}

	private int countBubbles(String slug, int chapter) {
		Integer n = jdbc.queryForObject(
			"select count(*) from page_bubbles where manga_slug = :slug and chapter_number = :chapter",
			chapterParams(slug, chapter), Integer.class);
		return n == null ? 0 : n;
	}

	private static MapSqlParameterSource chapterParams(String slug, int chapter) {
		return new MapSqlParameterSource().addValue("slug", slug == null ? "" : slug.trim()).addValue("chapter", chapter);
	}

	private static String requireLang(String raw) {
		String lang = raw == null ? "" : raw.trim().toLowerCase();
		if (!LANGUAGES.containsKey(lang)) throw new IllegalArgumentException("lang is not supported");
		return lang;
	}

	static double pct(Double v, String name) {
		if (v == null || v.isNaN() || v < 0 || v > 100) throw new IllegalArgumentException(name + " must be between 0 and 100");
		return Math.round(v * 1000) / 1000.0;
	}

	static String trimTo(String s, int max) {
		if (s == null) return null;
		String t = s.trim();
		if (t.isEmpty()) return null;
		return t.length() > max ? t.substring(0, max) : t;
	}

	public static UUID parseId(String raw) {
		try {
			return UUID.fromString(raw == null ? "" : raw.trim());
		} catch (Exception e) {
			throw new NotFoundException("Not found");
		}
	}
}
