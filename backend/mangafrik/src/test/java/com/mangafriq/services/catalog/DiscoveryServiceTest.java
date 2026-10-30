package com.mangafriq.services.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.mangafriq.dto.MangaDto;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Search scoring rules (pure functions, no Spring context). */
class DiscoveryServiceTest {

	private static MangaDto manga(String title, String author, List<String> genres, String synopsis) {
		return new MangaDto("1", title, "slug", author, "", "", "", "", genres, 4.0, 1, null, "", "0", synopsis, false, 2026, null);
	}

	@Test
	void normalizeDropsAccentsCaseAndPunctuation() {
		assertEquals("l epee d abidjan", DiscoveryService.normalize("L'Épée d’Abidjan !"));
		assertEquals(List.of("griot", "s", "tale"), DiscoveryService.tokens("Griot's  Tale"));
		assertEquals("coeur de dakar", DiscoveryService.normalize("Cœur de Dakar"));
	}

	@Test
	void oneTypoIsForgivenOnlyOnLongEnoughWords() {
		assertTrue(DiscoveryService.closeEnough("abidjna", "abidjan"));  // swapped letters
		assertTrue(DiscoveryService.closeEnough("retuor", "retour"));
		assertFalse(DiscoveryService.closeEnough("rat", "ras"));         // 3 letters: exact only
		assertFalse(DiscoveryService.closeEnough("retour", "detours"));  // two edits on a 6-letter word
	}

	@Test
	void titleBeatsAuthorBeatsGenreBeatsSynopsis() {
		MangaDto m = manga("Le Retour d'Awa", "Kofi Mensah", List.of("Aventure"), "Une histoire à Abidjan.");
		assertEquals(10, DiscoveryService.tokenScore("retour", m));
		assertEquals(8, DiscoveryService.tokenScore("ret", m));
		assertEquals(4, DiscoveryService.tokenScore("retuor", m));
		assertEquals(5, DiscoveryService.tokenScore("mensah", m));
		assertEquals(3, DiscoveryService.tokenScore("aventure", m));
		assertEquals(1, DiscoveryService.tokenScore("abidjan", m));
		assertEquals(0, DiscoveryService.tokenScore("zombie", m));
	}
}
