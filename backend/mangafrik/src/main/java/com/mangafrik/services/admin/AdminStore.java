package com.mangafrik.services.admin;

import com.mangafrik.dto.admin.AdminDtos.AdminMangaDto;
import com.mangafrik.dto.admin.AdminDtos.AdminSummaryDto;
import com.mangafrik.dto.admin.AdminDtos.AdminUserDto;
import com.mangafrik.dto.admin.AdminDtos.AuditDto;
import com.mangafrik.dto.admin.AdminDtos.CreateManga;
import com.mangafrik.dto.admin.AdminDtos.CreateMangaRequest;
import com.mangafrik.dto.admin.AdminDtos.CreatorRequestDto;
import com.mangafrik.dto.admin.AdminDtos.MangaRequestDto;
import com.mangafrik.dto.admin.AdminDtos.ReviewRequest;
import com.mangafrik.dto.admin.AdminDtos.UpdateManga;
import com.mangafrik.dto.admin.AdminDtos.UpdateMangaRequest;
import com.mangafrik.dto.admin.AdminDtos.UpdateUserRequest;
import com.mangafrik.exception.NotFoundException;
import com.mangafrik.services.creator.CreatorStore;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;

@Service
public class AdminStore {
	private final CopyOnWriteArrayList<AdminUserDto> users = new CopyOnWriteArrayList<>();
	private final CopyOnWriteArrayList<CreatorRequestDto> creatorRequests = new CopyOnWriteArrayList<>();
	private final CopyOnWriteArrayList<MangaRequestDto> mangaRequests = new CopyOnWriteArrayList<>();
	private final CopyOnWriteArrayList<AdminMangaDto> mangas = new CopyOnWriteArrayList<>();
	private final CopyOnWriteArrayList<AuditDto> audits = new CopyOnWriteArrayList<>();

	private final CreatorStore creatorStore;

	public AdminStore(CreatorStore creatorStore) {
		this.creatorStore = creatorStore;
		seed();
	}

	public AdminSummaryDto summary() {
		int requestsNew = (int) mangaRequests.stream().filter(r -> Objects.equals(r.status(), "new")).count();
		int mangasPublished = (int) mangas.stream().filter(m -> Objects.equals(m.status(), "published")).count();
		int creatorPending = (int) creatorRequests.stream().filter(r -> Objects.equals(r.status(), "pending")).count();
		int submissionsPending = (int) creatorStore.listSubmissions(null).stream().filter(s -> Objects.equals(s.status(), "pending")).count();
		return new AdminSummaryDto(
				users.size(),
				mangaRequests.size(),
				requestsNew,
				mangas.size(),
				mangasPublished,
				audits.size(),
				creatorPending,
				submissionsPending
		);
	}

	public List<AuditDto> listAudits() {
		return audits.stream()
				.sorted(Comparator.comparing(AuditDto::at).reversed())
				.toList();
	}

	public List<AdminUserDto> listUsers() {
		return users.stream()
				.sorted(Comparator.comparing(AdminUserDto::createdAt).reversed())
				.toList();
	}

	public AdminUserDto updateUser(String id, UpdateUserRequest patch) {
		for (int i = 0; i < users.size(); i++) {
			AdminUserDto u = users.get(i);
			if (Objects.equals(u.id(), id)) {
				AdminUserDto next = new AdminUserDto(
						u.id(),
						u.email(),
						patch.displayName() != null ? patch.displayName() : u.displayName(),
						patch.role() != null ? patch.role() : u.role(),
						patch.status() != null ? patch.status() : u.status(),
						u.createdAt(),
						u.source()
				);
				users.set(i, next);
				audit("user.update", new java.util.HashMap<>(java.util.Map.of("id", id)));
				return next;
			}
		}
		throw new NotFoundException("User not found");
	}

	public List<CreatorRequestDto> listCreatorRequests() {
		return creatorRequests.stream()
				.sorted(Comparator.comparing(CreatorRequestDto::createdAt).reversed())
				.toList();
	}

	public CreatorRequestDto reviewCreatorRequest(String id, ReviewRequest req) {
		for (int i = 0; i < creatorRequests.size(); i++) {
			CreatorRequestDto r = creatorRequests.get(i);
			if (Objects.equals(r.id(), id)) {
				Instant now = Instant.now();
				CreatorRequestDto next = new CreatorRequestDto(
						r.id(),
						r.email(),
						r.displayName(),
						req.decision(),
						req.reason() == null ? "" : req.reason(),
						r.createdAt(),
						now
				);
				creatorRequests.set(i, next);
				audit("creator_request.review", java.util.Map.of("id", id, "decision", req.decision()));
				return next;
			}
		}
		throw new NotFoundException("Creator request not found");
	}

	public List<MangaRequestDto> listMangaRequests() {
		return mangaRequests.stream()
				.sorted(Comparator.comparing(MangaRequestDto::createdAt).reversed())
				.toList();
	}

