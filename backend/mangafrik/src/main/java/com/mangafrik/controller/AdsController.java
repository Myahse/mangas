package com.mangafrik.controller;

import com.mangafrik.constants.AppConstants;
import com.mangafrik.dto.ads.AdsDtos.AdsAuditDto;
import com.mangafrik.dto.ads.AdsDtos.AdsSummaryDto;
import com.mangafrik.dto.ads.AdsDtos.CreateHeroAd;
import com.mangafrik.dto.ads.AdsDtos.CreateNotification;
import com.mangafrik.dto.ads.AdsDtos.CreateSystemNotice;
import com.mangafrik.dto.ads.AdsDtos.HeroAdDto;
import com.mangafrik.dto.creator.MangaSubmissionDto;
import com.mangafrik.dto.ads.AdsDtos.NotificationDto;
import com.mangafrik.dto.ads.AdsDtos.SystemNoticeDto;
import com.mangafrik.dto.ads.AdsDtos.UpdateHeroAd;
import com.mangafrik.dto.ads.AdsDtos.UpdateNotification;
import com.mangafrik.dto.ads.AdsDtos.UpdateSystemNotice;
import com.mangafrik.dto.ads.EmailCampaignDtos.EmailCampaignRequest;
import com.mangafrik.dto.ads.EmailCampaignDtos.EmailCampaignResponse;
import com.mangafrik.services.ads.AdsStore;
import com.mangafrik.services.ads.EmailCampaignService;
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
@RequestMapping(AppConstants.API_V1 + "/ads")
public class AdsController {
	private final AdsStore adsStore;
	private final CreatorStore creatorStore;
	private final EmailCampaignService emailCampaignService;

	public AdsController(AdsStore adsStore, CreatorStore creatorStore, EmailCampaignService emailCampaignService) {
		this.adsStore = adsStore;
		this.creatorStore = creatorStore;
		this.emailCampaignService = emailCampaignService;
	}

	@GetMapping("/summary")
	public AdsSummaryDto summary() {
		return adsStore.summary();
	}

	@GetMapping("/audits")
	public List<AdsAuditDto> audits() {
		return adsStore.listAudits();
	}

	@GetMapping("/hero-ads")
	public List<HeroAdDto> heroAds() {
		return adsStore.listHeroAds();
	}

	@PostMapping("/hero-ads")
	public HeroAdDto createHeroAd(@RequestBody CreateHeroAd req) {
		return adsStore.createHeroAd(req);
	}

	@PatchMapping("/hero-ads/{id}")
	public HeroAdDto updateHeroAd(@PathVariable String id, @RequestBody UpdateHeroAd patch) {
		return adsStore.updateHeroAd(id, patch);
	}

	@DeleteMapping("/hero-ads/{id}")
	public boolean deleteHeroAd(@PathVariable String id) {
		return adsStore.deleteHeroAd(id);
	}

	@GetMapping("/notifications")
	public List<NotificationDto> notifications() {
		return adsStore.listNotifications();
	}

	@PostMapping("/notifications")
	public NotificationDto createNotification(@RequestBody CreateNotification req) {
		return adsStore.createNotification(req);
	}

	@PatchMapping("/notifications/{id}")
	public NotificationDto updateNotification(@PathVariable String id, @RequestBody UpdateNotification patch) {
		return adsStore.updateNotification(id, patch);
	}

	@DeleteMapping("/notifications/{id}")
	public boolean deleteNotification(@PathVariable String id) {
		return adsStore.deleteNotification(id);
	}

	@GetMapping("/system-notices")
	public List<SystemNoticeDto> systemNotices() {
		return adsStore.listSystemNotices();
	}

	@PostMapping("/system-notices")
	public SystemNoticeDto createSystemNotice(@RequestBody CreateSystemNotice req) {
		return adsStore.createSystemNotice(req);
	}

	@PatchMapping("/system-notices/{id}")
	public SystemNoticeDto updateSystemNotice(@PathVariable String id, @RequestBody UpdateSystemNotice patch) {
		return adsStore.updateSystemNotice(id, patch);
	}

	@DeleteMapping("/system-notices/{id}")
	public boolean deleteSystemNotice(@PathVariable String id) {
		return adsStore.deleteSystemNotice(id);
	}

	@PostMapping("/email-campaign")
	public EmailCampaignResponse emailCampaign(@RequestBody EmailCampaignRequest req) {
		return emailCampaignService.sendCampaign(req);
	}

	/**
	 * Returns vertical manga thumbnails coming from creator submissions.
	 * This enables the ads-panel to reuse the vertical cover as an ad image (demo).
	 */
	@GetMapping("/manga-thumbnails/vertical")
	public List<Map<String, Object>> verticalMangaThumbnails() {
		return creatorStore.listSubmissions(null).stream()
				.map((MangaSubmissionDto s) -> {
					Object payloadObj = s.payload();
					if (!(payloadObj instanceof Map<?, ?> payload)) return null;
					Object thumbsObj = payload.get("thumbnails");
					if (!(thumbsObj instanceof Map<?, ?> thumbs)) return null;
					Object verticalObj = thumbs.get("vertical");
					if (!(verticalObj instanceof Map<?, ?> vertical)) return null;
					Object dataUrl = vertical.get("dataUrl");
					if (!(dataUrl instanceof String) || ((String) dataUrl).isBlank()) return null;

					String title = "";
					Object t = payload.get("title");
					if (t instanceof String) title = (String) t;
					return Map.of(
							"submissionId", s.id(),
							"status", s.status(),
							"title", title,
							"createdAt", s.createdAt().toString(),
							"dataUrl", dataUrl
					);
				})
				.filter(java.util.Objects::nonNull)
				.toList();
	}
}

