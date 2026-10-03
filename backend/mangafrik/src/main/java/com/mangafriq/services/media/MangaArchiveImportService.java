package com.mangafriq.services.media;

import com.mangafriq.exception.AppException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MangaArchiveImportService {
	private static final long ARCHIVE_MAX_BYTES = 150L * 1024 * 1024;
	private static final long PDF_MAX_BYTES = 80L * 1024 * 1024;
	private static final int MAX_PAGES = 100;
	private static final Pattern IMAGE_NAME = Pattern.compile(".*\\.(jpe?g|png|webp|gif|bmp)$", Pattern.CASE_INSENSITIVE);

	private final MangaImageNormalizeService normalizeService;

	public MangaArchiveImportService(MangaImageNormalizeService normalizeService) {
		this.normalizeService = normalizeService;
	}

	public List<byte[]> extractAndNormalizePages(MultipartFile file, MangaNormalizeProfile profile) throws IOException {
		String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
		String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);

		if (name.endsWith(".pdf") || contentType.contains("pdf")) {
			if (file.getSize() > PDF_MAX_BYTES) {
				throw new AppException("PDF too large (max 80MB)");
			}
			return pagesFromPdf(file.getInputStream(), profile);
		}

		if (name.endsWith(".zip") || name.endsWith(".cbz") || contentType.contains("zip")) {
			if (file.getSize() > ARCHIVE_MAX_BYTES) {
				throw new AppException("Archive too large (max 150MB)");
			}
			return pagesFromZip(file.getInputStream(), profile);
		}

		throw new AppException("Expected ZIP, CBZ, or PDF archive");
	}

	private List<byte[]> pagesFromZip(InputStream in, MangaNormalizeProfile profile) throws IOException {
		record Entry(String path, byte[] bytes) {}
		List<Entry> entries = new ArrayList<>();

		try (ZipInputStream zip = new ZipInputStream(in)) {
			ZipEntry entry;
			while ((entry = zip.getNextEntry()) != null) {
				if (entry.isDirectory()) continue;
				String path = entry.getName();
				if (path.contains("__MACOSX/") || path.startsWith(".")) continue;
				String base = path;
				int slash = base.lastIndexOf('/');
				if (slash >= 0) base = base.substring(slash + 1);
				if (base.startsWith(".") || !IMAGE_NAME.matcher(base).matches()) continue;

				byte[] data = zip.readAllBytes();
				if (data.length == 0) continue;
				entries.add(new Entry(path, data));
			}
		}

		entries.sort(Comparator.comparing(Entry::path, Comparator.nullsLast(String::compareToIgnoreCase)));

		List<byte[]> pages = new ArrayList<>();
		for (Entry e : entries) {
			if (pages.size() >= MAX_PAGES) break;
			pages.add(normalizeService.normalizeBytes(e.bytes(), profile));
		}
		if (pages.isEmpty()) {
			throw new AppException("No images found in archive");
		}
		return pages;
	}

	private List<byte[]> pagesFromPdf(InputStream in, MangaNormalizeProfile profile) throws IOException {
		byte[] pdfBytes = in.readAllBytes();
		List<byte[]> pages = new ArrayList<>();
		try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
			PDFRenderer renderer = new PDFRenderer(doc);
			int count = doc.getNumberOfPages();
			for (int i = 0; i < count && pages.size() < MAX_PAGES; i++) {
				BufferedImage rendered = renderer.renderImageWithDPI(i, 200, ImageType.RGB);
				pages.add(normalizeService.normalizeImage(rendered, profile));
			}
		}
		if (pages.isEmpty()) {
			throw new AppException("PDF has no pages");
		}
		return pages;
	}
}
