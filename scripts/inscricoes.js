/* globals tournamentsData */

const DRAWS_BASE = '../data/draws/';

function levelPrefix(section) {
  return /feminino/i.test(section) ? 'F' : 'M';
}

function openResultTab(data) {
  const { tournament, section, result, generatedAt } = data;
  const prefix = levelPrefix(section);

  const rows = result.map(r => `
    <tr>
      <td>${r.pos}</td>
      <td>${r.pid1 ? `<a href="https://www.tiepadel.com/Dashboard.aspx?id=${r.pid1}" target="_blank">${r.p1}</a>` : r.p1} / ${r.pid2 ? `<a href="https://www.tiepadel.com/Dashboard.aspx?id=${r.pid2}" target="_blank">${r.p2}</a>` : r.p2}</td>
      <td>${r.club}</td>
      <td style="text-align:right">${r.pts1.toFixed(2)} <span style="font-size:11px;color:#6b7280">${prefix}${r.lvl1 === 99 ? 6 : r.lvl1}</span></td>
      <td style="text-align:right">${r.pts2.toFixed(2)} <span style="font-size:11px;color:#6b7280">${prefix}${r.lvl2 === 99 ? 6 : r.lvl2}</span></td>
      <td style="text-align:right"><strong>${r.total.toFixed(2)}</strong></td>
    </tr>`).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8">
<title>${tournament} — ${section}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',system-ui,sans-serif;background:#f5f6fa;color:#1a1a2e;line-height:1.5}
  .header{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:white;padding:1.5rem 2rem;border-bottom:4px solid #d4af37}
  .header h1{font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:0.25rem}
  .header .meta{font-size:0.8rem;color:#cbd5e1}
  .container{max-width:1100px;margin:1.5rem auto;padding:0 1.5rem}
  .card{background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  table{border-collapse:collapse;width:100%}
  th{background:#f9fafb;color:#6b7280;padding:9px 12px;text-align:left;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb}
  td{padding:8px 12px;font-size:0.82rem;border-bottom:1px solid #f3f4f6}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#f9fafb}
  a{color:#1565c0;text-decoration:none}
  a:hover{text-decoration:underline}
</style></head><body>
<div class="header">
  <h1>🎾 ${tournament}</h1>
  <div class="meta">Secção: <strong>${section}</strong> &middot; Gerado: ${new Date(generatedAt).toLocaleString('pt-PT')}</div>
</div>
<div class="container">
  <div class="card">
    <table>
      <thead><tr><th>#</th><th>Par</th><th>Clube</th><th>Pts P1</th><th>Pts P2</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>
</body></html>`);
  win.document.close();
}

function safeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

async function buildTournamentList() {
  const list = document.getElementById('tournamentList');

  let index;
  try {
    const res = await fetch(DRAWS_BASE + 'index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    index = await res.json();
  } catch (e) {
    list.innerHTML = `<p class="err">Erro ao carregar quadros: ${e.message}</p>`;
    return;
  }

  if (!index.length) {
    list.innerHTML = '<p class="hint">Nenhum torneio com quadros disponíveis.</p>';
    return;
  }

  // Group regional tournaments (name contains ' - ') under their parent
  const grouped = [];
  const parentMap = {};
  index.forEach(t => {
    const dashIdx = t.tournament.lastIndexOf(' - ');
    if (dashIdx === -1) {
      grouped.push({ ...t, regions: null });
    } else {
      const parent = t.tournament.slice(0, dashIdx);
      const region = t.tournament.slice(dashIdx + 3);
      if (!parentMap[parent]) {
        parentMap[parent] = { tournament: parent, slug: null, sections: [], regions: [] };
        grouped.push(parentMap[parent]);
      }
      parentMap[parent].regions.push({ region, slug: t.slug, sections: t.sections });
    }
  });

  list.innerHTML = grouped.map((t, i) => {
    if (t.regions) {
      const regionOpts = t.regions.map(r => `<option value="${r.region}">${r.region}</option>`).join('');
      const firstRegion = t.regions[0];
      const sectionOpts = firstRegion.sections.map(s => `<option value="${s}">${s}</option>`).join('');
      const regionsData = btoa(unescape(encodeURIComponent(JSON.stringify(t.regions))));
      return `
      <div class="t-row" id="trow-${i}">
        <div><div class="t-name">${t.tournament}</div></div>
        <div class="t-controls">
          <div class="t-control-group">
            <label>Região</label>
            <select id="rgn-${i}" data-regions="${regionsData}" onchange="updateRegion(${i})" title="Região">${regionOpts}</select>
          </div>
          <div class="t-control-group">
            <label>Categoria</label>
            <select id="sec-${i}" title="Secção">${sectionOpts}</select>
          </div>
          <button class="btn-gen" onclick="generate(${i})">Ver</button>
        </div>
      </div>`;
    } else {
      const sectionOpts = t.sections.map(s => `<option value="${s}">${s}</option>`).join('');
      return `
      <div class="t-row" id="trow-${i}">
        <div><div class="t-name">${t.tournament}</div></div>
        <div class="t-controls">
          <div class="t-control-group">
            <label>Categoria</label>
            <select id="sec-${i}" title="Secção">${sectionOpts}</select>
          </div>
          <button class="btn-gen" onclick="generate(${i})">Ver</button>
        </div>
      </div>`;
    }
  }).join('');

  window._drawIndex = grouped;
}

window.updateRegion = function(i) {
  const regionSel = document.getElementById(`rgn-${i}`);
  const regions = JSON.parse(decodeURIComponent(escape(atob(regionSel.dataset.regions))));
  const region = regions.find(r => r.region === regionSel.value);
  if (!region) return;
  document.getElementById(`sec-${i}`).innerHTML = region.sections.map(s => `<option value="${s}">${s}</option>`).join('');
};

window.generate = async function(i) {
  const t = window._drawIndex[i];
  const section = document.getElementById(`sec-${i}`).value;
  const btn = document.querySelector(`#trow-${i} .btn-gen`);

  let slug = t.slug;
  if (t.regions) {
    const regionSel = document.getElementById(`rgn-${i}`);
    const regions = JSON.parse(decodeURIComponent(escape(atob(regionSel.dataset.regions))));
    const region = regions.find(r => r.region === regionSel.value);
    slug = region ? region.slug : null;
  }
  if (!slug) return;

  btn.disabled = true;
  btn.textContent = 'A carregar...';

  try {
    const filename = `${safeFilename(slug)}__${safeFilename(section)}.json`;
    const data = await fetch(DRAWS_BASE + filename).then(r => r.json());
    openResultTab(data);
  } catch (e) {
    alert(`Erro ao carregar quadro: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ver';
  }
};

buildTournamentList();
