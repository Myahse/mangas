package com.mangafriq.services.impl;

import com.mangafriq.services.HealthService;
import org.springframework.stereotype.Service;

@Service
public class DefaultHealthService implements HealthService {
	@Override
	public String status() {
		return "ok";
	}
}

