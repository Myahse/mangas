package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.creator.CreateMangaSubmissionRequest;
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
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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
		String authEmail = SecurityUtils.getCurrentUserEmail().orElse(null);
		String authName = SecurityUtils.getCurrentUsername().orElse(null);
		CreateMangaSubmissionRequest normalized = new CreateMangaSubmissionRequest(
				authEmail != null && !authEmail.isBlank() ? authEmail : req.creatorEmail(),
				authName != null && !authName.isBlank() ? authName : req.creatorDisplayName(),
				req.payload()
		);
		MangaSubmissionDto submission = creatorStore.createSubmission(normalized);
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
		String authEmail = SecurityUtils.getCurrentUserEmail().orElse("");
		String filterEmail = !authEmail.isBlank() ? authEmail : (email == null ? "" : email);
		return creatorStore.listSubmissions(filterEmail);
	}

	@GetMapping("/episodes/drafts")
	public List<EpisodeDraftDto> listDrafts() {
		return episodeStore.listDrafts(ownerFilter());
	}

	@PostMapping("/episodes/drafts")
	public EpisodeDraftDto createDraft(@RequestBody CreateDraftRequest req) {
		return episodeStore.createDraft(req, SecurityUtils.getCurrentUserEmail().orElse(null));
	}

	@GetMapping("/episodes/published")
	public List<PublishedEpisodeDto> listPublished() {
		return episodeStore.listPublished(ownerFilter());
	}

	@PostMapping("/episodes/published")
	public PublishedEpisodeDto createPublished(@RequestBody CreatePublishedRequest req) {
		String creatorEmail = SecurityUtils.getCurrentUserEmail().orElse(null);
		// Published episodes join the catalog by series title, so a creator may only publish into their own série.
		if (!isStaff() && !creatorStore.ownsSeries(creatorEmail, req.seriesTitle())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only publish episodes for your own series");
		}
		return episodeStore.createPublished(req, creatorEmail);
	}

	private static boolean isStaff() {
		return SecurityUtils.hasAnyRole("ADMIN", "SUPPORT");
	}

	/** Staff see every creator's episodes; creators only their own ("" matches nothing). */
	private static String ownerFilter() {
		return isStaff() ? null : SecurityUtils.getCurrentUserEmail().orElse("");
	}

}

