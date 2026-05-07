package com.mangafriq.dto.wallet;

import java.time.Instant;
import java.util.List;

public final class WalletDtos {
	private WalletDtos() {}

	public record LedgerRowDto(
		String id,
		String type,
		int amount,
		String refType,
		String refId,
		Instant createdAt
	) {}

	public record WalletDto(
		int balance,
		int balancePaid,
		int balanceReward,
		List<LedgerRowDto> recent,
		boolean rewardsEnabled,
		boolean paymentsEnabled
	) {}

	/** Realtime wallet update pushed over WebSocket/STOMP. */
	public record WalletUpdateEvent(
		int balance,
		int balancePaid,
		int balanceReward,
		Instant at,
		String reason
	) {}

	public record DailyClaimResponse(
		boolean credited,
		int creditedAmount,
		int balance,
		Instant nextEligibleAt
	) {}

	public record DailyClaimStatusResponse(
		boolean rewardsEnabled,
		boolean canClaim,
		int amount,
		Instant lastClaimAt,
		Instant nextEligibleAt
	) {}

	public record ReferralInfo(
		String code,
		String link
	) {}

	public record PendingReferralRewardDto(
		String id,
		int amount,
		String referredDisplayName,
		Instant createdAt
	) {}

	public record ClaimReferralRewardResponse(
		boolean claimed,
		int amount,
		int balance,
		int balancePaid,
		int balanceReward
	) {}

	public record UnlockMangaRequest(String mangaSlug) {}

	public record UnlockChapterRequest(String mangaSlug, int chapterNumber) {}

	public record UnlockResponse(
		boolean unlocked,
		int spent,
		int balance
	) {}

	/** Admin-only manual coin grant. Use userId when possible; email is allowed for convenience. */
	public record AdminGrantCoinsRequest(
		String userId,
		String email,
		int amount,
		String note
	) {}

	public record AdminGrantCoinsResponse(
		String userId,
		int credited,
		int balance
	) {}
}

