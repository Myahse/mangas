package com.mangafriq.dto.store;

import java.time.Instant;
import java.util.List;

public final class StoreDtos {
	private StoreDtos() {}

	public record CoinPackDto(
		String id,
		String title,
		int coins,
		String currency,
		int amount
	) {}

	public record CoinPacksResponse(
		boolean paymentsEnabled,
		List<CoinPackDto> packs
	) {}

	public record CreatePurchaseIntentRequest(String packId) {}

	public record PurchaseIntentDto(
		String id,
		String packId,
		int coins,
		String currency,
		int amount,
		String status,
		String provider,
		String providerRef,
		Instant createdAt
	) {}
}

