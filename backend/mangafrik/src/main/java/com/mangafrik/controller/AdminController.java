package com.mangafrik.controller;

import com.mangafrik.constants.AppConstants;
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
import com.mangafrik.dto.admin.CreatorAccountDtos.CreateCreatorAccountRequest;
import com.mangafrik.dto.creator.MangaSubmissionDto;
import com.mangafrik.services.admin.AdminStore;
import com.mangafrik.services.admin.CreatorAccountService;
import com.mangafrik.services.creator.CreatorRequestService;
import com.mangafrik.services.creator.CreatorStore;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/admin")
public class AdminController {
	private final AdminStore adminStore;
	private final CreatorStore creatorStore;
	private final CreatorRequestService creatorRequestService;
	private final CreatorAccountService creatorAccountService;

	public AdminController(
			AdminStore adminStore,
			CreatorStore creatorStore,
			CreatorRequestService creatorRequestService,
			CreatorAccountService creatorAccountService
	) {
		this.adminStore = adminStore;
		this.creatorStore = creatorStore;
		this.creatorRequestService = creatorRequestService;
		this.creatorAccountService = creatorAccountService;
	}

	@GetMapping("/summary")
	public AdminSummaryDto summary() {
		return adminStore.summary();
	}

	@GetMapping("/audits")
	public List<AuditDto> audits() {
		return adminStore.listAudits();
	}

	@GetMapping("/users")
	public List<AdminUserDto> users() {
		return adminStore.listUsers();
	}

	@PatchMapping("/users/{id}")
	public AdminUserDto updateUser(@PathVariable String id, @RequestBody UpdateUserRequest patch) {
		return adminStore.updateUser(id, patch);
	}

	@GetMapping("/creator-requests")
	public List<CreatorRequestDto> creatorRequests() {
		return creatorRequestService.listAll();
	}

	@PostMapping("/creator-requests/{id}/review")
	public CreatorRequestDto reviewCreatorRequest(@PathVariable String id, @RequestBody ReviewRequest req) {
		return creatorRequestService.review(id, req);
	}

	@GetMapping("/manga-submissions")
	public List<MangaSubmissionDto> submissions() {
		return creatorStore.listSubmissions(null);
	}

	@PostMapping("/manga-submissions/{id}/review")
	public Object reviewSubmission(@PathVariable String id, @RequestBody ReviewRequest req) {
		return adminStore.reviewSubmission(id, req);
	}

	@GetMapping("/manga-requests")
	public List<MangaRequestDto> mangaRequests() {
		return adminStore.listMangaRequests();
	}

	@PostMapping("/manga-requests")
	public MangaRequestDto createMangaRequest(@RequestBody CreateMangaRequest req) {
		return adminStore.createMangaRequest(req);
	}

	@PatchMapping("/manga-requests/{id}")
	public MangaRequestDto updateMangaRequest(@PathVariable String id, @RequestBody UpdateMangaRequest patch) {
		return adminStore.updateMangaRequest(id, patch);
	}

	@DeleteMapping("/manga-requests/{id}")
	public boolean deleteMangaRequest(@PathVariable String id) {
		return adminStore.deleteMangaRequest(id);
	}

	@GetMapping("/mangas")
	public List<AdminMangaDto> mangas() {
		return adminStore.listMangas();
	}

	@PostMapping("/mangas")
	public AdminMangaDto createManga(@RequestBody CreateManga req) {
		return adminStore.createManga(req);
	}

	@PatchMapping("/mangas/{id}")
	public AdminMangaDto updateManga(@PathVariable String id, @RequestBody UpdateManga patch) {
		return adminStore.updateManga(id, patch);
	}

	@DeleteMapping("/mangas/{id}")
	public boolean deleteManga(@PathVariable String id) {
		return adminStore.deleteManga(id);
	}

	/**
	 * Creates a creator account with a temporary password and emails credentials.
	 * The creator will be forced to change their password on first login.
	 */
	@PostMapping("/creator-accounts")
	public Map<String, Object> createCreatorAccount(@RequestBody CreateCreatorAccountRequest req) {
		return creatorAccountService.createCreatorAccountAndEmailCredentials(req);
	}
}

