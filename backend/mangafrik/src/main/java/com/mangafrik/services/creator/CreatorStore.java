package com.mangafrik.services.creator;

import com.mangafrik.dto.creator.CreateMangaSubmissionRequest;
import com.mangafrik.dto.creator.MangaSubmissionDto;
import com.mangafrik.dto.creator.MangaSubmissionDto.CreatorDto;
import com.mangafrik.dto.creator.MangaSubmissionDto.ModerationDto;
import com.mangafrik.exception.NotFoundException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;

@Service
public class CreatorStore {
	private final CopyOnWriteArrayList<MangaSubmissionDto> submissions = new CopyOnWriteArrayList<>();

	public MangaSubmissionDto createSubmission(CreateMangaSubmissionRequest req) {
		Instant now = Instant.now();
		MangaSubmissionDto dto = new MangaSubmissionDto(
				UUID.randomUUID().toString(),
				"pending",
				now,
				new CreatorDto(
						(req.creatorEmail() == null || req.creatorEmail().isBlank()) ? "unknown" : req.creatorEmail(),
						(req.creatorDisplayName() == null || req.creatorDisplayName().isBlank()) ? "Unknown creator" : req.creatorDisplayName()
				),
				req.payload(),
				new ModerationDto(null, "", null)
		);
		submissions.add(dto);
		return dto;
	}

	public List<MangaSubmissionDto> listSubmissions(String creatorEmail) {
		List<MangaSubmissionDto> list = new ArrayList<>(submissions);
		if (creatorEmail != null && !creatorEmail.isBlank()) {
			String email = creatorEmail.toLowerCase().trim();
			list = list.stream()
					.filter(s -> s.creator() != null && Objects.equals(s.creator().email().toLowerCase().trim(), email))
					.toList();
		}
		return list.stream()
				.sorted(Comparator.comparing(MangaSubmissionDto::createdAt).reversed())
				.toList();
	}

	public MangaSubmissionDto reviewSubmission(String id, String decision, String reason) {
		if (id == null || id.isBlank()) throw new NotFoundException("Submission not found");
		for (int i = 0; i < submissions.size(); i++) {
			MangaSubmissionDto s = submissions.get(i);
			if (Objects.equals(s.id(), id)) {
				Instant now = Instant.now();
				MangaSubmissionDto next = new MangaSubmissionDto(
						s.id(),
						decision,
						s.createdAt(),
						s.creator(),
						s.payload(),
						new ModerationDto(decision, reason == null ? "" : reason, now)
				);
				submissions.set(i, next);
				return next;
			}
		}
		throw new NotFoundException("Submission not found");
	}
}

