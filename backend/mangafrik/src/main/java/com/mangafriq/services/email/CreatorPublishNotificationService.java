package com.mangafriq.services.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CreatorPublishNotificationService {
	private final EmailService emailService;

	@Value("${app.email.enabled:true}")
	private boolean emailEnabled;

	@Value("${app.public.base-url:http://localhost:5173}")
	private String publicBaseUrl;

	/** Optional URL of the creator dashboard (separate SPA). If blank, emails omit the direct link. */
	@Value("${app.creator-panel.url:}")
	private String creatorPanelUrl;

	public CreatorPublishNotificationService(EmailService emailService) {
		this.emailService = emailService;
	}

	public void notifyMangaSubmittedForReview(String creatorEmail, String mangaTitle) {
		if (!isSendable(creatorEmail)) {
			return;
		}
		String title = mangaTitle == null || mangaTitle.isBlank() ? "votre série" : mangaTitle.trim();
		String subject = "Votre série est en cours de modération — MangAfriq";
		StringBuilder body = new StringBuilder();
		body.append("Bonjour,\n\n");
		body.append("Nous avons bien reçu votre série « ").append(title).append(" ».\n\n");
		body.append("Notre équipe de modération l’examine actuellement. Dans la plupart des cas, ");
		body.append("vous recevez une décision sous 24 heures. Une fois validée, ");
		body.append("elle sera publiée automatiquement sur MangAfriq.\n\n");
		body.append("Vous pourrez suivre son statut depuis votre tableau de bord créateur");
		appendCreatorDashboardLink(body);
		body.append("\n\n— L'équipe MangAfriq");
		emailService.sendSimpleEmail(creatorEmail.trim(), subject, body.toString());
	}

	public void notifyMangaSubmissionRejected(String creatorEmail, String mangaTitle, String reason) {
		if (!isSendable(creatorEmail)) {
			return;
		}
		String title = mangaTitle == null || mangaTitle.isBlank() ? "votre série" : mangaTitle.trim();
		String r = reason == null ? "" : reason.trim();
		String subject = "Décision de modération : série non retenue — MangAfriq";
		StringBuilder body = new StringBuilder();
		body.append("Bonjour,\n\n");
		body.append("Après examen, votre série « ").append(title).append(" » n’a pas été retenue pour publication sur MangAfriq.\n\n");
		if (!r.isBlank()) {
			body.append("Motif communiqué par l’équipe :\n").append(r).append("\n\n");
		}
		body.append("Vous pouvez consulter le détail et l’historique depuis votre tableau de bord créateur");
		appendCreatorDashboardLink(body);
		body.append("\n\n— L'équipe MangAfriq");
		emailService.sendSimpleEmail(creatorEmail.trim(), subject, body.toString());
	}

	public void notifyMangaSubmissionResubmit(String creatorEmail, String mangaTitle, String reason) {
		if (!isSendable(creatorEmail)) {
			return;
		}
		String title = mangaTitle == null || mangaTitle.isBlank() ? "votre série" : mangaTitle.trim();
		String r = reason == null ? "" : reason.trim();
		String subject = "Modération : corrections demandées — MangAfriq";
		StringBuilder body = new StringBuilder();
		body.append("Bonjour,\n\n");
		body.append("Concernant votre série « ").append(title).append(" », l’équipe de modération souhaite des ajustements avant publication.\n\n");
		if (!r.isBlank()) {
			body.append("Consignes / commentaires :\n").append(r).append("\n\n");
		}
		body.append("Merci de mettre à jour votre proposition puis de la renvoyer depuis l’onglet Publications / séries de votre tableau de bord créateur");
		appendCreatorDashboardLink(body);
		body.append("\n\n— L'équipe MangAfriq");
		emailService.sendSimpleEmail(creatorEmail.trim(), subject, body.toString());
	}

	public void notifyMangaPublished(String creatorEmail, String mangaTitle, String slug) {
		if (!isSendable(creatorEmail)) {
			return;
		}
		String title = mangaTitle == null || mangaTitle.isBlank() ? "Votre série" : mangaTitle.trim();
		String safeSlug = slug == null ? "" : slug.trim();
		String base = publicBaseUrl == null ? "" : publicBaseUrl.replaceAll("/+$", "");
		String mangaUrl = safeSlug.isEmpty() ? base : base + "/manga/" + safeSlug;
		String dash = creatorPanelUrl == null ? "" : creatorPanelUrl.trim().replaceAll("/+$", "");
		String dashLine = dash.isBlank()
				? "Vous pouvez la gérer depuis votre tableau de bord créateur."
				: ("Vous pouvez la gérer depuis votre tableau de bord créateur :\n" + dash);
		String body = String.join(
				"\n\n",
				"Bonjour,",
				"Votre série « " + title + " » est maintenant publiée sur MangAfriq.",
				"Lecture publique : " + mangaUrl,
				dashLine,
				"— L'équipe MangAfriq");
		emailService.sendSimpleEmail(creatorEmail.trim(), "Votre série est publiée — MangAfriq", body);
	}

	public void notifyEpisodePublished(String creatorEmail, String seriesTitle, String episodeTitle) {
		if (!isSendable(creatorEmail)) {
			return;
		}
		String st = seriesTitle == null ? "" : seriesTitle.trim();
		String et = episodeTitle == null ? "" : episodeTitle.trim();
		String body = String.join(
				"\n\n",
				"Bonjour,",
				"Votre épisode « " + et + " » (« " + st + " ») a bien été publié.",
				"Les lecteurs peuvent le découvrir sur MangAfriq selon les réglages d’accès du catalogue.",
				"— L'équipe MangAfriq");
		emailService.sendSimpleEmail(creatorEmail.trim(), "Épisode publié", body);
	}

	private void appendCreatorDashboardLink(StringBuilder body) {
		String dash = creatorPanelUrl == null ? "" : creatorPanelUrl.trim().replaceAll("/+$", "");
		if (!dash.isBlank()) {
			body.append(" :\n").append(dash);
		} else {
			body.append(".");
		}
	}

	private boolean isSendable(String email) {
		if (!emailEnabled || !emailService.isConfigured()) {
			return false;
		}
		if (email == null || email.isBlank() || !email.contains("@")) {
			return false;
		}
		if ("unknown".equalsIgnoreCase(email.trim())) {
			return false;
		}
		return true;
	}
}
