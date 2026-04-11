// run-all.js
// Runs at 9am/9pm UTC via GitHub Actions.
// For every tournament active within 31 days of its start_date that has a fpp_data.link,
// scrapes all available Secções and generates draws for sizes [6, 32, 64].
// Results saved to data/draws/{slug}__{section}__{drawSize}.json

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const DRAW_SIZES = [16, 32, 64];
const RANKINGS_URL_MALE   = "https://raw.githubusercontent.com/ricardowth/portugal_padel_tournaments/refs/heads/main/data/rankings/male/latest.json";
const RANKINGS_URL_FEMALE = "https://raw.githubusercontent.com/ricardowth/portugal_padel_tournaments/refs/heads/main/data/rankings/female/latest.json";

// FPP table 10.8.8
const DRAW_TABLE = {
  16: { direct: 12, seeds: 4, qualy: 4 },
  32: { direct: 24, seeds: 8, qualy: 8 },
  64: { direct: 48, seeds: 16, qualy: 16 },
};
function drawConfig(n) {
  return (
    DRAW_TABLE[n] || {
      direct: Math.floor(n * 0.75),
      seeds: Math.floor(n / 4),
      qualy: Math.floor(n * 0.25),
    }
  );
}

function normName(s) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}
function parsePoints(str) {
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}
function parseLevel(str) {
  const m = String(str || "").match(/(\d+)/);
  return m ? parseInt(m[1]) : 99;
}
function getPlayerInfo(name, club, rankings) {
  const key = normName(name);
  const matches = rankings.filter((r) => normName(r.Name) === key);
  if (!matches.length) return { points: 0, level: 6, license: '', playerId: '' };
  if (matches.length === 1) return { points: parsePoints(matches[0].Points), level: parseLevel(matches[0].Level), license: matches[0].LicenceNumber || '', playerId: matches[0].PlayerID || '' };
  const clubMatch = matches.find((r) => r.Club?.toLowerCase().trim() === club.toLowerCase().trim());
  if (clubMatch) return { points: parsePoints(clubMatch.Points), level: parseLevel(clubMatch.Level), license: clubMatch.LicenceNumber || '', playerId: clubMatch.PlayerID || '' };
  return { points: 0, level: 6, license: '', playerId: '' };
}

// FPP 10.4.5/10.4.6 priority — lower = higher priority
function pairPriority(l1, l2, T) {
  const a1 = l1 === T,
    a2 = l2 === T;
  const b1 = l1 === T + 1,
    b2 = l2 === T + 1;
  if (a1 && a2) return 0;
  if ((a1 && b2) || (a2 && b1)) return 1;
  if (b1 && b2) return 2;
  if (a1 || a2) return 3;
  return 4;
}

