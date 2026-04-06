/**
 * Level position cutoffs for male and female padel players.
 *
 * Each entry defines the maximum ranking position that qualifies
 * for that level. The actual point thresholds are calculated at
 * runtime from the rankings data by looking up the points of the
 * player at the cutoff position.
 *
 * Format: { level: <number>, label: <string>, maxPosition: <number> }
 *
 * Level 6 has no position cap – it includes everyone not covered
 * by the levels above.
 */

window.MALE_LEVEL_POSITIONS = [
  { level: 1, label: "M1", maxPosition: 64 },
  { level: 2, label: "M2", maxPosition: 250 },
  { level: 3, label: "M3", maxPosition: 500 },
  { level: 4, label: "M4", maxPosition: 750 },
  { level: 5, label: "M5", maxPosition: 1000 },
  { level: 6, label: "M6", maxPosition: null },
];

window.FEMALE_LEVEL_POSITIONS = [
  { level: 1, label: "F1", maxPosition: 64 },
  { level: 2, label: "F2", maxPosition: 150 },
  { level: 3, label: "F3", maxPosition: 300 },
  { level: 4, label: "F4", maxPosition: 450 },
  { level: 5, label: "F5", maxPosition: 600 },
  { level: 6, label: "F6", maxPosition: null },
];
