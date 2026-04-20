package com.mangafrik.mapper;

import com.mangafrik.contract.MapperContract;
import org.springframework.stereotype.Component;

@Component
public class HealthMapper implements MapperContract<String, String> {
	@Override
	public String toDto(String source) {
		return source;
	}
}

