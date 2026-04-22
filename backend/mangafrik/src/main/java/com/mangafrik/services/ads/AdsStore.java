package com.mangafrik.services.ads;

import com.mangafrik.dto.ads.AdsDtos.AdsAuditDto;
import com.mangafrik.dto.ads.AdsDtos.AdsSummaryDto;
import com.mangafrik.dto.ads.AdsDtos.CreateHeroAd;
import com.mangafrik.dto.ads.AdsDtos.CreateNotification;
import com.mangafrik.dto.ads.AdsDtos.CreateSystemNotice;
import com.mangafrik.dto.ads.AdsDtos.HeroAdDto;
import com.mangafrik.dto.ads.AdsDtos.NotificationDto;
import com.mangafrik.dto.ads.AdsDtos.SystemNoticeDto;
import com.mangafrik.dto.ads.AdsDtos.UpdateHeroAd;
import com.mangafrik.dto.ads.AdsDtos.UpdateNotification;
import com.mangafrik.dto.ads.AdsDtos.UpdateSystemNotice;
import com.mangafrik.exception.NotFoundException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;

@Service
public class AdsStore {
	private final CopyOnWriteArrayList<HeroAdDto> heroAds = new CopyOnWriteArrayList<>();
	private final CopyOnWriteArrayList<NotificationDto> notifications = new CopyOnWriteArrayList<>();
	private final CopyOnWriteArrayList<SystemNoticeDto> systemNotices = new CopyOnWriteArrayList<>();
	private final CopyOnWriteArrayList<AdsAuditDto> audits = new CopyOnWriteArrayList<>();

	public AdsStore() {
		seed();
	}

	public AdsSummaryDto summary() {
		int heroAdsActive = (int) heroAds.stream().filter(a -> Objects.equals(a.status(), "active")).count();
		int noticesActive = (int) systemNotices.stream().filter(n -> Objects.equals(n.status(), "active")).count();
		int pushQueued = (int) notifications.stream().filter(n -> Objects.equals(n.channel(), "push") && Objects.equals(n.status(), "queued")).count();
		return new AdsSummaryDto(heroAds.size(), heroAdsActive, notifications.size(), pushQueued, systemNotices.size(), noticesActive, audits.size());
	}

	public List<HeroAdDto> listHeroAds() {
		return heroAds.stream().sorted(Comparator.comparing(HeroAdDto::updatedAt).reversed()).toList();
	}

	public HeroAdDto createHeroAd(CreateHeroAd req) {
		Instant now = Instant.now();
		HeroAdDto row = new HeroAdDto(
				id("ad_"),
				nz(req.title(), "Untitled ad"),
				nz(req.subtitle(), ""),
				nz(req.imageUrl(), ""),
				nz(req.ctaLabel(), "Learn more"),
				nz(req.ctaUrl(), "/"),
				nz(req.status(), "paused"),
				nz(req.startsAt(), ""),
				nz(req.endsAt(), ""),
				now,
				now
		);
		heroAds.add(0, row);
		audit("hero_ad.create", java.util.Map.of("id", row.id()));
		return row;
	}

	public HeroAdDto updateHeroAd(String id, UpdateHeroAd patch) {
		for (int i = 0; i < heroAds.size(); i++) {
			HeroAdDto a = heroAds.get(i);
			if (Objects.equals(a.id(), id)) {
				HeroAdDto next = new HeroAdDto(
						a.id(),
						patch.title() != null ? patch.title() : a.title(),
						patch.subtitle() != null ? patch.subtitle() : a.subtitle(),
						patch.imageUrl() != null ? patch.imageUrl() : a.imageUrl(),
						patch.ctaLabel() != null ? patch.ctaLabel() : a.ctaLabel(),
						patch.ctaUrl() != null ? patch.ctaUrl() : a.ctaUrl(),
						patch.status() != null ? patch.status() : a.status(),
						patch.startsAt() != null ? patch.startsAt() : a.startsAt(),
						patch.endsAt() != null ? patch.endsAt() : a.endsAt(),
						a.createdAt(),
						Instant.now()
				);
				heroAds.set(i, next);
				audit("hero_ad.update", java.util.Map.of("id", id));
				return next;
			}
		}
		throw new NotFoundException("Hero ad not found");
	}

	public boolean deleteHeroAd(String id) {
		boolean removed = heroAds.removeIf(a -> Objects.equals(a.id(), id));
		if (removed) audit("hero_ad.delete", java.util.Map.of("id", id));
		return removed;
	}

	public List<NotificationDto> listNotifications() {
		return notifications.stream().sorted(Comparator.comparing(NotificationDto::updatedAt).reversed()).toList();
	}

