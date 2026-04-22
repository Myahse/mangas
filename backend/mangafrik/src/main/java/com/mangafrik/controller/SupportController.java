package com.mangafrik.controller;

import com.mangafrik.constants.AppConstants;
import com.mangafrik.dto.support.SupportDtos.MessageDto;
import com.mangafrik.dto.support.SupportDtos.RejectTicketRequest;
import com.mangafrik.dto.support.SupportDtos.SendMessageRequest;
import com.mangafrik.dto.support.SupportDtos.SupportAuditDto;
import com.mangafrik.dto.support.SupportDtos.SupportSummaryDto;
import com.mangafrik.dto.support.SupportDtos.TicketDto;
import com.mangafrik.dto.support.SupportDtos.UpdateTicketRequest;
import com.mangafrik.dto.support.SupportDtos.ValidateTicketRequest;
import com.mangafrik.services.support.SupportStore;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/support")
public class SupportController {
	private final SupportStore supportStore;

	public SupportController(SupportStore supportStore) {
		this.supportStore = supportStore;
	}

	@GetMapping("/summary")
	public SupportSummaryDto summary() {
		return supportStore.summary();
	}

	@GetMapping("/audits")
	public List<SupportAuditDto> audits() {
		return supportStore.listAudits();
	}

	@GetMapping("/tickets")
	public List<TicketDto> tickets() {
		return supportStore.listTickets();
	}

	@GetMapping("/tickets/{id}")
	public TicketDto ticket(@PathVariable String id) {
		return supportStore.getTicket(id);
	}

	@PatchMapping("/tickets/{id}")
	public TicketDto updateTicket(@PathVariable String id, @RequestBody UpdateTicketRequest patch) {
		return supportStore.updateTicket(id, patch);
	}

	@PostMapping("/tickets/{id}/validate")
	public TicketDto validate(@PathVariable String id, @RequestBody ValidateTicketRequest req) {
		return supportStore.validateTicket(id, req);
	}

	@PostMapping("/tickets/{id}/reject")
	public TicketDto reject(@PathVariable String id, @RequestBody RejectTicketRequest req) {
		return supportStore.rejectTicket(id, req);
	}

	@GetMapping("/tickets/{id}/messages")
	public List<MessageDto> messages(@PathVariable String id) {
		return supportStore.listMessages(id);
	}

	@PostMapping("/tickets/{id}/messages")
	public MessageDto send(@PathVariable String id, @RequestBody SendMessageRequest req) {
		return supportStore.sendMessage(id, req);
	}
}

