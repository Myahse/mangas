package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.support.SupportDtos.CreateTicketRequest;
import com.mangafriq.dto.support.SupportDtos.MessageDto;
import com.mangafriq.dto.support.SupportDtos.SendMessageRequest;
import com.mangafriq.dto.support.SupportDtos.TicketDto;
import com.mangafriq.exception.NotFoundException;
import com.mangafriq.services.support.SupportStore;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(AppConstants.API_V1 + "/support/public")
public class SupportPublicController {
	private final SupportStore supportStore;

	public SupportPublicController(SupportStore supportStore) {
		this.supportStore = supportStore;
	}

	@PostMapping("/tickets")
	public TicketDto createTicket(@RequestBody CreateTicketRequest req) {
		return supportStore.createTicket(req);
	}

	@GetMapping("/tickets/{id}")
	public TicketDto ticket(@PathVariable String id) {
		TicketDto t = supportStore.getTicket(id);
		if (t == null) throw new NotFoundException("Ticket not found");
		return t;
	}

	@GetMapping("/tickets/{id}/messages")
	public List<MessageDto> messages(@PathVariable String id) {
		TicketDto t = supportStore.getTicket(id);
		if (t == null) throw new NotFoundException("Ticket not found");
		return supportStore.listMessages(id);
	}

	@PostMapping("/tickets/{id}/messages")
	public MessageDto send(@PathVariable String id, @RequestBody SendMessageRequest req) {
		TicketDto t = supportStore.getTicket(id);
		if (t == null) throw new NotFoundException("Ticket not found");
		return supportStore.sendMessage(id, req);
	}

	@GetMapping("/tickets/{id}/attachments")
	public ResponseEntity<Void> attachmentsMethodNotAllowed() {
		return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).header(HttpHeaders.ALLOW, "POST").build();
	}

	@PostMapping("/tickets/{id}/attachments")
	public Map<String, Object> uploadAttachment(@PathVariable String id, @RequestPart("file") MultipartFile file)
			throws IOException {
		TicketDto t = supportStore.getTicket(id);
		if (t == null) throw new NotFoundException("Ticket not found");
		return supportStore.uploadAttachmentForTicket(id, file);
	}
}