function tournamentSlug(link) {
  const m = link.match(/\/[Tt]ournaments\/([^/?#]+)/);
  return m ? m[1] : null;
}

function isActive(t) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(t.start_date);
  const diffDays = (start - today) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 31;
}

function safeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

async function getSections(browser, slug) {
  const page = await browser.newPage();
  try {
    await page.goto(`https://fpp.tiepadel.com/Tournaments/${slug}/Players`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    return await page.$$eval("#drop_filter_all_players option", (opts) =>
      opts
        .filter((o) => o.value && o.value !== "0")
        .map((o) => ({ value: o.value, text: o.text.trim() })),
    );
  } catch (e) {
    console.warn(`  getSections failed for ${slug}: ${e.message}`);
    return [];
  } finally {
    await page.close();
  }
}

async function scrapePlayers(browser, slug, sectionValue) {
  const page = await browser.newPage();
  try {
    await page.goto(`https://fpp.tiepadel.com/Tournaments/${slug}/Players`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.select("#drop_filter_all_players", sectionValue);
    await page.click("#link_find_all_players");
    await page.waitForNetworkIdle({ idleTime: 800 });
    await page.waitForSelector("#grid_all_players_ctl00 tbody tr", {
      timeout: 15000,
    });

    const all = [];
    while (true) {
      const rows = await page.$$eval(
        "#grid_all_players_ctl00 tbody tr",
        (rows) =>
          rows
            .map((row) => {
              const cells = Array.from(row.querySelectorAll("td")).filter(
                (td) => td.style.display !== "none",
              );
              if (cells.length < 3) return null;
              const hasStatus =
                cells[0]?.innerText.trim().length > 0 &&
                !cells[0]?.innerText.includes(" parceiro de ");
              return {
                player: cells[hasStatus ? 1 : 0]?.innerText.trim(),
                club: cells[hasStatus ? 2 : 1]?.innerText.trim(),
              };
            })
            .filter(Boolean),
      );
      all.push(...rows);
      const pageInfo = await page
        .$eval(".rgInfoPart", (el) => el.innerText.trim())
        .catch(() => "");
      const match = pageInfo.match(/(\d+) items in (\d+) pages/);
      if (!match) break;
      const cur = await page
        .$eval(".rgCurrentPage", (el) => parseInt(el.innerText.trim()))
        .catch(() => 1);
      if (cur >= parseInt(match[2])) break;
      await page.click(".rgPageNext");
      await page.waitForNetworkIdle({ idleTime: 800 });
    }
    return all;
  } catch (e) {
    console.warn(`  scrapePlayers failed: ${e.message}`);
    return [];
  } finally {
    await page.close();
  }
}

function buildDraw(rawPlayers, drawSize, rankings, tournamentLevel) {
  const { direct, seeds, qualy } = drawConfig(drawSize);
  const T = parseLevel(tournamentLevel);
  const playerClub = new Map();

  for (const row of rawPlayers) {
    const p1 = row.player.split(" parceiro de ")[0]?.trim();
    if (p1) playerClub.set(normName(p1), row.club);
  }

  const seen = new Set();
  const pairs = [];
  for (const row of rawPlayers) {
    const [p1, p2] = row.player.split(" parceiro de ").map((s) => s?.trim());
    if (!p1 || !p2) continue;
    const key = [normName(p1), normName(p2)].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const club1 = playerClub.get(normName(p1)) || row.club;
    const club2 = playerClub.get(normName(p2)) || row.club;
    const info1 = getPlayerInfo(p1, club1, rankings);
    const info2 = getPlayerInfo(p2, club2, rankings);
    pairs.push({
      p1,
      p2,
      club: row.club,
      lic1: info1.license, pid1: info1.playerId,
      pts1: info1.points,
      lvl1: info1.level,
      lic2: info2.license, pid2: info2.playerId,
      pts2: info2.points,
      lvl2: info2.level,
      total: info1.points + info2.points,
      priority: pairPriority(info1.level, info2.level, T),
    });
  }

  pairs.sort((a, b) => a.priority - b.priority || b.total - a.total);

  const label = (arr, tag) =>
    arr.map((p, i) => ({
      pos: i + 1,
      draw: tag,
      p1: p.p1, lic1: p.lic1, pid1: p.pid1,
      p2: p.p2, lic2: p.lic2, pid2: p.pid2,
      club: p.club,
      pts1: p.pts1, lvl1: p.lvl1,
      pts2: p.pts2, lvl2: p.lvl2,
      total: p.total,
      note: tag === "MAIN" && i < seeds ? `Seed ${i + 1}` : "",
    }));

  return [
    ...label(pairs.slice(0, direct), "MAIN"),
    ...label(pairs.slice(direct, direct + qualy), "QUALY"),
    ...label(pairs.slice(direct + qualy), "OUT"),
  ];
}

(async () => {
  // Load tournaments (strip the window.tournamentsData = assignment)
  const tournamentsRaw = fs.readFileSync(
    path.resolve(__dirname, "../../data/tournaments.js"),
    "utf8",
  );
  const tournaments = eval(
    tournamentsRaw.replace("window.tournamentsData =", ""),
  );

  const active = tournaments.filter(
    (t) => {
      const fpp = t.fpp_data;
      if (Array.isArray(fpp)) return fpp.some(r => r.link?.includes("fpp.tiepadel.com")) && isActive(t);
      return fpp?.link?.includes("fpp.tiepadel.com") && isActive(t);
    }
  );
  console.log(`Active tournaments (within 21 days): ${active.length}`);

  if (!active.length) {
    console.log("Nothing to do.");
    return;
  }

  console.log("Fetching rankings...");
  const [{ rankings: rankingsMale }, { rankings: rankingsFemale }] = await Promise.all([
    fetch(RANKINGS_URL_MALE).then(r => r.json()),
    fetch(RANKINGS_URL_FEMALE).then(r => r.json()),
  ]);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const drawsDir = path.resolve(__dirname, "../../data/draws");
  fs.mkdirSync(drawsDir, { recursive: true });

  for (const t of active) {
    const fppEntries = Array.isArray(t.fpp_data) ? t.fpp_data : [t.fpp_data];

    for (const fpp of fppEntries) {
      if (!fpp?.link?.includes("fpp.tiepadel.com")) continue;
      const slug = tournamentSlug(fpp.link);
      if (!slug) { console.warn(`No slug for: ${t.name}`); continue; }

      const tournamentName = fpp.region ? `${t.name} - ${fpp.region}` : t.name;
      console.log(`\n→ ${tournamentName} [${slug}]`);
      const sections = await getSections(browser, slug);
      if (!sections.length) { console.warn("  No sections, skipping."); continue; }
      console.log(`  Sections: ${sections.map((s) => s.text).join(" | ")}`);

      for (const section of sections) {
        console.log(`  [${section.text}] scraping...`);
        const rawPlayers = await scrapePlayers(browser, slug, section.value);
        if (!rawPlayers.length) { console.warn("  No players, skipping."); continue; }

        const isFemale = /feminino/i.test(section.text);
        const rankings = isFemale ? rankingsFemale : rankingsMale;

        for (const drawSize of DRAW_SIZES) {
          const result = buildDraw(rawPlayers, drawSize, rankings, fpp.level || "");
          const filename = `${safeFilename(slug)}__${safeFilename(section.text)}__${drawSize}.json`;
          fs.writeFileSync(
            path.join(drawsDir, filename),
            JSON.stringify({ tournament: tournamentName, slug, section: section.text, drawSize, generatedAt: new Date().toISOString(), result }, null, 2)
          );
          const main = result.filter((r) => r.draw === "MAIN").length;
          const ql = result.filter((r) => r.draw === "QUALY").length;
          const out = result.filter((r) => r.draw === "OUT").length;
          console.log(`    draw ${drawSize}: ${main} main / ${ql} qualy / ${out} out → ${filename}`);
        }
      }
    }
  }

  await browser.close();

  // Write manifest index
  const allFiles = fs.readdirSync(drawsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  const index = {};
  for (const file of allFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(drawsDir, file), 'utf8'));
    const { tournament, slug, section, drawSize } = data;
    if (!index[slug]) index[slug] = { tournament, slug, sections: {} };
    if (!index[slug].sections[section]) index[slug].sections[section] = [];
    if (!index[slug].sections[section].includes(drawSize)) index[slug].sections[section].push(drawSize);
  }
  fs.writeFileSync(path.join(drawsDir, 'index.json'), JSON.stringify(Object.values(index), null, 2));
  console.log('  index.json written.');

  console.log("\n✅ Done.");
})();
