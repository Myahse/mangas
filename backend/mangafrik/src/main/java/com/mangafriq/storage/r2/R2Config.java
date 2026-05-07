package com.mangafriq.storage.r2;

import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
@EnableConfigurationProperties(R2Properties.class)
public class R2Config {

	@Bean
	@ConditionalOnProperty(prefix = "r2", name = "endpoint")
	public S3Client r2S3Client(R2Properties props) {
		if (props.endpoint() == null || props.endpoint().isBlank()) {
			throw new IllegalStateException("Missing r2.endpoint");
		}
		if (props.accessKeyId() == null || props.accessKeyId().isBlank()) {
			throw new IllegalStateException("Missing r2.accessKeyId");
		}
		if (props.secretAccessKey() == null || props.secretAccessKey().isBlank()) {
			throw new IllegalStateException("Missing r2.secretAccessKey");
		}

		return S3Client.builder()
			.credentialsProvider(
				StaticCredentialsProvider.create(
					AwsBasicCredentials.create(props.accessKeyId().trim(), props.secretAccessKey().trim())
				)
			)
			.region(Region.of("auto"))
			.endpointOverride(URI.create(props.endpoint().trim()))
			.serviceConfiguration(
				S3Configuration.builder()
					.pathStyleAccessEnabled(true)
					.build()
			)
			.build();
	}
}