	public NotificationDto createNotification(CreateNotification req) {
		Instant now = Instant.now();
		String channel = Objects.equals(req.channel(), "in_app") ? "in_app" : "push";
		NotificationDto row = new NotificationDto(
				id("n_"),
				channel,
				nz(req.title(), "Untitled notification"),
				nz(req.body(), ""),
				nz(req.target(), "all"),
				nz(req.segment(), ""),
				nz(req.userId(), ""),
				nz(req.deepLink(), ""),
				nz(req.status(), "draft"),
				nz(req.scheduledAt(), ""),
				now,
				now
		);
		notifications.add(0, row);
		audit("notification.create", java.util.Map.of("id", row.id()));
		return row;
	}

	public NotificationDto updateNotification(String id, UpdateNotification patch) {
		for (int i = 0; i < notifications.size(); i++) {
			NotificationDto n = notifications.get(i);
			if (Objects.equals(n.id(), id)) {
				String channel = patch.channel() != null ? (Objects.equals(patch.channel(), "in_app") ? "in_app" : "push") : n.channel();
				NotificationDto next = new NotificationDto(
						n.id(),
						channel,
						patch.title() != null ? patch.title() : n.title(),
						patch.body() != null ? patch.body() : n.body(),
						patch.target() != null ? patch.target() : n.target(),
						patch.segment() != null ? patch.segment() : n.segment(),
						patch.userId() != null ? patch.userId() : n.userId(),
						patch.deepLink() != null ? patch.deepLink() : n.deepLink(),
						patch.status() != null ? patch.status() : n.status(),
						patch.scheduledAt() != null ? patch.scheduledAt() : n.scheduledAt(),
						n.createdAt(),
						Instant.now()
				);
				notifications.set(i, next);
				audit("notification.update", java.util.Map.of("id", id));
				return next;
			}
		}
		throw new NotFoundException("Notification not found");
	}

	public boolean deleteNotification(String id) {
		boolean removed = notifications.removeIf(n -> Objects.equals(n.id(), id));
		if (removed) audit("notification.delete", java.util.Map.of("id", id));
		return removed;
	}

	public List<SystemNoticeDto> listSystemNotices() {
		return systemNotices.stream().sorted(Comparator.comparing(SystemNoticeDto::updatedAt).reversed()).toList();
	}

	public SystemNoticeDto createSystemNotice(CreateSystemNotice req) {
		Instant now = Instant.now();
		SystemNoticeDto row = new SystemNoticeDto(
				id("sn_"),
				nz(req.severity(), "info"),
				nz(req.title(), "Untitled notice"),
				nz(req.message(), ""),
				nz(req.status(), "scheduled"),
				nz(req.startsAt(), ""),
				nz(req.endsAt(), ""),
				now,
				now
		);
		systemNotices.add(0, row);
		audit("system_notice.create", java.util.Map.of("id", row.id()));
		return row;
	}

	public SystemNoticeDto updateSystemNotice(String id, UpdateSystemNotice patch) {
		for (int i = 0; i < systemNotices.size(); i++) {
			SystemNoticeDto n = systemNotices.get(i);
			if (Objects.equals(n.id(), id)) {
				SystemNoticeDto next = new SystemNoticeDto(
						n.id(),
						patch.severity() != null ? patch.severity() : n.severity(),
						patch.title() != null ? patch.title() : n.title(),
						patch.message() != null ? patch.message() : n.message(),
						patch.status() != null ? patch.status() : n.status(),
						patch.startsAt() != null ? patch.startsAt() : n.startsAt(),
						patch.endsAt() != null ? patch.endsAt() : n.endsAt(),
						n.createdAt(),
						Instant.now()
				);
				systemNotices.set(i, next);
				audit("system_notice.update", java.util.Map.of("id", id));
				return next;
			}
		}
		throw new NotFoundException("System notice not found");
	}

	public boolean deleteSystemNotice(String id) {
		boolean removed = systemNotices.removeIf(n -> Objects.equals(n.id(), id));
		if (removed) audit("system_notice.delete", java.util.Map.of("id", id));
		return removed;
	}

	public List<AdsAuditDto> listAudits() {
		return audits.stream().sorted(Comparator.comparing(AdsAuditDto::at).reversed()).toList();
	}

	private void audit(String action, Object payload) {
		audits.add(0, new AdsAuditDto(id("a_"), Instant.now(), action, payload));
		while (audits.size() > 250) audits.remove(audits.size() - 1);
	}

	private String id(String prefix) {
		return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
	}

	private String nz(String s, String fallback) {
		if (s == null) return fallback;
		String t = s.trim();
		return t.isEmpty() ? fallback : t;
	}

	private void seed() {
		Instant now = Instant.now();
		heroAds.add(new HeroAdDto("ad_01", "Welcome promo", "New chapters every week", "", "Explore", "/explore", "active", now.toString(), "", now, now));
		notifications.add(new NotificationDto("n_01", "push", "New release", "A new manga chapter is out now.", "all", "", "", "/home", "draft", "", now, now));
		systemNotices.add(new SystemNoticeDto("sn_01", "info", "Maintenance window", "Scheduled maintenance tonight at 02:00 UTC.", "scheduled", now.toString(), "", now, now));
	}
}

