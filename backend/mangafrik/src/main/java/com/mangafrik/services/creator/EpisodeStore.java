package com.mangafrik.services.creator;

import com.mangafrik.dto.creator.EpisodeDtos.AddCommentRequest;
import com.mangafrik.dto.creator.EpisodeDtos.CreateDraftRequest;
import com.mangafrik.dto.creator.EpisodeDtos.CreatePublishedRequest;
import com.mangafrik.dto.creator.EpisodeDtos.EpisodeDraftDto;
import com.mangafrik.dto.creator.EpisodeDtos.PublishedEpisodeDto;
import com.mangafrik.exception.NotFoundException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;

@Service
public class EpisodeStore {
	private final CopyOnWriteArrayList<EpisodeDraftDto> drafts = new CopyOnWriteArrayList<>();
	private final CopyOnWriteArrayList<PublishedEpisodeDto> published = new CopyOnWriteArrayList<>();

	public List<EpisodeDraftDto> listDrafts() {
		return new ArrayList<>(drafts);
	}

	public EpisodeDraftDto createDraft(CreateDraftRequest req) {
		EpisodeDraftDto dto = new EpisodeDraftDto(
				"ed_" + UUID.randomUUID(),
				Instant.now(),
				nz(req.seriesTitle()),
				nz(req.episodeTitle()),
				blankToNull(req.creatorNote()),
				req.commentsEnabled() == null || req.commentsEnabled(),
				nz(req.publishMode()),
				nz(req.publishAt()),
				req.thumb(),
				req.images() == null ? List.of() : req.images()
		);
		drafts.add(0, dto);
		while (drafts.size() > 50) drafts.remove(drafts.size() - 1);
		return dto;
	}

	public List<PublishedEpisodeDto> listPublished() {
		return new ArrayList<>(published);
	}

	public PublishedEpisodeDto createPublished(CreatePublishedRequest req) {
		Map<String, Object> stats = new HashMap<>();
		stats.put("views", 0);
		stats.put("likes", 0);
		stats.put("comments", 0);
		PublishedEpisodeDto dto = new PublishedEpisodeDto(
				"ep_" + UUID.randomUUID(),
				Instant.now(),
				blankToNull(req.scheduledFor()),
				nz(req.seriesTitle()),
				nz(req.episodeTitle()),
				blankToNull(req.creatorNote()),
				req.commentsEnabled() == null || req.commentsEnabled(),
				req.thumb(),
				req.images() == null ? List.of() : req.images(),
				stats,
				new ArrayList<>()
		);
		published.add(0, dto);
		while (published.size() > 200) published.remove(published.size() - 1);
		return dto;
	}

	public PublishedEpisodeDto incrementView(String id) {
		return updateStats(id, "views", 1);
	}

	public PublishedEpisodeDto addLike(String id) {
		return updateStats(id, "likes", 1);
	}

	public PublishedEpisodeDto addComment(String id, AddCommentRequest req) {
		for (int i = 0; i < published.size(); i++) {
			PublishedEpisodeDto ep = published.get(i);
			if (Objects.equals(ep.id(), id)) {
				List<Map<String, Object>> comments = new ArrayList<>(ep.comments() == null ? List.of() : ep.comments());
				Map<String, Object> row = new HashMap<>();
				row.put("id", UUID.randomUUID().toString());
				row.put("createdAt", Instant.now().toString());
				row.put("author", blankToNull(req.author()));
				row.put("text", nz(req.text()));
				comments.add(0, row);

				Map<String, Object> nextStats = new HashMap<>(ep.stats() == null ? Map.of() : ep.stats());
				int current = asInt(nextStats.get("comments"));
				nextStats.put("comments", current + 1);

				PublishedEpisodeDto next = new PublishedEpisodeDto(
						ep.id(),
						ep.publishedAt(),
						ep.scheduledFor(),
						ep.seriesTitle(),
						ep.episodeTitle(),
						ep.creatorNote(),
						ep.commentsEnabled(),
						ep.thumb(),
						ep.images(),
						nextStats,
						comments
				);
				published.set(i, next);
				return next;
			}
		}
		throw new NotFoundException("Episode not found");
	}

	private PublishedEpisodeDto updateStats(String id, String key, int delta) {
		for (int i = 0; i < published.size(); i++) {
			PublishedEpisodeDto ep = published.get(i);
			if (Objects.equals(ep.id(), id)) {
				Map<String, Object> nextStats = new HashMap<>(ep.stats() == null ? Map.of() : ep.stats());
				int current = asInt(nextStats.get(key));
				nextStats.put(key, current + delta);
				PublishedEpisodeDto next = new PublishedEpisodeDto(
						ep.id(),
						ep.publishedAt(),
						ep.scheduledFor(),
						ep.seriesTitle(),
						ep.episodeTitle(),
						ep.creatorNote(),
						ep.commentsEnabled(),
						ep.thumb(),
						ep.images(),
						nextStats,
						ep.comments()
				);
				published.set(i, next);
				return next;
			}
		}
		throw new NotFoundException("Episode not found");
	}

	private int asInt(Object v) {
		if (v instanceof Number n) return n.intValue();
		if (v == null) return 0;
		try {
			return Integer.parseInt(String.valueOf(v));
		} catch (NumberFormatException ex) {
			return 0;
		}
	}

	private String nz(String s) {
		return s == null ? "" : s;
	}

	private String blankToNull(String s) {
		if (s == null) return null;
		String t = s.trim();
		return t.isEmpty() ? null : t;
	}
}

