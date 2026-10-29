package com.mangafriq.storage.r2;

import com.mangafriq.storage.NoopStorageService;
import com.mangafriq.storage.ObjectStorageService;
import java.net.URI;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
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
	// application.properties always defines r2.endpoint (empty when R2_ENDPOINT is unset), so check it has a
	// value; otherwise NoopStorageService takes over instead of startup failing on "Missing r2.endpoint".
	@ConditionalOnExpression("!'${r2.endpoint:}'.trim().isEmpty()")
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

	/** R2 when an S3 client is configured, otherwise the no-op store (decided here, not by scan-time conditions). */
	@Bean
	public ObjectStorageService objectStorageService(ObjectProvider<S3Client> r2S3Client, R2Properties props) {
		S3Client s3 = r2S3Client.getIfAvailable();
		return s3 != null ? new R2StorageService(s3, props) : new NoopStorageService();
	}
}

