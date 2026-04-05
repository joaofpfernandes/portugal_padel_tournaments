/**
 * Level point thresholds for male and female padel players.
 *
 * Each array entry represents the minimum number of points required
 * to reach that level. Levels are ordered from highest (Nível 1) to
 * lowest (Nível 6). The values are placeholders and can be adjusted
 * as official thresholds change.
 *
 * Format: { level: <number>, label: <string>, minPoints: <number> }
 */

window.MALE_LEVEL_THRESHOLDS = [
  { level: 1, label: "Nível 1", minPoints: 39000 },
  { level: 2, label: "Nível 2", minPoints: 10500 },
  { level: 3, label: "Nível 3", minPoints: 4250 },
  { level: 4, label: "Nível 4", minPoints: 2120 },
  { level: 5, label: "Nível 5", minPoints: 1150 },
  { level: 6, label: "Nível 6", minPoints: 0 },
];

window.FEMALE_LEVEL_THRESHOLDS = [
  { level: 1, label: "Nível 1", minPoints: 30650 },
  { level: 2, label: "Nível 2", minPoints: 10900 },
  { level: 3, label: "Nível 3", minPoints: 4280 },
  { level: 4, label: "Nível 4", minPoints: 1995 },
  { level: 5, label: "Nível 5", minPoints: 1080 },
  { level: 6, label: "Nível 6", minPoints: 0 },
];
