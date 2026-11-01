// Fourteen rotating configurations; the seed and historical fingerprints vary actual questions.
export const plans = Array.from({ length: 14 }, (_, i) => [
  ["axis", "absolute", "compare", "sum"][i % 4],
  [
    "fraction",
    "coefficient",
    "bracket",
    "substitute",
    "polynomial",
    "square",
    "product",
  ][i % 7],
  [
    "polynomial",
    "fraction",
    "substitute",
    "coefficient",
    "bracket",
    "product",
    "square",
  ][(i + 2) % 7],
  i % 2 ? "order" : "coefficient",
  i % 2 ? "clip" : "resources",
]);
