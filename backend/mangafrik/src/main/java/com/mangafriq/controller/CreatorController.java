package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.creator.CreateMangaSubmissionRequest;
import com.mangafriq.dto.creator.EpisodeDtos.AddCommentRequest;
import com.mangafriq.dto.creator.EpisodeDtos.CreateDraftRequest;
import com.mangafriq.dto.creator.EpisodeDtos.CreatePublishedRequest;
import com.mangafriq.dto.creator.EpisodeDtos.EpisodeDraftDto;
import com.mangafriq.dto.creator.EpisodeDtos.PublishedEpisodeDto;
import com.mangafriq.dto.creator.MangaSubmissionDto;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.creator.CreatorStore;
import com.mangafriq.services.creator.EpisodeStore;
import com.mangafriq.services.email.CreatorPublishNotificationService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/creator")
public class CreatorController {
	private final CreatorStore creatorStore;
	private final EpisodeStore episodeStore;
	private final CreatorPublishNotificationService creatorPublishNotify;

	public CreatorController(
			CreatorStore creatorStore,
			EpisodeStore episodeStore,
			CreatorPublishNotificationService creatorPublishNotify) {
		this.creatorStore = creatorStore;
		this.episodeStore = episodeStore;
		this.creatorPublishNotify = creatorPublishNotify;
	}

	@PostMapping("/submissions")
	public MangaSubmissionDto createSubmission(@RequestBody CreateMangaSubmissionRequest req) {
		MangaSubmissionDto submission = creatorStore.createSubmission(req);
		String mangaTitle = submissionTitle(submission.payload());
		try {
			String email = submission.creator() == null ? "" : submission.creator().email();
			creatorPublishNotify.notifyMangaSubmittedForReview(email, mangaTitle);
		} catch (Exception ignored) {
			// Email must not block submission save.
		}
		return submission;
	}

	private static String submissionTitle(Map<String, Object> payload) {
		if (payload == null) return "";
		Object t = payload.get("title");
		String s = t == null ? "" : String.valueOf(t).trim();
		return s.isBlank() ? "" : s;
	}

	@GetMapping("/submissions")
	public List<MangaSubmissionDto> listSubmissions(@RequestParam(required = false) String email) {
		return creatorStore.listSubmissions(email);
	}

	@GetMapping("/episodes/drafts")
	public List<EpisodeDraftDto> listDrafts() {
		return episodeStore.listDrafts();
	}

	@PostMapping("/episodes/drafts")
	public EpisodeDraftDto createDraft(@RequestBody CreateDraftRequest req) {
		return episodeStore.createDraft(req);
	}

	@GetMapping("/episodes/published")
	public List<PublishedEpisodeDto> listPublished() {
		return episodeStore.listPublished();
	}

	@PostMapping("/episodes/published")
	public PublishedEpisodeDto createPublished(@RequestBody CreatePublishedRequest req) {
		String creatorEmail = SecurityUtils.getCurrentUserEmail().orElse(null);
		return episodeStore.createPublished(req, creatorEmail);
	}

	@PostMapping("/episodes/published/{id}/view")
	public PublishedEpisodeDto view(@org.springframework.web.bind.annotation.PathVariable String id) {
		return episodeStore.incrementView(id);
	}

	@PostMapping("/episodes/published/{id}/like")
	public PublishedEpisodeDto like(@org.springframework.web.bind.annotation.PathVariable String id) {
		return episodeStore.addLike(id);
	}

	@PostMapping("/episodes/published/{id}/comments")
	public PublishedEpisodeDto comment(@org.springframework.web.bind.annotation.PathVariable String id, @RequestBody AddCommentRequest req) {
		return episodeStore.addComment(id, req);
	}
}

