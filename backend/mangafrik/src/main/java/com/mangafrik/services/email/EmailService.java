package com.mangafrik.services.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
	private final JavaMailSender mailSender;

	@Value("${app.email.from:MangAfrik <noreply@mangafrik.com>}")
	private String fromEmail;

	@Value("${app.email.subject.prefix:[MangAfrik]}")
	private String subjectPrefix;

	public EmailService(JavaMailSender mailSender) {
		this.mailSender = mailSender;
	}

	public void sendSimpleEmail(String toEmail, String subject, String content) {
		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(fromEmail);
		message.setTo(toEmail);
		message.setSubject(subjectPrefix + " " + subject);
		message.setText(content);
		mailSender.send(message);
	}

	public void sendHtmlEmail(String toEmail, String subject, String htmlContent) throws MessagingException {
		MimeMessage message = mailSender.createMimeMessage();
		MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
		helper.setFrom(fromEmail);
		helper.setTo(toEmail);
		helper.setSubject(subjectPrefix + " " + subject);
		helper.setText(htmlContent, true);
		mailSender.send(message);
	}
}

