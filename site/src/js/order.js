// One game order for the whole site: the featured games first (in their
// featured order: Wildlings, Magic Mineral, Storm Alert), then Legendary
// games, then grouped by category in the order of games.json "categories"
// (PC / Steam, Gamification, Mobile, Jams, Web games), newest first inside
// each group. The deck's All tab and the next/previous links on game pages
// both use it. A game's first category is its own: it sets its colour tint and
// its place here. A second category only puts it on that shelf as well.
import data from '../data/games.json';

const rank = new Map(data.categories.map((c, i) => [c.id, i]));

export const primaryCat = (g) => g.categories?.[0] ?? '';

export const byCategory = (games) =>
  [...games].sort(
    (a, b) =>
      (a.featured ?? 99) - (b.featured ?? 99) ||
      (a.rarity === 'legendary' ? 0 : 1) - (b.rarity === 'legendary' ? 0 : 1) ||
      (rank.get(primaryCat(a)) ?? 99) - (rank.get(primaryCat(b)) ?? 99) ||
      (b.year ?? 0) - (a.year ?? 0) ||
      a.title.localeCompare(b.title),
  );
