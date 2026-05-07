package com.mangafriq.dto.ads;

import java.util.List;

public final class EmailCampaignDtos {
	private EmailCampaignDtos() {}

	public record EmailCampaignRequest(
			String target,        // all | role | list
			String role,          // reader | creator (when target=role)
			List<String> to,      // when target=list
			String subject,
			String text,
			String html,
			Integer maxRecipients
	) {}

	public record EmailCampaignResponse(
			int requested,
			int sent,
			int failed
	) {}
}

