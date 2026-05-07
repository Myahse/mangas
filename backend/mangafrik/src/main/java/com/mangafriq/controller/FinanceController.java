package com.mangafriq.controller;

import com.mangafriq.constants.AppConstants;
import com.mangafriq.dto.finance.FinanceDtos.CreateFinanceTransaction;
import com.mangafriq.dto.finance.FinanceDtos.FinanceSummaryDto;
import com.mangafriq.dto.finance.FinanceDtos.FinanceTransactionDto;
import com.mangafriq.dto.finance.FinanceDtos.FinanceTransactionsPage;
import com.mangafriq.services.finance.FinanceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AppConstants.API_V1 + "/finance")
public class FinanceController {
	private final FinanceService financeService;

	public FinanceController(FinanceService financeService) {
		this.financeService = financeService;
	}

	@GetMapping("/summary")
	public FinanceSummaryDto summary() {
		return financeService.summary();
	}

	@GetMapping("/transactions")
	public FinanceTransactionsPage transactions(@RequestParam(required = false) Integer limit) {
		return financeService.listTransactions(limit);
	}

	@PostMapping("/transactions")
	public FinanceTransactionDto createTransaction(@RequestBody CreateFinanceTransaction req) {
		return financeService.createTransaction(req);
	}
}

