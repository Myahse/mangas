package com.mangafriq.services.catalog;

import com.mangafriq.dto.MangaDto;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Finding series: search that ignores accents and case and forgives a typo, "Si vous avez aimé…"
 * (shared genres + what the series' other readers also read), and "Pour vous" (the genres of what the
 * reader reads or follows). The catalog is small, so scoring runs in memory on the catalog listing.
 */
@Service
public class DiscoveryService {
	private final CatalogService catalog;
	private final NamedParameterJdbcTemplate jdbc;

	public DiscoveryService(CatalogService catalog, NamedParameterJdbcTemplate jdbc) {
		this.catalog = catalog;
		this.jdbc = jdbc;
	}

	/* ─── Search ─── */

	public List<MangaDto> search(String query, int limitRaw) {
		int limit = clamp(limitRaw, 1, 50);
		List<String> tokens = tokens(query);
		if (tokens.isEmpty()) return List.of();
		record Hit(MangaDto manga, double score) {}
		List<Hit> hits = new ArrayList<>();
		for (MangaDto m : catalog.listAll()) {
			double total = 0;
			boolean allMatched = true;
			for (String t : tokens) {
				double s = tokenScore(t, m);
				if (s <= 0) { allMatched = false; break; }
				total += s;
			}
			if (allMatched) hits.add(new Hit(m, total));
		}
		return hits.stream()
			.sorted(Comparator.comparingDouble(Hit::score).reversed().thenComparing(h -> -h.manga().rating()))
			.limit(limit)
			.map(Hit::manga)
			.toList();
	}

	/** How well one query word matches a series (0 = not at all). */
	static double tokenScore(String token, MangaDto m) {
		List<String> titleWords = tokens(m.title());
		String title = normalize(m.title());
		double best = 0;
		if (titleWords.contains(token)) best = 10;
		else if (titleWords.stream().anyMatch(w -> w.startsWith(token))) best = 8;
		else if (title.contains(token)) best = 6;
		else if (titleWords.stream().anyMatch(w -> closeEnough(token, w))) best = 4;
		if (best < 5 && (normalize(m.author()).contains(token) || normalize(m.artist()).contains(token))) best = 5;
		if (best < 3 && m.genres() != null && m.genres().stream().map(DiscoveryService::normalize).anyMatch(g -> g.contains(token))) best = 3;
		if (best < 1 && normalize(m.synopsis()).contains(token)) best = 1;
		return best;
	}

	/** One typo for words of 4+ letters, two for 7+ (short words must match exactly). */
	static boolean closeEnough(String a, String b) {
		int allowed = Math.min(a.length(), b.length()) >= 7 ? 2 : Math.min(a.length(), b.length()) >= 4 ? 1 : 0;
		if (allowed == 0 || Math.abs(a.length() - b.length()) > allowed) return false;
		return distance(a, b) <= allowed;
	}

	/** Optimal string alignment distance (Levenshtein + swapped neighbours). */
	static int distance(String a, String b) {
		int[][] d = new int[a.length() + 1][b.length() + 1];
		for (int i = 0; i <= a.length(); i++) d[i][0] = i;
		for (int j = 0; j <= b.length(); j++) d[0][j] = j;
		for (int i = 1; i <= a.length(); i++) {
			for (int j = 1; j <= b.length(); j++) {
				int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
				d[i][j] = Math.min(Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1), d[i - 1][j - 1] + cost);
				if (i > 1 && j > 1 && a.charAt(i - 1) == b.charAt(j - 2) && a.charAt(i - 2) == b.charAt(j - 1)) {
					d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
				}
			}
		}
		return d[a.length()][b.length()];
	}

	static String normalize(String s) {
		if (s == null) return "";
		// Ligatures are not split by NFD: "Cœur" must match "coeur".
		String expanded = s.replace("œ", "oe").replace("Œ", "OE").replace("æ", "ae").replace("Æ", "AE").replace("ß", "ss");
		String n = Normalizer.normalize(expanded, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
		return n.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
	}

	static List<String> tokens(String s) {
		String n = normalize(s);
		return n.isEmpty() ? List.of() : Arrays.stream(n.split(" ")).filter(w -> !w.isBlank()).toList();
	}

	/* ─── Recommendations ─── */

	/** "Si vous avez aimé …": shared genres, plus series the same readers also read. */
	public List<MangaDto> similar(String slug, int limitRaw) {
		int limit = clamp(limitRaw, 1, 24);
		List<MangaDto> all = catalog.listAll();
		MangaDto base = all.stream().filter(m -> m.slug().equals(slug)).findFirst().orElse(null);
		if (base == null) return List.of();
		Set<String> baseGenres = genreSet(base);
		Map<String, Integer> coReaders = coReaders(slug);
		return rank(all, Set.of(slug), m -> {
			Set<String> g = genreSet(m);
			long shared = g.stream().filter(baseGenres::contains).count();
			double genreScore = baseGenres.isEmpty() ? 0 : 6.0 * shared / Math.max(baseGenres.size(), g.size());
			return genreScore + 2.0 * Math.min(5, coReaders.getOrDefault(m.slug(), 0));
		}, limit);
	}

	/** "Pour vous": genres of the series the reader reads or follows; never one they already read. */
	public List<MangaDto> forUser(String userId, int limitRaw) {
		int limit = clamp(limitRaw, 1, 24);
		List<String> mine = jdbc.queryForList("""
				select manga_slug from reading_progress where user_id = :user
				union select manga_slug from series_follows where user_id = :user
				""", Map.of("user", userId), String.class);
		List<MangaDto> all = catalog.listAll();
		if (mine.isEmpty()) return all.stream().sorted(Comparator.comparingDouble(MangaDto::rating).reversed()).limit(limit).toList();
		Set<String> seen = new HashSet<>(mine);
		Map<String, Integer> genreWeight = new HashMap<>();
		all.stream().filter(m -> seen.contains(m.slug()))
			.forEach(m -> genreSet(m).forEach(g -> genreWeight.merge(g, 1, Integer::sum)));
		return rank(all, seen, m -> genreSet(m).stream().mapToInt(g -> genreWeight.getOrDefault(g, 0)).sum(), limit);
	}

	private List<MangaDto> rank(List<MangaDto> all, Set<String> exclude, java.util.function.ToDoubleFunction<MangaDto> score, int limit) {
		record Scored(MangaDto m, double s) {}
		return all.stream()
			.filter(m -> !exclude.contains(m.slug()))
			.map(m -> new Scored(m, score.applyAsDouble(m) + 0.1 * m.rating()))
			.sorted(Comparator.comparingDouble(Scored::s).reversed())
			.limit(limit)
			.map(Scored::m)
			.toList();
	}

	/** How many readers of {@code slug} also have each other series in their reading progress. */
	private Map<String, Integer> coReaders(String slug) {
		Map<String, Integer> out = new HashMap<>();
		jdbc.query("""
				select other.manga_slug, count(*) as n
				from reading_progress mine
				join reading_progress other on other.user_id = mine.user_id and other.manga_slug <> mine.manga_slug
				where mine.manga_slug = :slug
				group by other.manga_slug
				""", Map.of("slug", slug), rs -> { out.put(rs.getString("manga_slug"), rs.getInt("n")); });
		return out;
	}

	private static Set<String> genreSet(MangaDto m) {
		return m.genres() == null ? Set.of() : m.genres().stream().map(DiscoveryService::normalize).collect(Collectors.toSet());
	}

	private static int clamp(int v, int min, int max) {
		return Math.max(min, Math.min(max, v));
	}
}
