package com.mangafrik.deserializer;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;
import java.time.Instant;

public class LenientInstantDeserializer extends JsonDeserializer<Instant> {
	@Override
	public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
		String raw = p.getValueAsString();
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return Instant.parse(raw);
	}
}

