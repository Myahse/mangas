package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.poll.PollDtos.CreatePollRequest;
import com.mangafriq.dto.poll.PollDtos.PollDto;
import com.mangafriq.dto.poll.PollDtos.VoteRequest;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.poll.PollService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Les lecteurs votent la suite".
 * Reading (public, under the catalog; the reader's own vote when signed in), voting (signed in, /polls),
 * and the creator's polls (/creator/polls).
 */
@RestController
@RequestMapping(AppConstants.API_V1)
public class PollController {
	private final PollService polls;

	public PollController(PollService polls) {
		this.polls = polls;
	}

	/** 204 when the chapter has no poll. */
	@GetMapping("/manga/{slug}/chapters/{chapter}/poll")
	public ResponseEntity<PollDto> chapterPoll(@PathVariable String slug, @PathVariable int chapter) {
		PollDto poll = polls.chapterPoll(slug, chapter, optionalUserId());
		return poll == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(poll);
	}

	@PostMapping("/polls/{id}/vote")
	public PollDto vote(@PathVariable String id, @RequestBody VoteRequest req) {
		return polls.vote(userId(), id, req);
	}

	@GetMapping("/creator/polls")
	public List<PollDto> myPolls() {
		return polls.myPolls(userId(), email(), isStaff());
	}

	@PostMapping("/creator/polls")
	public PollDto create(@RequestBody CreatePollRequest req) {
		return polls.create(userId(), email(), isStaff(), req);
	}

	@PostMapping("/creator/polls/{id}/close")
	public PollDto close(@PathVariable String id) {
		return polls.close(userId(), email(), isStaff(), id);
	}

	/** The signed-in reader's id, or null (anonymous visitors also count as "authenticated" here). */
	private static String optionalUserId() {
		return SecurityUtils.getCurrentUserIdString()
			.filter(id -> id.matches("^\\d+$") || id.matches("^[0-9a-fA-F-]{36}$"))
			.orElse(null);
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
