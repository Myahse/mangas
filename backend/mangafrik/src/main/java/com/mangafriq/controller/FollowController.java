package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.security.utils.SecurityUtils;
import com.mangafriq.services.follow.FollowService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Following series ("Mes abonnements") and the reader's notifications (signed in). */
@RestController
@RequestMapping(AppConstants.API_V1)
public class FollowController {
	private final FollowService follows;

	public FollowController(FollowService follows) {
		this.follows = follows;
	}

	@GetMapping("/follows")
	public List<Map<String, Object>> followed() {
		return follows.followed(userId());
	}

	@GetMapping("/follows/{slug}")
	public Map<String, Object> status(@PathVariable String slug) {
		return Map.of("following", follows.isFollowing(userId(), slug), "followers", follows.followers(slug));
	}

	@PutMapping("/follows/{slug}")
	public Map<String, Object> follow(@PathVariable String slug) {
		follows.follow(userId(), slug);
		return status(slug);
	}

	@DeleteMapping("/follows/{slug}")
	public Map<String, Object> unfollow(@PathVariable String slug) {
		follows.unfollow(userId(), slug);
		return status(slug);
	}

	@GetMapping("/notifications")
	public Map<String, Object> notifications(@RequestParam(defaultValue = "20") int limit) {
		String uid = userId();
		return Map.of("unread", follows.unreadCount(uid), "items", follows.notifications(uid, limit));
	}

	@PostMapping("/notifications/{id}/read")
	public Map<String, Object> read(@PathVariable String id) {
		follows.markRead(userId(), id);
		return Map.of("unread", follows.unreadCount(userId()));
	}

	@PostMapping("/notifications/read-all")
	public Map<String, Object> readAll() {
		follows.markRead(userId(), null);
		return Map.of("unread", 0);
	}

	private static String userId() {
		return SecurityUtils.getCurrentUserIdString().orElseThrow(() -> new IllegalArgumentException("unauthorized"));
	}
}
