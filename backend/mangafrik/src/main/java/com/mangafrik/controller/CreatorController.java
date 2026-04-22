package com.mangafrik.controller;

import com.mangafrik.constants.AppConstants;
import com.mangafrik.dto.creator.CreateMangaSubmissionRequest;
import com.mangafrik.dto.creator.EpisodeDtos.AddCommentRequest;
import com.mangafrik.dto.creator.EpisodeDtos.CreateDraftRequest;
import com.mangafrik.dto.creator.EpisodeDtos.CreatePublishedRequest;
import com.mangafrik.dto.creator.EpisodeDtos.EpisodeDraftDto;
import com.mangafrik.dto.creator.EpisodeDtos.PublishedEpisodeDto;
import com.mangafrik.dto.creator.MangaSubmissionDto;
import com.mangafrik.services.creator.CreatorStore;
import com.mangafrik.services.creator.EpisodeStore;
import java.util.List;
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

	public CreatorController(CreatorStore creatorStore, EpisodeStore episodeStore) {
		this.creatorStore = creatorStore;
		this.episodeStore = episodeStore;
	}

	@PostMapping("/submissions")
	public MangaSubmissionDto createSubmission(@RequestBody CreateMangaSubmissionRequest req) {
		return creatorStore.createSubmission(req);
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
		return episodeStore.createPublished(req);
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

