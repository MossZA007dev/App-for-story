type ReadingEntry = {
  part: { number: number };
  episode?: { number: number };
  scene: { id: string };
};

/** EP numbers restart in each season. Legacy scenes without an EP stand alone. */
export function adjacentEpisode(entries: ReadingEntry[], sceneId?: string) {
  const index = entries.findIndex(entry => entry.scene.id === sceneId);
  if (index < 0) return { previous: null, next: null };
  const sameEpisode = (a: ReadingEntry, b: ReadingEntry) =>
    a.part.number === b.part.number && a.episode && b.episode
      ? a.episode.number === b.episode.number
      : a.scene.id === b.scene.id;
  let start = index;
  while (start > 0 && sameEpisode(entries[start - 1], entries[index])) start--;
  let next = index + 1;
  while (next < entries.length && sameEpisode(entries[next], entries[index])) next++;
  let previous = start - 1;
  if (previous >= 0) {
    const last = entries[previous];
    while (previous > 0 && sameEpisode(entries[previous - 1], last)) previous--;
  }
  return {
    previous: previous >= 0 ? entries[previous] : null,
    next: entries[next] ?? null,
  };
}
