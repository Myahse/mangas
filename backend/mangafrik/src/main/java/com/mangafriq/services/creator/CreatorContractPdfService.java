package com.mangafriq.services.creator;

import com.mangafriq.dto.admin.AdminDtos.CreatorRequestDto;
import com.mangafriq.services.creator.CreatorContractService.ContractView;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Entities;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class CreatorContractPdfService {
	@Value("${app.public.api-base-url:http://localhost:8088}")
	private String publicApiBaseUrl;

	@Value("${app.creator.logo.path:}")
	private String creatorPanelLogoPath;

	public byte[] renderSignedContractPdf(CreatorRequestDto req, ContractView c) {
		if (req == null) throw new IllegalArgumentException("creator request required");
		if (c == null) throw new IllegalArgumentException("contract required");

		String base = (publicApiBaseUrl == null ? "" : publicApiBaseUrl.trim()).replaceAll("/$", "");
		if (base.isBlank()) base = "http://localhost:8088";

		String html = inlineCreatorLogo(buildSignedContractHtml(req, c));
		String xhtml = toXhtml(html);
		try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			PdfRendererBuilder builder = new PdfRendererBuilder();
			builder.withHtmlContent(xhtml, base);
			builder.toStream(out);
			builder.run();
			return out.toByteArray();
		} catch (Exception e) {
			log.warn("Failed to render contract PDF (creatorRequestId={}, token={})", req.id(), c.token(), e);
			throw new IllegalStateException("Failed to render contract PDF", e);
		}
	}

	private static String toXhtml(String html) {
		String h = html == null ? "" : html;
		Document doc = Jsoup.parse(h);
		doc.outputSettings()
			.syntax(Document.OutputSettings.Syntax.xml)
			.escapeMode(Entities.EscapeMode.xhtml)
			.prettyPrint(false);
		// Ensure we have an html/head/body wrapper.
		return doc.html();
	}

	private static final Pattern CREATOR_LOGO_IMG_SRC =
		Pattern.compile("(<img\\b[^>]*\\bsrc\\s*=\\s*[\"'])([^\"']*creator-panel-logo\\.png)([\"'][^>]*>)", Pattern.CASE_INSENSITIVE);
	private static final Pattern CREATOR_LOGO_IMG_TAG =
		Pattern.compile("<img\\b[^>]*creator-panel-logo\\.png[^>]*>", Pattern.CASE_INSENSITIVE);

	private String inlineCreatorLogo(String html) {
		String h = html == null ? "" : html;
		String p = creatorPanelLogoPath == null ? "" : creatorPanelLogoPath.trim();
		if (p.isBlank()) return h;
		try {
			byte[] bytes = Files.readAllBytes(Path.of(p));
			String b64 = Base64.getEncoder().encodeToString(bytes);
			String dataUri = "data:image/png;base64," + b64;
			Matcher m = CREATOR_LOGO_IMG_SRC.matcher(h);
			return m.replaceAll("$1" + Matcher.quoteReplacement(dataUri) + "$3");
		} catch (Exception e) {
			// Important: avoid leaving a remote URL that OpenHTMLToPDF might try (and fail) to fetch
			// in server environments. If we can't inline, remove the logo img tag.
			log.warn("Could not inline creator logo for PDF; removing logo tag (path={})", p, e);
			return CREATOR_LOGO_IMG_TAG.matcher(h).replaceAll("");
		}
	}

	private static String buildSignedContractHtml(CreatorRequestDto req, ContractView c) {
		String signature = String.valueOf(c.signatureData() == null ? "" : c.signatureData()).trim();
		String signer = String.valueOf(c.signerName() == null ? "" : c.signerName()).trim();
		String signedAt = String.valueOf(c.signedAt() == null ? "" : c.signedAt()).trim();

		String adminSignature = String.valueOf(c.adminSignatureData() == null ? "" : c.adminSignatureData()).trim();
		String adminSigner = String.valueOf(c.adminSignerName() == null ? "" : c.adminSignerName()).trim();
		String adminSignedAt = String.valueOf(c.adminSignedAt() == null ? "" : c.adminSignedAt()).trim();

		String creatorImg = signature.isBlank()
			? ""
			: "<div style=\"margin-top:6px;\"><img alt=\"Signature\" src=\"" + signature +
				"\" style=\"max-width:100%; width:100%; height:auto; display:block;\" /></div>";
		String adminImg = adminSignature.isBlank()
			? ""
			: "<div style=\"margin-top:6px;\"><img alt=\"Signature admin\" src=\"" + adminSignature +
				"\" style=\"max-width:100%; width:100%; height:auto; display:block;\" /></div>";

		// Table layout: PDF engines stack flex columns; one row + two cells keeps signatures side by side.
		String signaturesRow = """
			<table role="presentation" style="width:100%; border-collapse:collapse; margin-top:16px; border-top:1px solid #e0e0e0;">
			  <tr>
			    <td style="width:50%; vertical-align:top; padding:12px 12px 0 0; border:0;">
			      <div style="font-weight:900; font-size:12px; margin-bottom:6px;">Signature créateur</div>
			      <div style="font-size:11px; color:#444; line-height:1.4;">
			        <div><strong>Signataire</strong>: %s</div>
			        <div><strong>Date</strong>: %s</div>
			      </div>
			      %s
			    </td>
			    <td style="width:50%; vertical-align:top; padding:12px 0 0 12px; border:0;">
			      <div style="font-weight:900; font-size:12px; margin-bottom:6px;">Signature admin</div>
			      <div style="font-size:11px; color:#444; line-height:1.4;">
			        <div><strong>Signataire</strong>: %s</div>
			        <div><strong>Date</strong>: %s</div>
			      </div>
			      %s
			    </td>
			  </tr>
			</table>
			""".formatted(
				escape(signer),
				escape(signedAt),
				creatorImg,
				escape(adminSigner),
				escape(adminSignedAt),
				adminImg
			);

		String baseHtml = String.valueOf(c.contractHtml() == null ? "" : c.contractHtml());
		// Ensure it is a full HTML document for best PDF results.
		return """
			<!doctype html>
			<html>
			  <head>
			    <meta charset="utf-8" />
			    <meta name="viewport" content="width=device-width, initial-scale=1" />
			    <title>Contrat Créateur</title>
			  </head>
			  <body style="margin:0; padding:12px 16px 24px; background:#ffffff;">
			    %s
			    %s
			  </body>
			</html>
			""".formatted(baseHtml, signaturesRow);
	}

	private static String escape(String s) {
		String v = s == null ? "" : s;
		return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
	}
}

