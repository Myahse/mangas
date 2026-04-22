package com.mangafrik.services.impl;

import com.mangafrik.services.HealthService;
import org.springframework.stereotype.Service;

@Service
public class DefaultHealthService implements HealthService {
	@Override
	public String status() {
		return "ok";
	}
}

