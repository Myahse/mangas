package com.mangafriq.services.translation;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.translation.NarrationDtos.NarrationDto;
import com.mangafriq.dto.translation.NarrationDtos.NarrationStepDto;
import com.mangafriq.dto.translation.NarrationDtos.PendingAudioDto;
import com.mangafriq.dto.translation.TranslationDtos.ReviewResultDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.wallet.WalletService;
import com.mangafriq.storage.ObjectStorageService;
import java.io.ByteArrayInputStream;
import java.io.IOException;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Griot mode (see V43__bubble_narration.sql): the reading order of a chapter's bubbles with their
 * recorded voices, recording uploads, and their review by the series' creator.
 */
@Service
@Slf4j
public class NarrationService {
	/** Pseudo language for a recording of the original text. */
	public static final String ORIGINAL = "orig";
	static final long MAX_AUDIO_BYTES = 1_500_000;
	static final int MAX_DURATION_MS = 120_000;
	static final Map<String, String> AUDIO_TYPES = Map.of(
		"audio/webm", ".webm", "audio/ogg", ".ogg", "audio/mp4", ".m4a", "audio/x-m4a", ".m4a",
		"audio/mpeg", ".mp3", "audio/wav", ".wav", "audio/x-wav", ".wav", "audio/aac", ".aac");
	private static final Set<String> CLOSED = Set.of("approved", "rejected", "superseded");

	private final NamedParameterJdbcTemplate jdbc;
	private final TranslationService translations;
	private final WalletService wallet;
	private final ObjectStorageService storage;

	@Value("${app.narration.reward-coins:2}")
	private int rewardCoins;

	public NarrationService(NamedParameterJdbcTemplate jdbc, TranslationService translations, WalletService wallet,
			ObjectStorageService storage) {
		this.jdbc = jdbc;
		this.translations = translations;
		this.wallet = wallet;
		this.storage = storage;
	}

	/**
	 * Bubbles in reading order (page, top to bottom, left to right) with the text to tell and the approved
	 * voice, if any. Empty or "orig" lang: the original text; otherwise the approved translation.
	 */
	public NarrationDto narration(String slug, int chapter, String langRaw) {
		String lang = normalizeLang(langRaw);
		boolean original = ORIGINAL.equals(lang);
		String textJoin = original ? "" : """
				join bubble_translations t on t.bubble_id = b.id and t.lang = :lang and t.status = 'approved'
				""";
		String textExpr = original ? "b.original_text" : "t.text";
		List<NarrationStepDto> steps = jdbc.query("select b.id, b.page_number, b.x, b.y, b.w, b.h, " + textExpr + " as text, "
				+ "a.url as audio_url, coalesce(a.duration_ms, 0) as duration_ms from page_bubbles b " + textJoin + """
				left join bubble_audio a on a.bubble_id = b.id and a.lang = :lang and a.status = 'approved'
				where b.manga_slug = :slug and b.chapter_number = :chapter
				""" + (original ? " and b.original_text is not null " : "") + """
				order by b.page_number, b.y, b.x
				""", new MapSqlParameterSource().addValue("slug", slug).addValue("chapter", chapter).addValue("lang", lang),
			(rs, i) -> new NarrationStepDto(rs.getString("id"), rs.getInt("page_number"), rs.getDouble("x"), rs.getDouble("y"),
				rs.getDouble("w"), rs.getDouble("h"), rs.getString("text"), rs.getString("audio_url"), rs.getInt("duration_ms")));
		return new NarrationDto(lang, steps);
	}

