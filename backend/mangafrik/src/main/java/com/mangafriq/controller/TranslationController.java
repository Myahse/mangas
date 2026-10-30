package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.translation.TranslationDtos.ChapterBubblesDto;
import com.mangafriq.dto.translation.TranslationDtos.ChapterLanguageDto;
import com.mangafriq.dto.translation.TranslationDtos.CreateBubbleRequest;
import com.mangafriq.dto.translation.TranslationDtos.LanguageDto;
import com.mangafriq.dto.translation.TranslationDtos.PendingTranslationDto;
import com.mangafriq.dto.translation.TranslationDtos.ReviewResultDto;
import com.mangafriq.dto.translation.TranslationDtos.SubmitTranslationRequest;
import com.mangafriq.dto.translation.TranslationDtos.TranslatorBubbleDto;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.dto.translation.NoteDtos.CreateNoteRequest;
import com.mangafriq.dto.translation.NoteDtos.NoteDto;
import com.mangafriq.dto.translation.NoteDtos.PendingNoteDto;
import com.mangafriq.dto.translation.NarrationDtos.NarrationDto;
import com.mangafriq.dto.translation.NarrationDtos.PendingAudioDto;
import com.mangafriq.services.translation.CulturalNoteService;
import com.mangafriq.services.translation.NarrationService;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import com.mangafriq.services.translation.TranslationService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Community translations, cultural notes and griot-mode recordings.
 * Reading (public, under the catalog): languages of a chapter and its translated bubbles.
 * Translating (signed in, /translate): draw bubbles and submit texts.
 * Reviewing (series creator or staff, /creator/translations): approve or reject.
 */
@RestController
@RequestMapping(AppConstants.API_V1)
public class TranslationController {
	private final TranslationService translations;
	private final CulturalNoteService notes;
	private final NarrationService narrations;

	public TranslationController(TranslationService translations, CulturalNoteService notes, NarrationService narrations) {
		this.translations = translations;
		this.notes = notes;
		this.narrations = narrations;
	}

	@GetMapping("/manga/translation-languages")
	public List<LanguageDto> languages() {
		return translations.languages();
	}

	@GetMapping("/manga/{slug}/chapters/{chapter}/languages")
	public List<ChapterLanguageDto> chapterLanguages(@PathVariable String slug, @PathVariable int chapter) {
		return translations.chapterLanguages(slug, chapter);
	}

	@GetMapping("/manga/{slug}/chapters/{chapter}/bubbles")
	public ChapterBubblesDto bubbles(@PathVariable String slug, @PathVariable int chapter, @RequestParam String lang) {
		return translations.chapterBubbles(slug, chapter, lang);
	}

	@GetMapping("/translate/{slug}/chapters/{chapter}/bubbles")
	public List<TranslatorBubbleDto> translatorBubbles(@PathVariable String slug, @PathVariable int chapter, @RequestParam String lang) {
		return translations.translatorBubbles(userId(), slug, chapter, lang);
	}

	@PostMapping("/translate/{slug}/chapters/{chapter}/bubbles")
	public TranslatorBubbleDto createBubble(@PathVariable String slug, @PathVariable int chapter, @RequestBody CreateBubbleRequest req) {
		return translations.createBubble(userId(), slug, chapter, req);
	}

	@DeleteMapping("/translate/bubbles/{id}")
	public Map<String, String> deleteBubble(@PathVariable String id) {
		translations.deleteBubble(userId(), email(), isStaff(), id);
		return Map.of("status", "ok");
	}

	@PutMapping("/translate/bubbles/{id}/translation")
	public TranslatorBubbleDto submit(@PathVariable String id, @RequestBody SubmitTranslationRequest req) {
		return translations.submit(userId(), id, req);
	}

	@GetMapping("/creator/translations/pending")
	public List<PendingTranslationDto> pending() {
		return translations.pending(email(), isStaff());
	}

	@PostMapping("/creator/translations/{id}/approve")
	public ReviewResultDto approve(@PathVariable String id) {
		return translations.approve(userId(), email(), isStaff(), id);
	}

	@PostMapping("/creator/translations/{id}/reject")
	public ReviewResultDto reject(@PathVariable String id) {
		return translations.reject(userId(), email(), isStaff(), id);
	}

	/* ─── Cultural notes ─── */

	@GetMapping("/manga/{slug}/chapters/{chapter}/notes")
	public List<NoteDto> notes(@PathVariable String slug, @PathVariable int chapter) {
		return notes.chapterNotes(slug, chapter);
	}

	@GetMapping("/translate/{slug}/chapters/{chapter}/notes")
	public List<NoteDto> contributorNotes(@PathVariable String slug, @PathVariable int chapter) {
		return notes.contributorNotes(userId(), slug, chapter);
	}

	@PostMapping("/translate/{slug}/chapters/{chapter}/notes")
	public NoteDto createNote(@PathVariable String slug, @PathVariable int chapter, @RequestBody CreateNoteRequest req) {
		return notes.create(userId(), email(), isStaff(), slug, chapter, req);
	}

	@DeleteMapping("/translate/notes/{id}")
	public Map<String, String> deleteNote(@PathVariable String id) {
		notes.delete(userId(), email(), isStaff(), id);
		return Map.of("status", "ok");
	}

	@GetMapping("/creator/notes/pending")
	public List<PendingNoteDto> pendingNotes() {
		return notes.pending(email(), isStaff());
	}

	@PostMapping("/creator/notes/{id}/approve")
	public ReviewResultDto approveNote(@PathVariable String id) {
		return notes.approve(userId(), email(), isStaff(), id);
	}

	@PostMapping("/creator/notes/{id}/reject")
	public ReviewResultDto rejectNote(@PathVariable String id) {
		return notes.reject(userId(), email(), isStaff(), id);
	}

	/* ─── Griot mode (narration) ─── */

	@GetMapping("/manga/{slug}/chapters/{chapter}/narration")
	public NarrationDto narration(@PathVariable String slug, @PathVariable int chapter, @RequestParam(required = false) String lang) {
		return narrations.narration(slug, chapter, lang);
	}

	@PostMapping(value = "/translate/bubbles/{id}/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Map<String, Object> submitAudio(
			@PathVariable String id,
			@RequestParam(required = false) String lang,
			@RequestParam(required = false) Integer durationMs,
			@RequestPart("file") MultipartFile file) throws IOException {
		return narrations.submit(userId(), id, lang, file, durationMs);
	}

	@GetMapping("/translate/bubbles/{id}/audio")
	public Map<String, Object> myAudio(@PathVariable String id, @RequestParam(required = false) String lang) {
		return narrations.mine(userId(), id, lang);
	}

	@GetMapping("/creator/narrations/pending")
	public List<PendingAudioDto> pendingNarrations() {
		return narrations.pending(email(), isStaff());
	}

	@PostMapping("/creator/narrations/{id}/approve")
	public ReviewResultDto approveNarration(@PathVariable String id) {
		return narrations.approve(userId(), email(), isStaff(), id);
	}

	@PostMapping("/creator/narrations/{id}/reject")
	public ReviewResultDto rejectNarration(@PathVariable String id) {
		return narrations.reject(userId(), email(), isStaff(), id);
	}

	private static String userId() {
		return SecurityUtils.getCurrentUserIdString().orElseThrow(() -> new IllegalArgumentException("unauthorized"));
	}

	private static String email() {
		return SecurityUtils.getCurrentUserEmail().orElse("");
	}

	private static boolean isStaff() {
		return SecurityUtils.hasAnyRole("ADMIN", "SUPPORT");
	}
}
