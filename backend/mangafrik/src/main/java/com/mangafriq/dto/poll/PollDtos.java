package com.mangafriq.dto.poll;

import java.time.Instant;
import java.util.List;

public final class PollDtos {
	private PollDtos() {}

	/** {@code votes} are shown to readers once they voted, or when the poll is closed. */
	public record PollOptionDto(String id, String label, Integer votes) {}

	public record PollDto(
		String id, String slug, String seriesTitle, int chapterNumber, String question, String status,
		Instant closesAt, String winnerOptionId, List<PollOptionDto> options, Integer totalVotes,
		/** My votes on this poll (free + boosts) and the option of my free vote; null when signed out. */
		Integer myVotes, String myOptionId, int boostCost
	) {}

	public record CreatePollRequest(String slug, Integer chapterNumber, String question, List<String> options, Instant closesAt) {}

	/** extraVotes: votes bought with coins on top of the free one (each costs boostCost). */
	public record VoteRequest(String optionId, Integer extraVotes) {}
}