	public MangaRequestDto createMangaRequest(CreateMangaRequest req) {
		Instant now = Instant.now();
		MangaRequestDto row = new MangaRequestDto(
				randomId("r_"),
				(req.requestedTitle() == null || req.requestedTitle().isBlank()) ? "Untitled" : req.requestedTitle().trim(),
				(req.requestedBy() == null || req.requestedBy().isBlank()) ? "unknown" : req.requestedBy().trim(),
				req.notes() == null ? "" : req.notes().trim(),
				"new",
				now
		);
		mangaRequests.add(0, row);
		audit("request.create", java.util.Map.of("id", row.id()));
		return row;
	}

	public MangaRequestDto updateMangaRequest(String id, UpdateMangaRequest patch) {
		for (int i = 0; i < mangaRequests.size(); i++) {
			MangaRequestDto r = mangaRequests.get(i);
			if (Objects.equals(r.id(), id)) {
				MangaRequestDto next = new MangaRequestDto(
						r.id(),
						patch.requestedTitle() != null ? patch.requestedTitle() : r.requestedTitle(),
						patch.requestedBy() != null ? patch.requestedBy() : r.requestedBy(),
						patch.notes() != null ? patch.notes() : r.notes(),
						patch.status() != null ? patch.status() : r.status(),
						r.createdAt()
				);
				mangaRequests.set(i, next);
				audit("request.update", java.util.Map.of("id", id));
				return next;
			}
		}
		throw new NotFoundException("Request not found");
	}

	public boolean deleteMangaRequest(String id) {
		boolean removed = mangaRequests.removeIf(r -> Objects.equals(r.id(), id));
		if (removed) audit("request.delete", java.util.Map.of("id", id));
		return removed;
	}

	public List<AdminMangaDto> listMangas() {
		return mangas.stream()
				.sorted(Comparator.comparing(AdminMangaDto::createdAt).reversed())
				.toList();
	}

	public AdminMangaDto createManga(CreateManga req) {
		Instant now = Instant.now();
		String title = (req.title() == null || req.title().isBlank()) ? "Untitled" : req.title().trim();
		String slug = (req.slug() == null || req.slug().isBlank()) ? slugify(title) : req.slug().trim();
		AdminMangaDto row = new AdminMangaDto(randomId("m_"), title, slug, req.status() == null ? "draft" : req.status(), now);
		mangas.add(0, row);
		audit("manga.create", java.util.Map.of("id", row.id()));
		return row;
	}

	public AdminMangaDto updateManga(String id, UpdateManga patch) {
		for (int i = 0; i < mangas.size(); i++) {
			AdminMangaDto m = mangas.get(i);
			if (Objects.equals(m.id(), id)) {
				AdminMangaDto next = new AdminMangaDto(
						m.id(),
						patch.title() != null ? patch.title() : m.title(),
						patch.slug() != null ? patch.slug() : m.slug(),
						patch.status() != null ? patch.status() : m.status(),
						m.createdAt()
				);
				mangas.set(i, next);
				audit("manga.update", java.util.Map.of("id", id));
				return next;
			}
		}
		throw new NotFoundException("Manga not found");
	}

	public boolean deleteManga(String id) {
		boolean removed = mangas.removeIf(m -> Objects.equals(m.id(), id));
		if (removed) audit("manga.delete", java.util.Map.of("id", id));
		return removed;
	}

	public Object reviewSubmission(String id, ReviewRequest req) {
		var next = creatorStore.reviewSubmission(id, req.decision(), req.reason());
		if (Objects.equals(req.decision(), "approved")) {
			String title = (next.payload() == null ? null : String.valueOf(next.payload().get("title")));
			if (title == null || title.isBlank() || "null".equals(title)) title = "Untitled";
			String slug = slugify(title);
			mangas.add(0, new AdminMangaDto(randomId("m_"), title, slug, "published", Instant.now()));
			audit("submission.approve", java.util.Map.of("id", id, "title", title));
		} else {
			audit("submission." + req.decision(), java.util.Map.of("id", id));
		}
		return next;
	}

	private void audit(String action, Object payload) {
		audits.add(0, new AuditDto(randomId("a_"), Instant.now(), action, payload));
		while (audits.size() > 250) {
			audits.remove(audits.size() - 1);
		}
	}

	private String randomId(String prefix) {
		return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
	}

	private String slugify(String input) {
		return input.toLowerCase()
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("(^-|-$)", "");
	}

	private void seed() {
		Instant now = Instant.now();
		users.add(new AdminUserDto("u_admin", "admin@mangaafrik.local", "Admin", "admin", "active", now, "seed"));
		users.add(new AdminUserDto("u_01", "reader1@example.com", "Reader One", "reader", "active", now, "seed"));
		users.add(new AdminUserDto("u_02", "creator1@example.com", "Creator One", "creator", "active", now, "seed"));

		mangas.add(new AdminMangaDto("m_01", "Akwa Origins", "akwa-origins", "published", now));
		mangas.add(new AdminMangaDto("m_02", "Lagoon Runner", "lagoon-runner", "draft", now));

		mangaRequests.add(new MangaRequestDto("r_01", "Nouchi Legends", "reader1@example.com", "Could you add this manga? I heard it is great.", "new", now));

		creatorRequests.add(new CreatorRequestDto("cr_01", "creator1@example.com", "Creator One", "pending", "", now, null));
	}
}

