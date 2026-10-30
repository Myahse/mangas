package com.mangafriq.services.translation;

import com.mangafriq.dto.translation.NoteDtos.CreateNoteRequest;
import com.mangafriq.dto.translation.NoteDtos.NoteDto;
import com.mangafriq.dto.translation.NoteDtos.PendingNoteDto;
import com.mangafriq.dto.translation.TranslationDtos.ReviewResultDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.wallet.WalletService;
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

/** Cultural notes on a page spot (see V42__cultural_notes.sql). Shares checks with {@link TranslationService}. */
@Service
public class CulturalNoteService {
	static final int MAX_TITLE = 80;
	static final int MAX_BODY = 1000;
	static final int MAX_NOTES_PER_PAGE = 20;

	private static final String NOTE_COLUMNS = """
			n.id, n.page_number, n.x, n.y, n.w, n.h, n.title, n.body, n.status,
			coalesce(nullif(u.display_name, ''), 'Lecteur') as author_name
			""";

	private final NamedParameterJdbcTemplate jdbc;
	private final TranslationService translations;
	private final WalletService wallet;

	@Value("${app.notes.reward-coins:3}")
	private int rewardCoins;

	public CulturalNoteService(NamedParameterJdbcTemplate jdbc, TranslationService translations, WalletService wallet) {
		this.jdbc = jdbc;
		this.translations = translations;
		this.wallet = wallet;
	}

	/** Approved notes of a chapter, for the reader. */
	public List<NoteDto> chapterNotes(String slug, int chapter) {
		return jdbc.query("select " + NOTE_COLUMNS + """
				from cultural_notes n left join app_users u on u.id::text = n.author_id
				where n.manga_slug = :slug and n.chapter_number = :chapter and n.status = 'approved'
				order by n.page_number, n.y, n.x
				""", params(slug, chapter), (rs, i) -> toDto(rs, false));
	}

	/** Approved notes plus my own (any status), for the contribution tool. */
	public List<NoteDto> contributorNotes(String userId, String slug, int chapter) {
		return jdbc.query("select " + NOTE_COLUMNS + """
				from cultural_notes n left join app_users u on u.id::text = n.author_id
				where n.manga_slug = :slug and n.chapter_number = :chapter
				  and (n.status = 'approved' or n.author_id = :user)
				order by n.page_number, n.y, n.x
				""", params(slug, chapter).addValue("user", userId), (rs, i) -> toDto(rs, true));
	}

	/** The series' creator and staff publish directly; everyone else's note waits for review. */
	public NoteDto create(String userId, String email, boolean staff, String slug, int chapter, CreateNoteRequest req) {
		if (req == null || req.page() == null) throw new IllegalArgumentException("page is required");
		double x = TranslationService.pct(req.x(), "x"), y = TranslationService.pct(req.y(), "y");
		double w = TranslationService.pct(req.w(), "w"), h = TranslationService.pct(req.h(), "h");
		if (w < 1 || h < 1) throw new IllegalArgumentException("note area is too small");
		if (x + w > 100.001 || y + h > 100.001) throw new IllegalArgumentException("note area is outside the page");
		String title = TranslationService.trimTo(req.title(), MAX_TITLE);
		String body = TranslationService.trimTo(req.body(), MAX_BODY);
		if (title == null || body == null) throw new IllegalArgumentException("title and body are required");
		int pages = translations.pageCount(slug, chapter);
		if (req.page() < 1 || req.page() > pages) throw new IllegalArgumentException("page is invalid");
		Integer onPage = jdbc.queryForObject("""
				select count(*) from cultural_notes
				where manga_slug = :slug and chapter_number = :chapter and page_number = :page and status <> 'rejected'
				""", params(slug, chapter).addValue("page", req.page()), Integer.class);
		if (onPage != null && onPage >= MAX_NOTES_PER_PAGE) throw new IllegalArgumentException("too many notes on this page");

		boolean publishNow = staff || translations.ownsSeriesOf(email, slug);
		UUID id = UUID.randomUUID();
		jdbc.update("""
				insert into cultural_notes (id, manga_slug, chapter_number, page_number, x, y, w, h, title, body, author_id,
				                            status, reviewed_by, reviewed_at)
				values (:id, :slug, :chapter, :page, :x, :y, :w, :h, :title, :body, :user, :status,
				        case when :published then :user end, case when :published then now() end)
				""", params(slug, chapter).addValue("id", id).addValue("page", req.page())
			.addValue("x", x).addValue("y", y).addValue("w", w).addValue("h", h)
			.addValue("title", title).addValue("body", body).addValue("user", userId)
			.addValue("status", publishNow ? "approved" : "pending").addValue("published", publishNow));
		return contributorNotes(userId, slug, chapter).stream().filter(n -> n.id().equals(id.toString())).findFirst().orElseThrow();
	}

