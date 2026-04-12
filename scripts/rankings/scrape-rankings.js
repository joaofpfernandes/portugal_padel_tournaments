const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'https://tour.tiesports.com/fpp/weekly_rankings';
const TABLE_SEL = '#panel_page_rankings table';
const ROW_SEL = '[id*="_td_vars_0"]';

async function extractRows(page) {
  return page.evaluate(() => {
    const table = document.querySelector('#panel_page_rankings table');
    if (!table) return [];
    return Array.from(table.querySelectorAll('tbody tr')).map(row => {
      if (!row.querySelector('[id*="_lbl_position_"]')) return null;
      const get = sel => { const el = row.querySelector(sel); return el ? el.innerText.trim() : ''; };
      const tdVars = row.querySelector('[id*="_td_vars_"]');
      const movesNum = get('[id*="_lbl_moves_number_"]');
      const isUp = !!row.querySelector('[id*="_lbl_moves_up_"]');
      const isDown = !!row.querySelector('[id*="_lbl_moves_down_"]');
      const rankingChange = movesNum === '' || movesNum === '-' ? '-'
        : isDown ? `-${movesNum}`
        : isUp ? movesNum
        : '-';
      return {
        Ranking:                  get('[id*="_lbl_position_"]'),
        RankingChange:            rankingChange,
        LicenceNumber:            get('[id*="_lbl_license_"]'),
        Name:                     get('[id*="_lbl_player_"]'),
        Points:                   get('[id*="_lbl_points_"]'),
        Club:                     get('[id*="_lbl_club_"]'),
        Level:                    get('[id*="_lbl_level_"]'),
        AgeType:                  get('[id*="_lbl_age_group_"]'),
        NumberOfValidTournaments: get('[id*="_lbl_tournaments_"]'),
        PlayerID:                 tdVars ? tdVars.getAttribute('CODPLY') : '',
      };
    }).filter(Boolean);
  });
}

async function postBack(page, target) {
  const prevPager = await page.evaluate(() => document.querySelector('#DataPager_ranking_players')?.innerHTML || '');
  await page.evaluate(`__doPostBack("${target}","")`);
  await page.waitForFunction(
    p => (document.querySelector('#DataPager_ranking_players')?.innerHTML || '') !== p,
    { timeout: 15000 }, prevPager
  ).catch(() => {});
  await page.waitForSelector('[id*="_td_vars_0"]', { timeout: 15000 });
}

async function scrapeToFile(page, outPath) {
  const tmpPath = outPath + '.tmp';
  const stream = fs.createWriteStream(tmpPath);
  const today = new Date().toISOString().slice(0, 10);
  stream.write(`{"date":"${today}","rankings":[\n`);

  let total = 0;
  let first = true;

  const writeRows = async () => {
    const rows = await extractRows(page);
    for (const row of rows) {
      stream.write((first ? '' : ',\n') + JSON.stringify(row));
      first = false;
    }
    total += rows.length;
    process.stdout.write(`\r    ${total} players...`);
    return rows.length;
  };

  // Page 1 already loaded
  await writeRows();

  let lastScrapedPage = 1;

  while (true) {
    const { activePage, nextPage, dotsTarget } = await page.evaluate(() => {
      const pager = document.querySelector('#DataPager_ranking_players');
      const activePage = parseInt(pager?.querySelector('span.active')?.innerText.trim() || '0');
      const allAnchors = Array.from(pager?.querySelectorAll('a') || []);
      const numbered = allAnchors
        .filter(a => /^\d+$/.test(a.innerText.trim()))
        .map(a => ({ pageNum: parseInt(a.innerText.trim()), target: (a.href.match(/__doPostBack\('([^']+)'/) || [])[1] || null }))
        .filter(x => x.target && x.pageNum > activePage)
        .sort((a, b) => a.pageNum - b.pageNum);
      const nextPage = numbered[0] || null;
      const lastNumberedAnchor = allAnchors.filter(a => /^\d+$/.test(a.innerText.trim())).slice(-1)[0];
      const lastNumberedIdx = lastNumberedAnchor ? allAnchors.indexOf(lastNumberedAnchor) : -1;
      const trailingDots = allAnchors.slice(lastNumberedIdx + 1).find(a => a.innerText.trim() === '...');
      const dotsTarget = trailingDots ? (trailingDots.href.match(/__doPostBack\('([^']+)'/) || [])[1] || null : null;
      return { activePage, nextPage, dotsTarget };
    });

    if (nextPage && nextPage.pageNum > lastScrapedPage) {
      await postBack(page, nextPage.target);
      lastScrapedPage = nextPage.pageNum;
      await writeRows();
    } else if (dotsTarget) {
      await postBack(page, dotsTarget);
      const landedPage = await page.evaluate(() =>
        parseInt(document.querySelector('#DataPager_ranking_players span.active')?.innerText.trim() || '0')
      );
      if (landedPage <= lastScrapedPage) break;
      lastScrapedPage = landedPage;
      await writeRows();
    } else {
      break;
    }
  }

  stream.write('\n]}');
  await new Promise((res, rej) => stream.end(err => err ? rej(err) : res()));
  fs.copyFileSync(tmpPath, outPath);
  fs.unlinkSync(tmpPath);
  console.log(`\r    ${total} players total`);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#repeater_rankings_top_10_link_load_more_men_0', { timeout: 15000 });
  await page.evaluate('__doPostBack("repeater_rankings_top_10$ctl00$link_load_more_men","")');
  await page.waitForSelector(TABLE_SEL, { timeout: 15000 });

  for (const [gender, genderValue] of [['male', '1'], ['female', '2']]) {
    console.log(`\n→ Scraping ${gender}...`);

    if (genderValue !== '1') {
      const prevPager = await page.evaluate(() => document.querySelector('#DataPager_ranking_players')?.innerHTML || '');
      await page.evaluate(`
        document.querySelector('#drop_filter_rankings_gender').value = '${genderValue}';
        __doPostBack('drop_filter_rankings_gender','');
      `);
      await page.waitForFunction(
        p => (document.querySelector('#DataPager_ranking_players')?.innerHTML || '') !== p,
        { timeout: 15000 }, prevPager
      );
      await page.waitForSelector(ROW_SEL, { timeout: 15000 });
    } else {
      await page.evaluate('__doPostBack("btn_filter_rankings","")');
      await page.waitForSelector(ROW_SEL, { timeout: 15000 });
    }

    const outDir = path.resolve(__dirname, `../../data/rankings/${gender}`);
    fs.mkdirSync(outDir, { recursive: true });
    await scrapeToFile(page, path.join(outDir, 'latest.json'));
    console.log(`  Saved data/rankings/${gender}/latest.json`);
  }

  await browser.close();
  console.log('\n✅ Done.');
})().catch(e => { console.error(e.message); process.exit(1); });
