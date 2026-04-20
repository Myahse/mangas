package com.mangafrik.exception;

import com.mangafrik.dto.ErrorResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(NotFoundException.class)
	public ResponseEntity<ErrorResponseDto> handleNotFound(NotFoundException ex, HttpServletRequest req) {
		return build(HttpStatus.NOT_FOUND, ex, req);
	}

	@ExceptionHandler(AppException.class)
	public ResponseEntity<ErrorResponseDto> handleApp(AppException ex, HttpServletRequest req) {
		return build(HttpStatus.BAD_REQUEST, ex, req);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponseDto> handleAny(Exception ex, HttpServletRequest req) {
		return build(HttpStatus.INTERNAL_SERVER_ERROR, ex, req);
	}

	private static ResponseEntity<ErrorResponseDto> build(HttpStatus status, Exception ex, HttpServletRequest req) {
		return ResponseEntity.status(status).body(new ErrorResponseDto(
				Instant.now(),
				status.value(),
				status.getReasonPhrase(),
				ex.getMessage(),
				req.getRequestURI()
		));
	}
}

