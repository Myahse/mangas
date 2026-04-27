package com.mangafrik.exception;

import com.mangafrik.dto.ErrorResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

	@ExceptionHandler(NotFoundException.class)
	public ResponseEntity<ErrorResponseDto> handleNotFound(NotFoundException ex, HttpServletRequest req) {
		return build(HttpStatus.NOT_FOUND, ex, req);
	}

	/**
	 * When a request does not match any controller mapping, Spring may route it
	 * through the static resource chain and throw a "no resource found" exception.
	 * Treat these as proper 404s rather than generic 500s.
	 */
	@ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
	public ResponseEntity<ErrorResponseDto> handleFrameworkNotFound(Exception ex, HttpServletRequest req) {
		return build(HttpStatus.NOT_FOUND, ex, req);
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ErrorResponseDto> handleMethodNotAllowed(
			HttpRequestMethodNotSupportedException ex,
			HttpServletRequest req
	) {
		return build(HttpStatus.METHOD_NOT_ALLOWED, ex, req);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponseDto> handleBadJson(HttpMessageNotReadableException ex, HttpServletRequest req) {
		return build(HttpStatus.BAD_REQUEST, ex, req);
	}

	@ExceptionHandler(AppException.class)
	public ResponseEntity<ErrorResponseDto> handleApp(AppException ex, HttpServletRequest req) {
		return build(HttpStatus.BAD_REQUEST, ex, req);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponseDto> handleAny(Exception ex, HttpServletRequest req) {
		log.error("Unhandled exception on {} {}", req.getMethod(), req.getRequestURI(), ex);
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

