package com.mangafriq.dto.finance;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class FinanceDtos {
	private FinanceDtos() {}

	public record FinanceSummaryDto(
		BigDecimal totalRevenue,
		BigDecimal totalPayouts,
		BigDecimal balance,
		long transactionCount
	) {}

	public record FinanceTransactionDto(
		String id,
		String type,
		BigDecimal amount,
		String currency,
		String reference,
		String note,
		Instant createdAt
	) {}

	public record FinanceTransactionsPage(
		List<FinanceTransactionDto> items
	) {}

	public record CreateFinanceTransaction(
		String type,
		BigDecimal amount,
		String currency,
		String reference,
		String note
	) {}
}

