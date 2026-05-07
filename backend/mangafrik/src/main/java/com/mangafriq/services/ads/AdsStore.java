package com.mangafriq.services.ads;

import com.mangafriq.dto.ads.AdsDtos.AdsAuditDto;
import com.mangafriq.dto.ads.AdsDtos.AdsSummaryDto;
import com.mangafriq.dto.ads.AdsDtos.CreateHeroAd;
import com.mangafriq.dto.ads.AdsDtos.CreateNotification;
import com.mangafriq.dto.ads.AdsDtos.CreateSystemNotice;
import com.mangafriq.dto.ads.AdsDtos.HeroAdDto;
import com.mangafriq.dto.ads.AdsDtos.NotificationDto;
import com.mangafriq.dto.ads.AdsDtos.SystemNoticeDto;
import com.mangafriq.dto.ads.AdsDtos.UpdateHeroAd;
import com.mangafriq.dto.ads.AdsDtos.UpdateNotification;
import com.mangafriq.dto.ads.AdsDtos.UpdateSystemNotice;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.realtime.SystemNoticesRealtime;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AdsStore {
	private final SystemNoticesRealtime systemNoticesRealtime;
	private final NamedParameterJdbcTemplate jdbc;
	private final ObjectMapper objectMapper;

	public AdsStore(SystemNoticesRealtime systemNoticesRealtime, NamedParameterJdbcTemplate jdbc, ObjectMapper objectMapper) {
		this.systemNoticesRealtime = systemNoticesRealtime;
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
	}

	public AdsSummaryDto summary() {
		Integer heroTotal = jdbc.getJdbcTemplate().queryForObject("select count(*) from ads_hero_ads", Integer.class);
		Integer heroActive = jdbc.getJdbcTemplate().queryForObject("select count(*) from ads_hero_ads where status = 'active'", Integer.class);
		Integer notifTotal = jdbc.getJdbcTemplate().queryForObject("select count(*) from ads_notifications", Integer.class);
		Integer pushQueued = jdbc.getJdbcTemplate().queryForObject(
				"select count(*) from ads_notifications where channel = 'push' and status = 'queued'",
				Integer.class
		);
		Integer noticesTotal = jdbc.getJdbcTemplate().queryForObject("select count(*) from ads_system_notices", Integer.class);
		Integer noticesActive = jdbc.getJdbcTemplate().queryForObject(
				"select count(*) from ads_system_notices where status = 'active'",
				Integer.class
		);
		Integer auditsTotal = jdbc.getJdbcTemplate().queryForObject("select count(*) from ads_audits", Integer.class);
		return new AdsSummaryDto(
				heroTotal == null ? 0 : heroTotal,
				heroActive == null ? 0 : heroActive,
				notifTotal == null ? 0 : notifTotal,
				pushQueued == null ? 0 : pushQueued,
				noticesTotal == null ? 0 : noticesTotal,
				noticesActive == null ? 0 : noticesActive,
				auditsTotal == null ? 0 : auditsTotal
		);
	}

	public List<HeroAdDto> listHeroAds() {
		return jdbc.query("""
				select id, title, subtitle, image_url, cta_label, cta_url, status, starts_at, ends_at, created_at, updated_at
				from ads_hero_ads
				order by updated_at desc
				""",
			Map.of(),
			(rs, i) -> new HeroAdDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("title"),
				rs.getString("subtitle"),
				rs.getString("image_url"),
				rs.getString("cta_label"),
				rs.getString("cta_url"),
				rs.getString("status"),
				rs.getString("starts_at"),
				rs.getString("ends_at"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant()
			)
		);
	}

	public HeroAdDto createHeroAd(CreateHeroAd req) {
		Instant now = Instant.now();
		String id = uuid();
		HeroAdDto row = new HeroAdDto(
			id,
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

		jdbc.update("""
				insert into ads_hero_ads (id, title, subtitle, image_url, cta_label, cta_url, status, starts_at, ends_at, created_at, updated_at)
				values (cast(:id as uuid), :title, :subtitle, :image_url, :cta_label, :cta_url, :status, :starts_at, :ends_at, :created_at, :updated_at)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("title", row.title())
				.addValue("subtitle", row.subtitle())
				.addValue("image_url", row.imageUrl())
				.addValue("cta_label", row.ctaLabel())
				.addValue("cta_url", row.ctaUrl())
				.addValue("status", row.status())
				.addValue("starts_at", row.startsAt())
				.addValue("ends_at", row.endsAt())
				.addValue("created_at", java.sql.Timestamp.from(now))
				.addValue("updated_at", java.sql.Timestamp.from(now))
		);
		audit("hero_ad.create", Map.of("id", id));
		return row;
	}

	public HeroAdDto updateHeroAd(String id, UpdateHeroAd patch) {
		HeroAdDto current = getHeroAd(id);
		HeroAdDto next = new HeroAdDto(
			current.id(),
			patch.title() != null ? patch.title() : current.title(),
			patch.subtitle() != null ? patch.subtitle() : current.subtitle(),
			patch.imageUrl() != null ? patch.imageUrl() : current.imageUrl(),
			patch.ctaLabel() != null ? patch.ctaLabel() : current.ctaLabel(),
			patch.ctaUrl() != null ? patch.ctaUrl() : current.ctaUrl(),
			patch.status() != null ? patch.status() : current.status(),
			patch.startsAt() != null ? patch.startsAt() : current.startsAt(),
			patch.endsAt() != null ? patch.endsAt() : current.endsAt(),
			current.createdAt(),
			Instant.now()
		);
		int updated = jdbc.update("""
				update ads_hero_ads
				set title = :title,
				    subtitle = :subtitle,
				    image_url = :image_url,
				    cta_label = :cta_label,
				    cta_url = :cta_url,
				    status = :status,
				    starts_at = :starts_at,
				    ends_at = :ends_at,
				    updated_at = :updated_at
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("title", next.title())
				.addValue("subtitle", next.subtitle())
				.addValue("image_url", next.imageUrl())
				.addValue("cta_label", next.ctaLabel())
				.addValue("cta_url", next.ctaUrl())
				.addValue("status", next.status())
				.addValue("starts_at", next.startsAt())
				.addValue("ends_at", next.endsAt())
				.addValue("updated_at", java.sql.Timestamp.from(next.updatedAt()))
		);
		if (updated == 0) throw new NotFoundException("Hero ad not found");
		audit("hero_ad.update", Map.of("id", id));
		return next;
	}

	public boolean deleteHeroAd(String id) {
		int removed = jdbc.update("delete from ads_hero_ads where id = cast(:id as uuid)", Map.of("id", id));
		if (removed > 0) audit("hero_ad.delete", Map.of("id", id));
		return removed > 0;
	}

	public List<NotificationDto> listNotifications() {
		return jdbc.query("""
				select id, channel, title, body, target, segment, user_id, deep_link, status, scheduled_at, created_at, updated_at
				from ads_notifications
				order by updated_at desc
				""",
			Map.of(),
			(rs, i) -> new NotificationDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("channel"),
				rs.getString("title"),
				rs.getString("body"),
				rs.getString("target"),
				rs.getString("segment"),
				rs.getString("user_id"),
				rs.getString("deep_link"),
				rs.getString("status"),
				rs.getString("scheduled_at"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant()
			)
		);
	}

	public NotificationDto createNotification(CreateNotification req) {
		Instant now = Instant.now();
		String channel = Objects.equals(req.channel(), "in_app") ? "in_app" : "push";
		String id = uuid();
		NotificationDto row = new NotificationDto(
			id,
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
		jdbc.update("""
				insert into ads_notifications (id, channel, title, body, target, segment, user_id, deep_link, status, scheduled_at, created_at, updated_at)
				values (cast(:id as uuid), :channel, :title, :body, :target, :segment, :user_id, :deep_link, :status, :scheduled_at, :created_at, :updated_at)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("channel", row.channel())
				.addValue("title", row.title())
				.addValue("body", row.body())
				.addValue("target", row.target())
				.addValue("segment", row.segment())
				.addValue("user_id", row.userId())
				.addValue("deep_link", row.deepLink())
				.addValue("status", row.status())
				.addValue("scheduled_at", row.scheduledAt())
				.addValue("created_at", java.sql.Timestamp.from(now))
				.addValue("updated_at", java.sql.Timestamp.from(now))
		);
		audit("notification.create", Map.of("id", id));
		return row;
	}

	public NotificationDto updateNotification(String id, UpdateNotification patch) {
		NotificationDto current = getNotification(id);
		String channel = patch.channel() != null ? (Objects.equals(patch.channel(), "in_app") ? "in_app" : "push") : current.channel();
		NotificationDto next = new NotificationDto(
			current.id(),
			channel,
			patch.title() != null ? patch.title() : current.title(),
			patch.body() != null ? patch.body() : current.body(),
			patch.target() != null ? patch.target() : current.target(),
			patch.segment() != null ? patch.segment() : current.segment(),
			patch.userId() != null ? patch.userId() : current.userId(),
			patch.deepLink() != null ? patch.deepLink() : current.deepLink(),
			patch.status() != null ? patch.status() : current.status(),
			patch.scheduledAt() != null ? patch.scheduledAt() : current.scheduledAt(),
			current.createdAt(),
			Instant.now()
		);
		int updated = jdbc.update("""
				update ads_notifications
				set channel = :channel,
				    title = :title,
				    body = :body,
				    target = :target,
				    segment = :segment,
				    user_id = :user_id,
				    deep_link = :deep_link,
				    status = :status,
				    scheduled_at = :scheduled_at,
				    updated_at = :updated_at
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("channel", next.channel())
				.addValue("title", next.title())
				.addValue("body", next.body())
				.addValue("target", next.target())
				.addValue("segment", next.segment())
				.addValue("user_id", next.userId())
				.addValue("deep_link", next.deepLink())
				.addValue("status", next.status())
				.addValue("scheduled_at", next.scheduledAt())
				.addValue("updated_at", java.sql.Timestamp.from(next.updatedAt()))
		);
		if (updated == 0) throw new NotFoundException("Notification not found");
		audit("notification.update", Map.of("id", id));
		return next;
	}

	public boolean deleteNotification(String id) {
		int removed = jdbc.update("delete from ads_notifications where id = cast(:id as uuid)", Map.of("id", id));
		if (removed > 0) audit("notification.delete", Map.of("id", id));
		return removed > 0;
	}

	public List<SystemNoticeDto> listSystemNotices() {
		return jdbc.query("""
				select id, severity, title, message, status, starts_at, ends_at, created_at, updated_at
				from ads_system_notices
				order by updated_at desc
				""",
			Map.of(),
			(rs, i) -> new SystemNoticeDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("severity"),
				rs.getString("title"),
				rs.getString("message"),
				rs.getString("status"),
				rs.getString("starts_at"),
				rs.getString("ends_at"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant()
			)
		);
	}

	public SystemNoticeDto createSystemNotice(CreateSystemNotice req) {
		Instant now = Instant.now();
		String id = uuid();
		SystemNoticeDto row = new SystemNoticeDto(
			id,
			nz(req.severity(), "info"),
			nz(req.title(), "Untitled notice"),
			nz(req.message(), ""),
			nz(req.status(), "scheduled"),
			nz(req.startsAt(), ""),
			nz(req.endsAt(), ""),
			now,
			now
		);
		jdbc.update("""
				insert into ads_system_notices (id, severity, title, message, status, starts_at, ends_at, created_at, updated_at)
				values (cast(:id as uuid), :severity, :title, :message, :status, :starts_at, :ends_at, :created_at, :updated_at)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("severity", row.severity())
				.addValue("title", row.title())
				.addValue("message", row.message())
				.addValue("status", row.status())
				.addValue("starts_at", row.startsAt())
				.addValue("ends_at", row.endsAt())
				.addValue("created_at", java.sql.Timestamp.from(now))
				.addValue("updated_at", java.sql.Timestamp.from(now))
		);
		audit("system_notice.create", Map.of("id", id));
		publishActiveNotices();
		return row;
	}

	public SystemNoticeDto updateSystemNotice(String id, UpdateSystemNotice patch) {
		SystemNoticeDto current = getSystemNotice(id);
		SystemNoticeDto next = new SystemNoticeDto(
			current.id(),
			patch.severity() != null ? patch.severity() : current.severity(),
			patch.title() != null ? patch.title() : current.title(),
			patch.message() != null ? patch.message() : current.message(),
			patch.status() != null ? patch.status() : current.status(),
			patch.startsAt() != null ? patch.startsAt() : current.startsAt(),
			patch.endsAt() != null ? patch.endsAt() : current.endsAt(),
			current.createdAt(),
			Instant.now()
		);
		int updated = jdbc.update("""
				update ads_system_notices
				set severity = :severity,
				    title = :title,
				    message = :message,
				    status = :status,
				    starts_at = :starts_at,
				    ends_at = :ends_at,
				    updated_at = :updated_at
				where id = cast(:id as uuid)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("severity", next.severity())
				.addValue("title", next.title())
				.addValue("message", next.message())
				.addValue("status", next.status())
				.addValue("starts_at", next.startsAt())
				.addValue("ends_at", next.endsAt())
				.addValue("updated_at", java.sql.Timestamp.from(next.updatedAt()))
		);
		if (updated == 0) throw new NotFoundException("System notice not found");
		audit("system_notice.update", Map.of("id", id));
		publishActiveNotices();
		return next;
	}

	public boolean deleteSystemNotice(String id) {
		int removed = jdbc.update("delete from ads_system_notices where id = cast(:id as uuid)", Map.of("id", id));
		if (removed > 0) {
			audit("system_notice.delete", Map.of("id", id));
			publishActiveNotices();
		}
		return removed > 0;
	}

	public void publishActiveSystemNotices() {
		publishActiveNotices();
	}

	public List<AdsAuditDto> listAudits() {
		return jdbc.query("""
				select id, at, action, payload
				from ads_audits
				order by at desc
				limit 250
				""",
			Map.of(),
			(rs, i) -> new AdsAuditDto(
				String.valueOf(rs.getObject("id")),
				rs.getTimestamp("at").toInstant(),
				rs.getString("action"),
				readJson(rs.getString("payload"))
			)
		);
	}

	private void audit(String action, Object payload) {
		String id = uuid();
		Instant at = Instant.now();
		String json = writeJson(payload);
		jdbc.update("""
				insert into ads_audits (id, at, action, payload)
				values (cast(:id as uuid), :at, :action, cast(:payload as jsonb))
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("at", java.sql.Timestamp.from(at))
				.addValue("action", action)
				.addValue("payload", json)
		);
		// Trim in DB (keep latest 250).
		jdbc.getJdbcTemplate().execute("""
				delete from ads_audits
				where id in (
				  select id
				  from ads_audits
				  order by at desc
				  offset 250
				)
				""");
	}

	private String uuid() {
		return UUID.randomUUID().toString();
	}

	private String nz(String s, String fallback) {
		if (s == null) return fallback;
		String t = s.trim();
		return t.isEmpty() ? fallback : t;
	}

	private void publishActiveNotices() {
		List<SystemNoticeDto> active = jdbc.query("""
				select id, severity, title, message, status, starts_at, ends_at, created_at, updated_at
				from ads_system_notices
				where lower(status) = 'active'
				order by updated_at desc
				""",
			Map.of(),
			(rs, i) -> new SystemNoticeDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("severity"),
				rs.getString("title"),
				rs.getString("message"),
				rs.getString("status"),
				rs.getString("starts_at"),
				rs.getString("ends_at"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant()
			)
		);
		systemNoticesRealtime.publish(active);
	}

	private HeroAdDto getHeroAd(String id) {
		List<HeroAdDto> rows = jdbc.query("""
				select id, title, subtitle, image_url, cta_label, cta_url, status, starts_at, ends_at, created_at, updated_at
				from ads_hero_ads
				where id = cast(:id as uuid)
				""",
			Map.of("id", id),
			(rs, i) -> new HeroAdDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("title"),
				rs.getString("subtitle"),
				rs.getString("image_url"),
				rs.getString("cta_label"),
				rs.getString("cta_url"),
				rs.getString("status"),
				rs.getString("starts_at"),
				rs.getString("ends_at"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant()
			)
		);
		if (rows.isEmpty()) throw new NotFoundException("Hero ad not found");
		return rows.get(0);
	}

	private NotificationDto getNotification(String id) {
		List<NotificationDto> rows = jdbc.query("""
				select id, channel, title, body, target, segment, user_id, deep_link, status, scheduled_at, created_at, updated_at
				from ads_notifications
				where id = cast(:id as uuid)
				""",
			Map.of("id", id),
			(rs, i) -> new NotificationDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("channel"),
				rs.getString("title"),
				rs.getString("body"),
				rs.getString("target"),
				rs.getString("segment"),
				rs.getString("user_id"),
				rs.getString("deep_link"),
				rs.getString("status"),
				rs.getString("scheduled_at"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant()
			)
		);
		if (rows.isEmpty()) throw new NotFoundException("Notification not found");
		return rows.get(0);
	}

	private SystemNoticeDto getSystemNotice(String id) {
		List<SystemNoticeDto> rows = jdbc.query("""
				select id, severity, title, message, status, starts_at, ends_at, created_at, updated_at
				from ads_system_notices
				where id = cast(:id as uuid)
				""",
			Map.of("id", id),
			(rs, i) -> new SystemNoticeDto(
				String.valueOf(rs.getObject("id")),
				rs.getString("severity"),
				rs.getString("title"),
				rs.getString("message"),
				rs.getString("status"),
				rs.getString("starts_at"),
				rs.getString("ends_at"),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant()
			)
		);
		if (rows.isEmpty()) throw new NotFoundException("System notice not found");
		return rows.get(0);
	}

	private String writeJson(Object payload) {
		if (payload == null) return "{}";
		try {
			return objectMapper.writeValueAsString(payload);
		} catch (JsonProcessingException e) {
			return "{\"_error\":\"json_encode_failed\"}";
		}
	}

	private Object readJson(String json) {
		if (json == null || json.isBlank()) return Map.of();
		try {
			return objectMapper.readValue(json, Object.class);
		} catch (Exception e) {
			return Map.of();
		}
	}
}

