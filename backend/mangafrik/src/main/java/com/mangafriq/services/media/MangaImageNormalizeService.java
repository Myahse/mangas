package com.mangafriq.services.media;

import com.mangafriq.exception.AppException;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.stereotype.Service;

@Service
public class MangaImageNormalizeService {

	public byte[] normalizeBytes(byte[] input, MangaNormalizeProfile profile) throws IOException {
		if (input == null || input.length == 0) {
			throw new AppException("Empty image payload");
		}
		BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(input));
		if (decoded == null) {
			throw new AppException("Unsupported or unreadable image");
		}
		return normalizeImage(decoded, profile);
	}

	public byte[] normalizeStream(InputStream input, MangaNormalizeProfile profile) throws IOException {
		BufferedImage decoded = ImageIO.read(input);
		if (decoded == null) {
			throw new AppException("Unsupported or unreadable image");
		}
		return normalizeImage(decoded, profile);
	}

	public byte[] normalizeImage(BufferedImage source, MangaNormalizeProfile profile) throws IOException {
		int tw = profile.width();
		int th = profile.height();
		long maxBytes = profile.maxBytes();

		BufferedImage cropped = cropCenterToAspect(source, tw, th);
		BufferedImage scaled = scaleTo(cropped, tw, th);

		float quality = 0.92f;
		byte[] out = writeJpeg(scaled, quality);
		while (out.length > maxBytes && quality > 0.5f) {
			quality = Math.max(0.5f, quality - 0.08f);
			out = writeJpeg(scaled, quality);
		}
		if (out.length > maxBytes) {
			throw new AppException("output_too_large");
		}
		return out;
	}

	private static BufferedImage cropCenterToAspect(BufferedImage src, int targetW, int targetH) {
		int sw = src.getWidth();
		int sh = src.getHeight();
		double targetAspect = (double) targetW / (double) targetH;
		double srcAspect = (double) sw / (double) sh;

		int sx = 0;
		int sy = 0;
		int sWidth = sw;
		int sHeight = sh;
		if (srcAspect > targetAspect) {
			sWidth = (int) Math.round(sh * targetAspect);
			sx = (sw - sWidth) / 2;
		} else if (srcAspect < targetAspect) {
			sHeight = (int) Math.round(sw / targetAspect);
			sy = (sh - sHeight) / 2;
		}

		BufferedImage out = new BufferedImage(sWidth, sHeight, BufferedImage.TYPE_INT_RGB);
		Graphics2D g = out.createGraphics();
		g.setColor(Color.WHITE);
		g.fillRect(0, 0, sWidth, sHeight);
		g.drawImage(src, 0, 0, sWidth, sHeight, sx, sy, sx + sWidth, sy + sHeight, null);
		g.dispose();
		return out;
	}

	private static BufferedImage scaleTo(BufferedImage src, int w, int h) {
		BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
		Graphics2D g = out.createGraphics();
		g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
		g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
		g.setColor(Color.WHITE);
		g.fillRect(0, 0, w, h);
		g.drawImage(src, 0, 0, w, h, null);
		g.dispose();
		return out;
	}

	private static byte[] writeJpeg(BufferedImage image, float quality) throws IOException {
		Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
		if (!writers.hasNext()) {
			throw new AppException("JPEG encoder unavailable");
		}
		ImageWriter writer = writers.next();
		ImageWriteParam param = writer.getDefaultWriteParam();
		param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
		param.setCompressionQuality(quality);

		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
			writer.setOutput(ios);
			writer.write(null, new IIOImage(image, null, null), param);
		} finally {
			writer.dispose();
		}
		return baos.toByteArray();
	}
}
