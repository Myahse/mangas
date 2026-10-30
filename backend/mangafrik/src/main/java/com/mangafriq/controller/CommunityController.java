package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.community.CommentService;
import com.mangafriq.services.community.ReadingStreakService;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Chapter comments (reading is public, writing needs sign-in) and the reader's reading streak. */
@RestController
@RequestMapping(AppConstants.API_V1)
public class CommunityController {
	private final CommentService comments;
	private final ReadingStreakService streaks;

	public CommunityController(CommentService comments, ReadingStreakService streaks) {
		this.comments = comments;
		this.streaks = streaks;
	}

	public record CommentRequest(String text) {}

	@GetMapping("/manga/{slug}/chapters/{chapter}/comments")
	public Map<String, Object> list(@PathVariable String slug, @PathVariable int chapter) {
		return comments.list(slug, chapter, optionalUserId(), email(), isStaff());
	}

	@PostMapping("/manga/{slug}/chapters/{chapter}/comments")
	public Map<String, Object> post(@PathVariable String slug, @PathVariable int chapter, @RequestBody CommentRequest req) {
		return comments.post(userId(), email(), isStaff(), slug, chapter, req == null ? null : req.text());
	}

	@PostMapping("/comments/{id}/like")
	public Map<String, Object> like(@PathVariable String id) {
		return comments.toggleLike(userId(), id);
	}

	@DeleteMapping("/comments/{id}")
	public Map<String, String> delete(@PathVariable String id) {
		comments.remove(userId(), email(), isStaff(), id);
		return Map.of("status", "ok");
	}

	@GetMapping("/reading-streak")
	public Map<String, Object> streak() {
		return streaks.status(userId());
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
