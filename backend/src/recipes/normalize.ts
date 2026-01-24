export function normalizeIngredientName(input: string): string {
  const raw = (input || '').toString().toLowerCase();
  const noParens = raw.replace(/\([^)]*\)/g, ' ');
  const noPunct = noParens.replace(/[^a-z0-9\s]/g, ' ');
  const collapsed = noPunct.replace(/\s+/g, ' ').trim();

  // Very light singularization to help "tomatoes" vs "tomato".
  // Keep it conservative to avoid harming words like "bass".
  if (collapsed.endsWith('ies') && collapsed.length > 4) {
    return collapsed.slice(0, -3) + 'y';
  }
  if (collapsed.endsWith('es') && collapsed.length > 4) {
    return collapsed.slice(0, -2);
  }
  if (collapsed.endsWith('s') && collapsed.length > 3 && !collapsed.endsWith('ss')) {
    return collapsed.slice(0, -1);
  }

  return collapsed;
}

export function ingredientSignature(names: string[]): string {
  const normalized = (names || [])
    .map(normalizeIngredientName)
    .filter(Boolean);

  const uniqueSorted = Array.from(new Set(normalized)).sort();
  return uniqueSorted.join('|');
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const x of a) {
    if (b.has(x)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
