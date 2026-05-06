package com.mangafriq.services.support;

import com.mangafriq.dto.support.SupportDtos.MessageDto;
import com.mangafriq.dto.support.SupportDtos.CreateTicketRequest;
import com.mangafriq.dto.support.SupportDtos.RejectTicketRequest;
import com.mangafriq.dto.support.SupportDtos.SendMessageRequest;
import com.mangafriq.dto.support.SupportDtos.SupportAuditDto;
import com.mangafriq.dto.support.SupportDtos.SupportSummaryDto;
import com.mangafriq.dto.support.SupportDtos.TicketDto;
import com.mangafriq.dto.support.SupportDtos.TicketUserDto;
import com.mangafriq.dto.support.SupportDtos.UpdateTicketRequest;
import com.mangafriq.dto.support.SupportDtos.ValidateTicketRequest;
import com.mangafriq.constants.AppConstants;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.storage.ObjectStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.SqlParameterValue;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SupportStore {
	private final NamedParameterJdbcTemplate jdbc;
	private final ObjectMapper objectMapper;
	private final SimpMessagingTemplate messaging;
	private final ObjectStorageService objectStorage;

	public SupportStore(
			NamedParameterJdbcTemplate jdbc,
			ObjectMapper objectMapper,
			SimpMessagingTemplate messaging,
			ObjectStorageService objectStorage) {
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
		this.messaging = messaging;
		this.objectStorage = objectStorage;
	}

	private static String attachmentPrefix(String ticketIdLower) {
		return "support/" + ticketIdLower + "/";
	}

	private void assertAttachmentKeyForTicket(String ticketId, String key) {
		if (key == null || key.isBlank()) return;
		String tid = normalizeId(ticketId).trim().toLowerCase();
		String k = key.trim();
		String prefix = attachmentPrefix(tid);
		if (!k.toLowerCase().startsWith(prefix.toLowerCase())) {
			throw new IllegalArgumentException("Invalid attachment key");
		}
	}

	public Map<String, Object> uploadAttachmentForTicket(String ticketId, MultipartFile file) throws IOException {
		TicketDto t = getTicket(ticketId);
		if (t == null) throw new NotFoundException("Ticket not found");
		if (file == null || file.isEmpty()) throw new IllegalArgumentException("File required");
		String tid = normalizeId(ticketId).trim().toLowerCase();
		String original = file.getOriginalFilename();
		String ext = "";
		if (original != null && original.contains(".")) {
			ext = original.substring(original.lastIndexOf('.'));
		}
		if (ext.length() > 40) {
			ext = "";
		}
		String key = attachmentPrefix(tid) + UUID.randomUUID() + ext;
		String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
		objectStorage.put(key, contentType, file.getInputStream(), file.getSize());
		String safeName = original == null || original.isBlank() ? "file" : original.replaceAll("[\\\\/\\u0000]", "_");
		if (safeName.length() > 240) {
			safeName = safeName.substring(0, 240);
		}
		return Map.of(
				"key", key,
				"contentType", contentType,
				"size", file.getSize(),
				"fileName", safeName,
				"url", AppConstants.API_V1 + "/storage/" + key
		);
	}

	private static String messagesTopic(String ticketId) {
		String t = ticketId == null ? "" : ticketId.trim().toLowerCase();
		return "/topic/support/tickets/" + t + "/messages";
	}

	private void broadcastNewMessage(String ticketId, MessageDto dto) {
		if (dto == null) return;
		messaging.convertAndSend(messagesTopic(ticketId), dto);
	}

	public SupportSummaryDto summary() {
		Integer total = jdbc.queryForObject("select count(*) from support_tickets", Map.of(), Integer.class);
		Integer ticketsNew = jdbc.queryForObject("select count(*) from support_tickets where status = 'new'", Map.of(), Integer.class);
		Integer ticketsInReview = jdbc.queryForObject("select count(*) from support_tickets where status = 'in_review'", Map.of(), Integer.class);
		Integer ticketsValidated = jdbc.queryForObject("select count(*) from support_tickets where status = 'validated'", Map.of(), Integer.class);
		Integer ticketsRejected = jdbc.queryForObject("select count(*) from support_tickets where status = 'rejected'", Map.of(), Integer.class);
		Integer auditsTotal = jdbc.queryForObject("select count(*) from support_audits", Map.of(), Integer.class);

		return new SupportSummaryDto(
			total == null ? 0 : total,
			ticketsNew == null ? 0 : ticketsNew,
			ticketsInReview == null ? 0 : ticketsInReview,
			ticketsValidated == null ? 0 : ticketsValidated,
			ticketsRejected == null ? 0 : ticketsRejected,
			auditsTotal == null ? 0 : auditsTotal
		);
	}

	public List<TicketDto> listTickets() {
		return jdbc.query("""
				select
				  id::text as id,
				  type,
				  status,
				  subject,
				  description,
				  user_id::text as user_id,
				  user_name,
				  user_email,
				  created_at,
				  updated_at,
				  validation_note,
				  rejection_reason
				from support_tickets
				order by created_at desc
				""",
			Map.of(),
			(rs, i) -> new TicketDto(
				rs.getString("id"),
				rs.getString("type"),
				rs.getString("status"),
				rs.getString("subject"),
				rs.getString("description"),
				new TicketUserDto(
					rs.getString("user_id"),
					rs.getString("user_name"),
					rs.getString("user_email")
				),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant(),
				rs.getString("validation_note"),
				rs.getString("rejection_reason")
			)
		);
	}

	public TicketDto getTicket(String id) {
		String sid = normalizeId(id);
		UUID uid = UUID.fromString(sid);
		List<TicketDto> rows = jdbc.query("""
				select
				  cast(id as varchar) as id,
				  type,
				  status,
				  subject,
				  description,
				  cast(user_id as varchar) as user_id,
				  user_name,
				  user_email,
				  created_at,
				  updated_at,
				  validation_note,
				  rejection_reason
				from support_tickets
				where id = :id
				limit 1
				""",
			Map.of("id", uid),
			(rs, i) -> new TicketDto(
				rs.getString("id"),
				rs.getString("type"),
				rs.getString("status"),
				rs.getString("subject"),
				rs.getString("description"),
				new TicketUserDto(
					rs.getString("user_id"),
					rs.getString("user_name"),
					rs.getString("user_email")
				),
				rs.getTimestamp("created_at").toInstant(),
				rs.getTimestamp("updated_at").toInstant(),
				rs.getString("validation_note"),
				rs.getString("rejection_reason")
			)
		);
		return rows.isEmpty() ? null : rows.get(0);
	}

	public TicketDto updateTicket(String id, UpdateTicketRequest patch) {
		String sid = normalizeId(id);
		UUID uid = UUID.fromString(sid);
		TicketDto cur = getTicket(sid);
		if (cur == null) throw new NotFoundException("Ticket not found");
		String nextStatus = patch != null && patch.status() != null ? patch.status().trim() : "";
		if (nextStatus.isBlank()) nextStatus = cur.status();

		jdbc.update("""
				update support_tickets
				set status = :status,
				    updated_at = :updated_at
				where id = :id
				""",
			new MapSqlParameterSource()
				.addValue("id", uid)
				.addValue("status", nextStatus)
				.addValue("updated_at", java.sql.Timestamp.from(Instant.now()))
		);
		audit("ticket.update", Map.of("id", sid, "status", nextStatus));
		return getTicket(sid);
	}

	@Transactional(rollbackFor = Exception.class)
	public TicketDto createTicket(CreateTicketRequest req) {
		String type = req == null ? null : req.type();
		type = (type == null || type.isBlank()) ? "issue" : type.trim();

		String subject = req == null ? null : req.subject();
		subject = (subject == null || subject.isBlank()) ? "Support request" : subject.trim();

		String description = req == null ? null : req.description();
		description = description == null ? "" : description.trim();
		if (description.isEmpty()) throw new IllegalArgumentException("Description required");

		String name = req == null ? null : req.name();
		name = (name == null || name.isBlank()) ? "Anonymous" : name.trim();

		String email = req == null ? null : req.email();
		email = (email == null || email.isBlank()) ? "unknown" : email.trim();

		Instant now = Instant.now();
		String ticketId = uuid();
		String userId = uuid();
		UUID ticketUuid = UUID.fromString(ticketId);
		UUID userUuid = UUID.fromString(userId);
		jdbc.update("""
				insert into support_tickets (
				  id, type, status, subject, description,
				  user_id, user_name, user_email,
				  created_at, updated_at, validation_note, rejection_reason
				) values (
				  :id, :type, :status, :subject, :description,
				  :user_id, :user_name, :user_email,
				  :created_at, :updated_at, :validation_note, :rejection_reason
				)
				""",
			new MapSqlParameterSource()
				.addValue("id", ticketUuid)
				.addValue("type", type)
				.addValue("status", "new")
				.addValue("subject", subject)
				.addValue("description", description)
				.addValue("user_id", userUuid)
				.addValue("user_name", name)
				.addValue("user_email", email)
				.addValue("created_at", java.sql.Timestamp.from(now))
				.addValue("updated_at", java.sql.Timestamp.from(now))
				.addValue("validation_note", "")
				.addValue("rejection_reason", "")
		);

		audit("ticket.create", Map.of("id", ticketId, "type", type));
		return getTicket(ticketId);
	}

	public TicketDto validateTicket(String id, ValidateTicketRequest req) {
		String sid = normalizeId(id);
		UUID uid = UUID.fromString(sid);
		TicketDto cur = getTicket(sid);
		if (cur == null) throw new NotFoundException("Ticket not found");
		String note = req == null ? "" : (req.note() == null ? "" : req.note().trim());
		jdbc.update("""
				update support_tickets
				set status = 'validated',
				    validation_note = :note,
				    updated_at = :updated_at
				where id = :id
				""",
			new MapSqlParameterSource()
				.addValue("id", uid)
				.addValue("note", note)
				.addValue("updated_at", java.sql.Timestamp.from(Instant.now()))
		);
		audit("ticket.validate", Map.of("id", sid));
		return getTicket(sid);
	}

	public TicketDto rejectTicket(String id, RejectTicketRequest req) {
		String sid = normalizeId(id);
		UUID uid = UUID.fromString(sid);
		TicketDto cur = getTicket(sid);
		if (cur == null) throw new NotFoundException("Ticket not found");
		String reason = req == null ? "" : (req.reason() == null ? "" : req.reason().trim());
		jdbc.update("""
				update support_tickets
				set status = 'rejected',
				    rejection_reason = :reason,
				    updated_at = :updated_at
				where id = :id
				""",
			new MapSqlParameterSource()
				.addValue("id", uid)
				.addValue("reason", reason)
				.addValue("updated_at", java.sql.Timestamp.from(Instant.now()))
		);
		audit("ticket.reject", Map.of("id", sid));
		return getTicket(sid);
	}

	public List<MessageDto> listMessages(String ticketId) {
		String tid = normalizeId(ticketId);
		UUID tuid = UUID.fromString(tid);
		return jdbc.query("""
				select cast(id as varchar) as id, at, from_role, text,
				  attachment_key, attachment_name, attachment_content_type
				from support_messages
				where ticket_id = :ticket_id
				order by at asc
				""",
			Map.of("ticket_id", tuid),
			(rs, i) -> new MessageDto(
				rs.getString("id"),
				rs.getTimestamp("at").toInstant(),
				rs.getString("from_role"),
				rs.getString("text"),
				rs.getString("attachment_key"),
				rs.getString("attachment_name"),
				rs.getString("attachment_content_type")
			)
		);
	}

	public MessageDto sendMessage(String ticketId, SendMessageRequest req) {
		String tid = normalizeId(ticketId);
		UUID tuid = UUID.fromString(tid);
		String from = Objects.equals(req != null ? req.from() : null, "support") ? "support" : "user";
		String text = req == null || req.text() == null ? "" : req.text().trim();
		String attachmentKey = req != null && req.attachmentKey() != null ? req.attachmentKey().trim() : null;
		if (attachmentKey != null && attachmentKey.isEmpty()) attachmentKey = null;
		String attachmentName = req != null && req.attachmentName() != null ? req.attachmentName().trim() : null;
		if (attachmentName != null && attachmentName.isEmpty()) attachmentName = null;
		String attachmentContentType = req != null && req.attachmentContentType() != null
				? req.attachmentContentType().trim()
				: null;
		if (attachmentContentType != null && attachmentContentType.isEmpty()) attachmentContentType = null;

		assertAttachmentKeyForTicket(tid, attachmentKey);

		if (text.isEmpty() && attachmentKey == null) {
			throw new IllegalArgumentException("Message text or attachment required");
		}

		Instant now = Instant.now();
		String id = uuid();
		UUID mid = UUID.fromString(id);
		jdbc.update("""
				insert into support_messages (
				  id, ticket_id, at, from_role, text,
				  attachment_key, attachment_name, attachment_content_type
				)
				values (
				  :id, :ticket_id, :at, :from_role, :text,
				  :attachment_key, :attachment_name, :attachment_content_type
				)
				""",
			new MapSqlParameterSource()
				.addValue("id", mid)
				.addValue("ticket_id", tuid)
				.addValue("at", java.sql.Timestamp.from(now))
				.addValue("from_role", from)
				.addValue("text", text.isEmpty() ? "" : text)
				.addValue("attachment_key", attachmentKey)
				.addValue("attachment_name", attachmentName)
				.addValue("attachment_content_type", attachmentContentType)
		);
		audit("chat.send", Map.of("ticketId", tid, "from", from, "attachment", attachmentKey != null));
		MessageDto dto = new MessageDto(
				id, now, from, text.isEmpty() ? "" : text, attachmentKey, attachmentName, attachmentContentType);
		broadcastNewMessage(tid, dto);
		return dto;
	}

	public List<SupportAuditDto> listAudits() {
		return jdbc.query("""
				select cast(id as varchar) as id, at, action, cast(payload as varchar) as payload
				from support_audits
				order by at desc
				limit 250
				""",
			Map.of(),
			(rs, i) -> new SupportAuditDto(
				rs.getString("id"),
				rs.getTimestamp("at").toInstant(),
				rs.getString("action"),
				rs.getString("payload")
			)
		);
	}

	private void audit(String action, Object payload) {
		String json = null;
		try {
			json = payload == null ? null : objectMapper.writeValueAsString(payload);
		} catch (Exception ignored) {}
		if (json == null || json.isBlank()) {
			json = "{}";
		}
		// Bind jsonb without `cast(? as jsonb)` — plain String + cast can trigger BadSqlGrammarException on some JDBC stacks.
		SqlParameterValue jsonb = new SqlParameterValue(Types.OTHER, json);
		jdbc.update("""
				insert into support_audits (id, at, action, payload)
				values (:id, :at, :action, :payload)
				""",
			new MapSqlParameterSource()
				.addValue("id", UUID.fromString(uuid()))
				.addValue("at", java.sql.Timestamp.from(Instant.now()))
				.addValue("action", action == null ? "" : action)
				.addValue("payload", jsonb)
		);
	}

	private String uuid() {
		return UUID.randomUUID().toString();
	}

	private static String normalizeId(String raw) {
		String s = raw == null ? "" : raw.trim();
		if (s.isBlank()) throw new IllegalArgumentException("id is required");
		return s;
	}
}