	/** The author can remove a note still under review; the series owner and staff can remove any. */
	public void delete(String userId, String email, boolean staff, String idRaw) {
		Map<String, Object> n = note(TranslationService.parseId(idRaw));
		boolean owner = staff || translations.ownsSeriesOf(email, String.valueOf(n.get("manga_slug")));
		boolean mineUnderReview = userId.equals(n.get("author_id")) && !"approved".equals(n.get("status"));
		if (!owner && !mineUnderReview) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not allowed");
		jdbc.update("delete from cultural_notes where id = :id", Map.of("id", n.get("id")));
	}

	public List<PendingNoteDto> pending(String email, boolean staff) {
		return jdbc.query("""
				select n.id, n.manga_slug, m.title as series_title, n.chapter_number, n.page_number, n.title, n.body,
				       coalesce(nullif(u.display_name, ''), 'Lecteur') as author_name, n.created_at
				from cultural_notes n
				join manga m on m.slug = n.manga_slug
				left join app_users u on u.id::text = n.author_id
				where n.status = 'pending'
				  and (:all or exists (
				    select 1 from creator_manga_submissions s
				    where lower(s.creator_email) = :email and lower(trim(s.payload->>'title')) = lower(trim(m.title))
				  ))
				order by n.created_at
				limit 200
				""", new MapSqlParameterSource().addValue("all", staff).addValue("email", email == null ? "" : email.trim().toLowerCase()),
			(rs, i) -> new PendingNoteDto(rs.getString("id"), rs.getString("manga_slug"), rs.getString("series_title"),
				rs.getInt("chapter_number"), rs.getInt("page_number"), rs.getString("title"), rs.getString("body"),
				rs.getString("author_name"), rs.getTimestamp("created_at").toInstant()));
	}

	/** Approves a pending note and pays its author once (not when approving one's own). */
	@Transactional
	public ReviewResultDto approve(String reviewerId, String email, boolean staff, String idRaw) {
		Map<String, Object> n = noteForReview(TranslationService.parseId(idRaw), email, staff);
		UUID id = (UUID) n.get("id");
		List<String> won = jdbc.queryForList("""
				update cultural_notes set status = 'approved', reviewed_by = :reviewer, reviewed_at = now()
				where id = :id and status = 'pending'
				returning author_id
				""", new MapSqlParameterSource().addValue("id", id).addValue("reviewer", reviewerId), String.class);
		if (won.isEmpty()) return new ReviewResultDto(id.toString(), String.valueOf(n.get("status")), 0);
		String author = won.get(0);
		int paid = author.equals(reviewerId) ? 0 : Math.max(0, rewardCoins);
		if (paid > 0) wallet.creditReward(author, "CULTURAL_NOTE_REWARD", paid, "cultural_note", id.toString());
		return new ReviewResultDto(id.toString(), "approved", paid);
	}

	public ReviewResultDto reject(String reviewerId, String email, boolean staff, String idRaw) {
		Map<String, Object> n = noteForReview(TranslationService.parseId(idRaw), email, staff);
		jdbc.update("""
				update cultural_notes set status = 'rejected', reviewed_by = :reviewer, reviewed_at = now()
				where id = :id and status = 'pending'
				""", new MapSqlParameterSource().addValue("id", n.get("id")).addValue("reviewer", reviewerId));
		return new ReviewResultDto(String.valueOf(n.get("id")), "rejected", 0);
	}

	private Map<String, Object> noteForReview(UUID id, String email, boolean staff) {
		Map<String, Object> n = note(id);
		if (!staff && !translations.ownsSeriesOf(email, String.valueOf(n.get("manga_slug")))) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only the series' creator can review its notes");
		}
		return n;
	}

	private Map<String, Object> note(UUID id) {
		List<Map<String, Object>> rows = jdbc.queryForList(
			"select id, manga_slug, author_id, status from cultural_notes where id = :id", Map.of("id", id));
		if (rows.isEmpty()) throw new NotFoundException("Note not found");
		return rows.get(0);
	}

	private static NoteDto toDto(java.sql.ResultSet rs, boolean withStatus) throws java.sql.SQLException {
		return new NoteDto(rs.getString("id"), rs.getInt("page_number"), rs.getDouble("x"), rs.getDouble("y"),
			rs.getDouble("w"), rs.getDouble("h"), rs.getString("title"), rs.getString("body"),
			rs.getString("author_name"), withStatus ? rs.getString("status") : null);
	}

	private static MapSqlParameterSource params(String slug, int chapter) {
		return new MapSqlParameterSource().addValue("slug", slug == null ? "" : slug.trim()).addValue("chapter", chapter);
	}
}
