package com.mangafriq.dto.ads;

import java.time.Instant;

public final class AdsDtos {
	private AdsDtos() {}

	public record AdsSummaryDto(
			int heroAdsTotal,
			int heroAdsActive,
			int notificationsTotal,
			int pushQueued,
			int systemNoticesTotal,
			int noticesActive,
			int auditsTotal
	) {}

	public record HeroAdDto(
			String id,
			String title,
			String subtitle,
			String imageUrl,
			String ctaLabel,
			String ctaUrl,
			String status,
			String startsAt,
			String endsAt,
			Instant createdAt,
			Instant updatedAt
	) {}

	public record CreateHeroAd(
			String title,
			String subtitle,
			String imageUrl,
			String ctaLabel,
			String ctaUrl,
			String status,
			String startsAt,
			String endsAt
	) {}

	public record UpdateHeroAd(
			String title,
			String subtitle,
			String imageUrl,
			String ctaLabel,
			String ctaUrl,
			String status,
			String startsAt,
			String endsAt
	) {}

	public record NotificationDto(
			String id,
			String channel,
			String title,
			String body,
			String target,
			String segment,
			String userId,
			String deepLink,
			String status,
			String scheduledAt,
			Instant createdAt,
			Instant updatedAt
	) {}

	public record CreateNotification(
			String channel,
			String title,
			String body,
			String target,
			String segment,
			String userId,
			String deepLink,
			String status,
			String scheduledAt
	) {}

	public record UpdateNotification(
			String channel,
			String title,
			String body,
			String target,
			String segment,
			String userId,
			String deepLink,
			String status,
			String scheduledAt
	) {}

	public record SystemNoticeDto(
			String id,
			String severity,
			String title,
			String message,
			String status,
			String startsAt,
			String endsAt,
			Instant createdAt,
			Instant updatedAt
	) {}

	public record CreateSystemNotice(
			String severity,
			String title,
			String message,
			String status,
			String startsAt,
			String endsAt
	) {}

	public record UpdateSystemNotice(
			String severity,
			String title,
			String message,
			String status,
			String startsAt,
			String endsAt
	) {}

	public record AdsAuditDto(
			String id,
			Instant at,
			String action,
			Object payload
	) {}
}

