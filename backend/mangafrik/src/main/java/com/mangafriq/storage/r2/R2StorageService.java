package com.mangafriq.storage.r2;

import com.mangafriq.storage.ObjectStorageService;
import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
@ConditionalOnBean(S3Client.class)
public class R2StorageService implements ObjectStorageService {
	private final S3Client s3;
	private final R2Properties props;

	public R2StorageService(S3Client r2S3Client, R2Properties props) {
		this.s3 = r2S3Client;
		this.props = props;
	}

	@Override
	public String put(String key, String contentType, InputStream body, long contentLength) throws IOException {
		try {
			s3.putObject(
				PutObjectRequest.builder()
					.bucket(props.bucket())
					.key(key)
					.contentType(contentType)
					.build(),
				RequestBody.fromInputStream(body, contentLength)
			);
			return key;
		} catch (S3Exception e) {
			throw new IOException("Failed to upload to R2: " + e.awsErrorDetails().errorMessage(), e);
		}
	}

	@Override
	public StoredObject get(String key) throws IOException {
		try {
			ResponseInputStream<GetObjectResponse> resp = s3.getObject(
				GetObjectRequest.builder()
					.bucket(props.bucket())
					.key(key)
					.build()
			);
			String ct = resp.response().contentType();
			long len = resp.response().contentLength() == null ? -1L : resp.response().contentLength();
			return new StoredObject(key, ct == null ? "application/octet-stream" : ct, len, resp);
		} catch (NoSuchKeyException e) {
			throw new IOException("Not found: " + key, e);
		} catch (S3Exception e) {
			throw new IOException("Failed to read from R2: " + e.awsErrorDetails().errorMessage(), e);
		}
	}

	@Override
	public Optional<StoredObjectMetadata> head(String key) {
		try {
			var resp = s3.headObject(
				HeadObjectRequest.builder()
					.bucket(props.bucket())
					.key(key)
					.build()
			);
			String ct = resp.contentType();
			long len = resp.contentLength() == null ? -1L : resp.contentLength();
			return Optional.of(new StoredObjectMetadata(key, ct == null ? "application/octet-stream" : ct, len));
		} catch (NoSuchKeyException e) {
			return Optional.empty();
		} catch (S3Exception e) {
			return Optional.empty();
		}
	}
}

