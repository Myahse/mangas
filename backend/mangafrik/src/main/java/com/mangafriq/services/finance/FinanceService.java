package com.mangafriq.services.finance;

import com.mangafriq.dto.finance.FinanceDtos.CreateFinanceTransaction;
import com.mangafriq.dto.finance.FinanceDtos.FinanceSummaryDto;
import com.mangafriq.dto.finance.FinanceDtos.FinanceTransactionDto;
import com.mangafriq.dto.finance.FinanceDtos.FinanceTransactionsPage;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class FinanceService {
	private final NamedParameterJdbcTemplate jdbc;

	public FinanceService(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public FinanceSummaryDto summary() {
		Map<String, Object> row;
		try {
			row = jdbc.queryForMap("""
					select
					  coalesce(sum(case when upper(type) = 'REVENUE' then amount else 0 end), 0) as total_revenue,
					  coalesce(sum(case when upper(type) = 'PAYOUT' then amount else 0 end), 0) as total_payouts,
					  coalesce(sum(
					    case
					      when upper(type) = 'REVENUE' then amount
					      when upper(type) = 'PAYOUT' then (amount * -1)
					      else amount
					    end
					  ), 0) as balance,
					  coalesce(count(*), 0) as tx_count
					from finance_transactions
					""", Map.of());
		} catch (BadSqlGrammarException e) {
			// If migrations haven't been applied yet, avoid crashing the whole panel.
			return new FinanceSummaryDto(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0);
		}

		return new FinanceSummaryDto(
			asBigDecimal(row.get("total_revenue")),
			asBigDecimal(row.get("total_payouts")),
			asBigDecimal(row.get("balance")),
			asLong(row.get("tx_count"))
		);
	}

	public FinanceTransactionsPage listTransactions(Integer limit) {
		int lim = Math.max(1, Math.min(500, limit == null ? 50 : limit));
		List<FinanceTransactionDto> items;
		try {
			items = jdbc.query("""
					select id::text as id, type, amount, currency, reference, note, created_at
					from finance_transactions
					order by created_at desc
					limit :limit
					""",
				Map.of("limit", lim),
				(rs, i) -> new FinanceTransactionDto(
					rs.getString("id"),
					rs.getString("type"),
					rs.getBigDecimal("amount"),
					rs.getString("currency"),
					rs.getString("reference"),
					rs.getString("note"),
					rs.getTimestamp("created_at").toInstant()
				)
			);
		} catch (BadSqlGrammarException e) {
			items = List.of();
		}
		return new FinanceTransactionsPage(items);
	}

	public FinanceTransactionDto createTransaction(CreateFinanceTransaction req) {
		if (req == null) throw new IllegalArgumentException("payload is required");
		String type = normalizeType(req.type());
		String currency = normalizeCurrency(req.currency());
		BigDecimal amount = req.amount() == null ? BigDecimal.ZERO : req.amount();
		if (amount.compareTo(BigDecimal.ZERO) == 0) throw new IllegalArgumentException("amount must be non-zero");
		if (amount.scale() > 2) amount = amount.setScale(2, java.math.RoundingMode.HALF_UP);

		String reference = nzNullable(req.reference(), 120);
		String note = nzNullable(req.note(), 400);

		UUID id = UUID.randomUUID();
		Instant now = Instant.now();
		jdbc.update("""
				insert into finance_transactions (id, type, amount, currency, reference, note, created_at)
				values (:id, :type, :amount, :currency, :reference, :note, :created_at)
				""",
			new MapSqlParameterSource()
				.addValue("id", id)
				.addValue("type", type)
				.addValue("amount", amount)
				.addValue("currency", currency)
				.addValue("reference", reference)
				.addValue("note", note)
				.addValue("created_at", Timestamp.from(now))
		);

		return new FinanceTransactionDto(
			id.toString(),
			type,
			amount,
			currency,
			reference,
			note,
			now
		);
	}

	private static String normalizeType(String raw) {
		String t = raw == null ? "" : raw.trim().toUpperCase();
		return switch (t) {
			case "REVENUE", "PAYOUT", "ADJUSTMENT" -> t;
			default -> throw new IllegalArgumentException("type is invalid");
		};
	}

	private static String normalizeCurrency(String raw) {
		String c = raw == null ? "" : raw.trim().toUpperCase();
		return switch (c) {
			case "XOF", "USD", "EUR" -> c;
			default -> throw new IllegalArgumentException("currency is invalid");
		};
	}

	private static String nzNullable(String raw, int maxLen) {
		String s = raw == null ? "" : raw.trim();
		if (s.isBlank()) return null;
		if (s.length() > maxLen) return s.substring(0, maxLen);
		return s;
	}

	private static long asLong(Object v) {
		if (v instanceof Number n) return n.longValue();
		try {
			return Long.parseLong(String.valueOf(v));
		} catch (Exception e) {
			return 0;
		}
	}

	private static BigDecimal asBigDecimal(Object v) {
		if (v instanceof BigDecimal bd) return bd;
		if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
		try {
			String s = Objects.toString(v, "0").trim();
			if (s.isBlank()) return BigDecimal.ZERO;
			return new BigDecimal(s);
		} catch (Exception e) {
			return BigDecimal.ZERO;
		}
	}
}

