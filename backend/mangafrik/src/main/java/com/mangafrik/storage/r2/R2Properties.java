package com.mangafrik.storage.r2;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "r2")
public record R2Properties(
	String endpoint,
	String accessKeyId,
	String secretAccessKey,
	String bucket
) {}

