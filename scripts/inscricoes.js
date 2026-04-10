/* globals tournamentsData */

const DRAWS_BASE = '../data/draws/';

function levelPrefix(section) {
  return /feminino/i.test(section) ? 'F' : 'M';
}

function openResultTab(data, selectedDrawSize) {
  const { tournament, section, result, generatedAt } = data;
  const drawSize = selectedDrawSize;
  const prefix = levelPrefix(section);
  const colors = { MAIN: '#d4edda', QUALY: '#fff3cd', OUT: '#f8d7da' };
  const badge  = { MAIN: '#28a745', QUALY: '#856404', OUT: '#721c24' };

  const rows = result.map(r => `
    <tr style="background:${colors[r.draw]}">
      <td>${r.pos}</td>
      <td><span style="background:${badge[r.draw]};color:#fff;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700">${r.draw}</span></td>
      <td>${r.p1} / ${r.p2}</td>
      <td>${r.club}</td>
      <td style="text-align:right">${r.pts1.toFixed(2)} <span style="font-size:11px;color:#666">${prefix}${r.lvl1 === 99 ? 6 : r.lvl1}</span></td>
      <td style="text-align:right">${r.pts2.toFixed(2)} <span style="font-size:11px;color:#666">${prefix}${r.lvl2 === 99 ? 6 : r.lvl2}</span></td>
      <td style="text-align:right"><strong>${r.total.toFixed(2)}</strong></td>
      <td>${r.note ? `<span style="background:#1565c0;color:#fff;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700">${r.note}</span>` : ''}</td>
    </tr>`).join('');

  const main = result.filter(r => r.draw === 'MAIN').length;
  const ql   = result.filter(r => r.draw === 'QUALY').length;
  const out  = result.filter(r => r.draw === 'OUT').length;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8">
<title>${tournament} — ${section}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;background:#f5f5f5;color:#222}
  h1{margin-bottom:4px;font-size:1.3rem}
  .meta{color:#666;font-size:13px;margin-bottom:16px}
  .pills{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
  .pill{padding:8px 16px;border-radius:8px;color:#fff;font-weight:700;font-size:13px}
  table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)}
  th{background:#1e293b;color:#fff;padding:9px 12px;text-align:left;font-size:13px}
  td{padding:8px 12px;font-size:13px;border-bottom:1px solid rgba(0,0,0,.05)}
</style></head><body>
<h1>🎾 ${tournament}</h1>
<div class="meta">Secção: <strong>${section}</strong> · Quadro: <strong>${drawSize}</strong> · Gerado: ${new Date(generatedAt).toLocaleString('pt-PT')}</div>
<div class="pills">
  <span class="pill" style="background:#28a745">✅ Quadro Principal: ${main}</span>
  <span class="pill" style="background:#856404">⚡ Qualificação: ${ql}</span>
  <span class="pill" style="background:#721c24">❌ Fora: ${out}</span>
  <span class="pill" style="background:#1565c0">👥 Total Pares: ${result.length}</span>
</div>
<table>
  <thead><tr><th>#</th><th>Draw</th><th>Par</th><th>Clube</th><th>Pts P1</th><th>Pts P2</th><th>Total</th><th>Nota</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
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

  list.innerHTML = index.map((t, i) => {
    const sections = Object.keys(t.sections);
    const sectionOpts = sections.map(s => `<option value="${s}">${s}</option>`).join('');
    const firstSection = sections[0];
    const drawSizes = (t.sections[firstSection] || []).slice().sort((a, b) => a - b);
    const drawOpts = drawSizes.map(d => `<option value="${d}">${d}</option>`).join('');

    return `
    <div class="t-row" id="trow-${i}">
      <div>
        <div class="t-name">${t.tournament}</div>
      </div>
      <div class="t-controls">
        <select id="sec-${i}" onchange="updateDrawSizes(${i})" title="Secção">${sectionOpts}</select>
        <select id="draw-${i}" title="Tamanho do quadro">${drawOpts}</select>
        <button class="btn-gen" onclick="generate(${i})">Ver</button>
      </div>
    </div>`;
  }).join('');

  window._drawIndex = index;
}

window.updateDrawSizes = function(i) {
  const t = window._drawIndex[i];
  const section = document.getElementById(`sec-${i}`).value;
  const sizes = (t.sections[section] || []).slice().sort((a, b) => a - b);
  document.getElementById(`draw-${i}`).innerHTML = sizes.map(d => `<option value="${d}">${d}</option>`).join('');
};

window.generate = async function(i) {
  const t = window._drawIndex[i];
  const section  = document.getElementById(`sec-${i}`).value;
  const drawSize = document.getElementById(`draw-${i}`).value;
  const btn = document.querySelector(`#trow-${i} .btn-gen`);

  btn.disabled = true;
  btn.textContent = 'A carregar...';

  try {
    const filename = `${safeFilename(t.slug)}__${safeFilename(section)}__${drawSize}.json`;
    const data = await fetch(DRAWS_BASE + filename).then(r => r.json());
    openResultTab(data, parseInt(drawSize));
  } catch (e) {
    alert(`Erro ao carregar quadro: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ver';
  }
};

buildTournamentList();