	/** Stores a recording of a bubble (original text or a language with an approved translation) for review. */
	public Map<String, Object> submit(String userId, String bubbleIdRaw, String langRaw, MultipartFile file, Integer durationMs)
			throws IOException {
		UUID bubbleId = TranslationService.parseId(bubbleIdRaw);
		String lang = normalizeLang(langRaw);
		if (file == null || file.isEmpty()) throw new IllegalArgumentException("audio file is required");
		String type = baseType(file.getContentType());
		String ext = AUDIO_TYPES.get(type);
		if (ext == null) throw new IllegalArgumentException("audio format is not supported");
		if (file.getSize() > MAX_AUDIO_BYTES) throw new IllegalArgumentException("recording is too long (max 1.5 MB)");
		int duration = durationMs == null ? 0 : Math.max(0, Math.min(durationMs, MAX_DURATION_MS));

		List<Map<String, Object>> rows = jdbc.queryForList("""
				select b.manga_slug, b.chapter_number, b.original_text,
				       exists (select 1 from bubble_translations t where t.bubble_id = b.id and t.lang = :lang and t.status = 'approved') as translated
				from page_bubbles b where b.id = :id
				""", new MapSqlParameterSource().addValue("id", bubbleId).addValue("lang", lang));
		if (rows.isEmpty()) throw new NotFoundException("Bubble not found");
		Map<String, Object> b = rows.get(0);
		boolean hasText = ORIGINAL.equals(lang) ? b.get("original_text") != null : Boolean.TRUE.equals(b.get("translated"));
		if (!hasText) throw new IllegalArgumentException("this bubble has no text to read in that language yet");

		String key = "narration/" + b.get("manga_slug") + "/" + b.get("chapter_number") + "/" + UUID.randomUUID() + ext;
		byte[] bytes = file.getBytes();
		try {
			storage.put(key, type, new ByteArrayInputStream(bytes), bytes.length);
		} catch (IOException e) {
			log.warn("Narration upload failed for bubble {}: {}", bubbleId, e.getMessage());
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "audio storage is unavailable");
		}
		String url = AppConstants.API_V1 + "/storage/" + key;
		UUID id = UUID.randomUUID();
		jdbc.update("""
				insert into bubble_audio (id, bubble_id, lang, url, duration_ms, narrator_id, status)
				values (:id, :bubble, :lang, :url, :duration, :user, 'pending')
				on conflict (bubble_id, lang, narrator_id) do update
				set url = excluded.url, duration_ms = excluded.duration_ms, status = 'pending',
				    reviewed_by = null, reviewed_at = null, created_at = now()
				""", new MapSqlParameterSource().addValue("id", id).addValue("bubble", bubbleId).addValue("lang", lang)
			.addValue("url", url).addValue("duration", duration).addValue("user", userId));
		return Map.of("status", "pending", "url", url);
	}

	/** My recording of a bubble in a language, if any: { url, status }. */
	public Map<String, Object> mine(String userId, String bubbleIdRaw, String langRaw) {
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select url, status from bubble_audio where bubble_id = :bubble and lang = :lang and narrator_id = :user
				""", new MapSqlParameterSource().addValue("bubble", TranslationService.parseId(bubbleIdRaw))
			.addValue("lang", normalizeLang(langRaw)).addValue("user", userId));
		return rows.isEmpty() ? Map.of() : rows.get(0);
	}

	public List<PendingAudioDto> pending(String email, boolean staff) {
		return jdbc.query("""
				select a.id, a.bubble_id, b.manga_slug, m.title as series_title, b.chapter_number, b.page_number, a.lang,
				       case when a.lang = 'orig' then b.original_text else t.text end as text,
				       a.url, a.duration_ms, coalesce(nullif(u.display_name, ''), 'Lecteur') as narrator_name, a.created_at
				from bubble_audio a
				join page_bubbles b on b.id = a.bubble_id
				join manga m on m.slug = b.manga_slug
				left join bubble_translations t on t.bubble_id = b.id and t.lang = a.lang and t.status = 'approved'
				left join app_users u on u.id::text = a.narrator_id
				where a.status = 'pending'
				  and (:all or exists (
				    select 1 from creator_manga_submissions s
				    where lower(s.creator_email) = :email and lower(trim(s.payload->>'title')) = lower(trim(m.title))
				  ))
				order by a.created_at
				limit 200
				""", new MapSqlParameterSource().addValue("all", staff).addValue("email", email == null ? "" : email.trim().toLowerCase()),
			(rs, i) -> new PendingAudioDto(rs.getString("id"), rs.getString("bubble_id"), rs.getString("manga_slug"),
				rs.getString("series_title"), rs.getInt("chapter_number"), rs.getInt("page_number"), rs.getString("lang"),
				ORIGINAL.equals(rs.getString("lang")) ? "Version originale" : TranslationService.LANGUAGES.getOrDefault(rs.getString("lang"), rs.getString("lang")),
				rs.getString("text"), rs.getString("url"), rs.getInt("duration_ms"), rs.getString("narrator_name"),
				rs.getTimestamp("created_at").toInstant()));
	}

	/** Approves a recording: it replaces the bubble's current voice in that language; its narrator is paid once. */
	@Transactional
	public ReviewResultDto approve(String reviewerId, String email, boolean staff, String idRaw) {
		Map<String, Object> a = forReview(TranslationService.parseId(idRaw), email, staff);
		UUID id = (UUID) a.get("id");
		String current = jdbc.queryForObject("select status from bubble_audio where id = :id for update", Map.of("id", id), String.class);
		if (CLOSED.contains(current)) return new ReviewResultDto(id.toString(), current, 0);
		jdbc.update("""
				update bubble_audio set status = 'superseded'
				where bubble_id = :bubble and lang = :lang and status = 'approved' and id <> :id
				""", new MapSqlParameterSource().addValue("bubble", a.get("bubble_id")).addValue("lang", a.get("lang")).addValue("id", id));
		jdbc.update("""
				update bubble_audio set status = 'approved', reviewed_by = :reviewer, reviewed_at = now() where id = :id
				""", new MapSqlParameterSource().addValue("id", id).addValue("reviewer", reviewerId));
		String narrator = String.valueOf(a.get("narrator_id"));
		Boolean alreadyPaid = jdbc.queryForObject("""
				select exists (select 1 from coin_ledger where type = 'NARRATION_REWARD' and ref_type = 'bubble_audio' and ref_id = :id)
				""", Map.of("id", id.toString()), Boolean.class);
		int paid = narrator.equals(reviewerId) || Boolean.TRUE.equals(alreadyPaid) ? 0 : Math.max(0, rewardCoins);
		if (paid > 0) wallet.creditReward(narrator, "NARRATION_REWARD", paid, "bubble_audio", id.toString());
		return new ReviewResultDto(id.toString(), "approved", paid);
	}

	public ReviewResultDto reject(String reviewerId, String email, boolean staff, String idRaw) {
		Map<String, Object> a = forReview(TranslationService.parseId(idRaw), email, staff);
		jdbc.update("""
				update bubble_audio set status = 'rejected', reviewed_by = :reviewer, reviewed_at = now()
				where id = :id and status = 'pending'
				""", new MapSqlParameterSource().addValue("id", a.get("id")).addValue("reviewer", reviewerId));
		return new ReviewResultDto(String.valueOf(a.get("id")), "rejected", 0);
	}

	private Map<String, Object> forReview(UUID id, String email, boolean staff) {
		List<Map<String, Object>> rows = jdbc.queryForList("""
				select a.id, a.bubble_id, a.lang, a.narrator_id, b.manga_slug
				from bubble_audio a join page_bubbles b on b.id = a.bubble_id where a.id = :id
				""", Map.of("id", id));
		if (rows.isEmpty()) throw new NotFoundException("Recording not found");
		Map<String, Object> a = rows.get(0);
		if (!staff && !translations.ownsSeriesOf(email, String.valueOf(a.get("manga_slug")))) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only the series' creator can review its recordings");
		}
		return a;
	}

	static String normalizeLang(String raw) {
		String lang = raw == null ? "" : raw.trim().toLowerCase();
		if (lang.isEmpty() || ORIGINAL.equals(lang)) return ORIGINAL;
		if (!TranslationService.LANGUAGES.containsKey(lang)) throw new IllegalArgumentException("lang is not supported");
		return lang;
	}

	private static String baseType(String contentType) {
		if (contentType == null) return "";
		int semi = contentType.indexOf(';');
		return (semi >= 0 ? contentType.substring(0, semi) : contentType).trim().toLowerCase();
	}
}
