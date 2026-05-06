package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.admin.AdminDtos.CreatorRequestDto;
import com.mangafriq.dto.admin.AdminDtos.ReviewRequest;
import com.mangafriq.services.creator.CreatorContractPdfService;
import com.mangafriq.services.creator.CreatorContractService;
import com.mangafriq.services.creator.CreatorContractService.ContractView;
import com.mangafriq.services.creator.CreatorRequestService;
import com.mangafriq.services.email.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/admin/creator-contracts")
public class AdminCreatorContractsController {
	private final CreatorRequestService creatorRequestService;
	private final CreatorContractService contractService;
	private final CreatorContractPdfService pdfService;
	private final EmailService emailService;

	public AdminCreatorContractsController(
			CreatorRequestService creatorRequestService,
			CreatorContractService contractService,
			CreatorContractPdfService pdfService,
			EmailService emailService
	) {
		this.creatorRequestService = creatorRequestService;
		this.contractService = contractService;
		this.pdfService = pdfService;
		this.emailService = emailService;
	}

	public record AdminSignContractRequest(String signerName, boolean accept, String signatureData) {}

	@GetMapping("/creator-requests/{id}")
	public ContractView latestForCreatorRequest(@PathVariable String id) {
		CreatorRequestDto cr = creatorRequestService.getById(id);
		return contractService.latestByCreatorRequestId(cr.id());
	}

	@PostMapping("/creator-requests/{id}/admin-sign")
	public ResponseEntity<?> adminSign(@PathVariable String id, @RequestBody AdminSignContractRequest req, HttpServletRequest http) {
		if (req == null || !req.accept()) {
			return ResponseEntity.badRequest().body(Map.of("error", "accept must be true"));
		}
		CreatorRequestDto cr = creatorRequestService.getById(id);
		String ip = http.getRemoteAddr();
		String ua = http.getHeader("User-Agent");
		try {
			ContractView next = contractService.adminSignLatestByCreatorRequestId(
				cr.id(),
				"Admin",
				req.signatureData(),
				ip,
				ua
			);
			return ResponseEntity.ok(next);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/creator-requests/{id}/send-pdf")
	public ResponseEntity<?> sendSignedContractPdf(@PathVariable String id) {
		CreatorRequestDto req = creatorRequestService.getById(id);
		ContractView c = contractService.latestByCreatorRequestId(req.id());
		String status = String.valueOf(c.status()).trim().toLowerCase();
		if (!"fully_signed".equals(status)) {
			return ResponseEntity.badRequest().body(Map.of("error", "contract must be signed by creator and admin first"));
		}

		// Sending the signed PDF back finalizes approval (creator credentials + request status).
		String requestStatus = req.status() == null ? "" : req.status().trim().toLowerCase();
		if ("pending".equals(requestStatus)) {
			try {
				creatorRequestService.review(
					req.id(),
					new ReviewRequest(
						"approved",
						"Votre demande a été approuvée. Consultez vos emails pour le contrat PDF et vos identifiants créateur."
					)
				);
			} catch (IllegalArgumentException | IllegalStateException e) {
				return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
			}
		}

		CreatorRequestDto reqForPdf = creatorRequestService.getById(id);
		ContractView cSigned = contractService.latestByCreatorRequestId(reqForPdf.id());
		byte[] pdf = pdfService.renderSignedContractPdf(reqForPdf, cSigned);
		String fileName = "contrat-createur-" + reqForPdf.id() + ".pdf";
		String subject = "Votre contrat créateur (PDF)";
		String text = """
			Bonjour %s,

			Veuillez trouver en pièce jointe votre contrat créateur signé (PDF).

			MangAfriq
			""".formatted(reqForPdf.displayName());

		Set<String> to = new LinkedHashSet<>();
		if (reqForPdf.email() != null && !reqForPdf.email().isBlank()) to.add(reqForPdf.email().trim());
		if (reqForPdf.creatorEmail() != null && !reqForPdf.creatorEmail().isBlank()) to.add(reqForPdf.creatorEmail().trim());

		for (String email : to) {
			emailService.sendPdfAttachmentEmail(email, subject, text, fileName, pdf);
		}

		return ResponseEntity.ok(Map.of(
			"sent", true,
			"to", to,
			"bytes", pdf.length,
			"at", Instant.now().toString()
		));
	}
}

