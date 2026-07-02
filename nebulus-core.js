/* ============================================================
   NEBULUS.CLUB — CORE
   Shared across all internal panel pages:
   auth (Google OAuth), Sheets API wrapper, formatters,
   modal helpers, toast, mobile drawer.

   Each page must define before calling NB.init():
     NB.afterLogin  -> function() {}  (page-specific: load data, show page UI)
     NB.afterLogout -> function() {}  (page-specific: hide page UI)
   ============================================================ */

const NB = {
  CLIENT_ID: '822341292552-9uont9j3sik7dqafjergu0sc4e3d4v9m.apps.googleusercontent.com',
  SHEET_ID: '1TaJk_4tSKXKXZnyG1lDTOif0ZauahG6rZnXibwyMqqE',
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
  ABA_E: 'Estoque',
  ABA_M: 'Movimentações',
  ABA_C: 'Clientes',

  accessToken: null,
  tokenClient: null,
  toastTimer: null,

  afterLogin: function(){},
  afterLogout: function(){}
};

/* ---------- AUTH ---------- */
function handleLogin(){
  NB.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: NB.CLIENT_ID,
    scope: NB.SCOPES,
    callback: async (r) => {
      if (r.error) { showToast('Erro: ' + r.error, true); return; }
      NB.accessToken = r.access_token;
      sessionStorage.setItem('nb_token', NB.accessToken);
      sessionStorage.setItem('nb_token_exp', Date.now() + 3500000);
      showApp();
      await NB.afterLogin();
    }
  });
  NB.tokenClient.requestAccessToken();
}

function renovarToken(){
  if (NB.tokenClient) NB.tokenClient.requestAccessToken({ prompt: '' });
}
setInterval(() => { if (NB.accessToken) renovarToken(); }, 50 * 60 * 1000);

function handleLogout(){
  if (NB.accessToken) google.accounts.oauth2.revoke(NB.accessToken, () => {});
  NB.accessToken = null;
  sessionStorage.removeItem('nb_token');
  sessionStorage.removeItem('nb_token_exp');
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogin) btnLogin.style.display = '';
  if (btnLogout) btnLogout.style.display = 'none';
  NB.afterLogout();
}

function showApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogin) btnLogin.style.display = 'none';
  if (btnLogout) btnLogout.style.display = '';
}

function nbTryRestoreSession(){
  const t = sessionStorage.getItem('nb_token');
  const exp = parseInt(sessionStorage.getItem('nb_token_exp') || '0');
  if (t && Date.now() < exp) {
    NB.accessToken = t;
    showApp();
    NB.afterLogin();
    return true;
  }
  return false;
}

/* ---------- SHEETS API ---------- */
async function api(path, opts = {}){
  const r = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + NB.SHEET_ID + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + NB.accessToken, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  return r.json();
}
async function sheetsGet(range){ return api('/values/' + encodeURIComponent(range)); }
async function sheetsUpdate(range, values){
  return api('/values/' + encodeURIComponent(range) + '?valueInputOption=USER_ENTERED', { method: 'PUT', body: JSON.stringify({ values }) });
}
async function sheetsAppend(range, values){
  return api('/values/' + encodeURIComponent(range) + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS', { method: 'POST', body: JSON.stringify({ values }) });
}
async function sheetsBatch(requests){
  return api(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests }) });
}

/* ---------- FORMATTERS ---------- */
function parseSheetsNum(v){
  if (v == null || v === '') return 0;
  const s = v.toString().trim();
  if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  if (s.includes(',')) return parseFloat(s.replace(',', '.')) || 0;
  return parseFloat(s) || 0;
}
function fmtBRL(v){ return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmt(v){ if (v == null || isNaN(v)) return '—'; return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function now(){ return new Date().toLocaleString('pt-BR'); }

/* ---------- MODAL HELPERS ---------- */
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

/* ---------- TOAST ---------- */
function showToast(msg, isError = false){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.classList.add('show');
  clearTimeout(NB.toastTimer);
  NB.toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ---------- CLIPBOARD ---------- */
async function copyToClipboard(text, label){
  try{
    await navigator.clipboard.writeText(text);
    showToast('✓ ' + (label ? label + ' copiado' : 'Copiado') + ' para a área de transferência');
    return true;
  }catch(e){
    showToast('Não foi possível copiar: ' + e.message, true);
    return false;
  }
}

/* ---------- MISC HELPERS (shared across pages) ---------- */
function normalize(s){ return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function today(){ return new Date().toISOString().split('T')[0]; }
function formatDate(iso){ if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }

const SVG_PENCIL = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M23 5v2h-1v1h-1v1h-1v1h-1V9h-1V8h-1V7h-1V6h-1V5h-1V4h1V3h1V2h1V1h2v1h1v1h1v1h1v1zm-6 5V9h-1V8h-1V7h-1V6h-2v1h-1v1h-1v1H9v1H8v1H7v1H6v1H5v1H4v1H3v1H2v1H1v6h6v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-2zm-2 2v1h-1v1h-1v1h-1v1h-1v1H9v1H8v1H7v1H3v-4h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1V9h1V8h2v1h1v1h1v2z"/></svg>`;
const SVG_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

/* ---------- PRICING (shared by Calculadora + Catálogo + Venda) ---------- */
function precoSugerido(val){ const i = Math.floor(val); const c = i + 0.90; return c >= val ? c : i + 1.90; }
const PERDA_DECANTACAO_PCT = 3; // % do frasco perdido no processo de decantação, embutido no custo/ml
function calcPriceDetail(preco, volume, embalagem, margem, taxa, ml){
  const volumeEfetivo = volume * (1 - PERDA_DECANTACAO_PCT / 100);
  const precoMl = preco / volumeEfetivo;
  const custoPerfume = precoMl * ml;
  const custoTotal = custoPerfume + embalagem;
  const precoComMargem = custoTotal / (1 - margem / 100);
  const precoFinal = precoComMargem / (1 - taxa / 100);
  const valorTaxa = precoFinal - precoComMargem;
  const lucroLiquido = precoComMargem - custoTotal;
  return { custoPerfume, custoTotal, precoComMargem, valorTaxa, precoFinal, lucroLiquido };
}

/* ---------- CALCULATOR CONFIG (persisted, requires explicit save) ---------- */
const NB_CONFIG_KEY = 'nb_calc_config';
const NB_CONFIG_DEFAULTS = { embalagem: 8, margens: { 3: 50, 5: 50, 8: 50, 10: 50 }, taxaAvista: 0.99, taxaCartao: 11.3 };
function getCalcConfig(){
  try {
    const raw = localStorage.getItem(NB_CONFIG_KEY);
    if (!raw) return { ...NB_CONFIG_DEFAULTS, margens: { ...NB_CONFIG_DEFAULTS.margens } };
    const parsed = JSON.parse(raw);
    const cfg = { ...NB_CONFIG_DEFAULTS, ...parsed };
    if (!parsed.margens && typeof parsed.margem === 'number') {
      cfg.margens = { 3: parsed.margem, 5: parsed.margem, 8: parsed.margem, 10: parsed.margem };
    } else {
      cfg.margens = { ...NB_CONFIG_DEFAULTS.margens, ...(parsed.margens || {}) };
    }
    delete cfg.margem;
    return cfg;
  } catch (e) { return { ...NB_CONFIG_DEFAULTS, margens: { ...NB_CONFIG_DEFAULTS.margens } }; }
}
function saveCalcConfig(cfg){ localStorage.setItem(NB_CONFIG_KEY, JSON.stringify(cfg)); }

/* ---------- GLOBAL SEARCH (shared topbar search across pages) ---------- */
function nbSrItemHTML(m, withDetalhe){
  return `<div class="sr-item">
    <span class="sr-type ${m.tipo === 'Entrada' ? 'sr-entrada' : 'sr-saida'}">${m.tipo === 'Entrada' ? 'Entrada' : 'Venda'}</span>
    <div class="sr-info"><div class="sr-name">${m.nome}${m.pedido ? ' · #' + m.pedido : ''}${m.cliente ? ' · ' + m.cliente : ''}</div><div class="sr-detail">${m.ml} ml${m.canal ? ' · ' + m.canal : ''} · ${m.dataHora}</div></div>
    <div class="sr-right"><div class="sr-val">${fmt(m.preco)}</div>${withDetalhe && m.tipo === 'Saída' ? `<button class="btn-info" onclick="openDetalhe(${m.rowIndex})">ℹ</button>` : ''}</div>
  </div>`;
}
function runGlobalSearch(q, movsArr, withDetalhe){
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
  const res = document.getElementById('searchResults');
  if (!res) return;
  if (!q.trim()) { res.classList.remove('open'); res.innerHTML = ''; return; }
  const nq = normalize(q);
  const found = (movsArr || []).filter(m =>
    normalize(m.nome).includes(nq) || normalize(m.pedido).includes(nq) || normalize(m.cliente).includes(nq) ||
    normalize(m.dataHora).includes(nq) || normalize(m.canal).includes(nq) || normalize(m.telefone).includes(nq) || normalize(m.email).includes(nq)
  ).reverse().slice(0, 20);
  res.innerHTML = !found.length ? '<div class="sr-empty">Nenhum resultado.</div>' : found.map(m => nbSrItemHTML(m, withDetalhe)).join('');
  res.classList.add('open');
}
function clearGlobalSearch(){
  const input = document.getElementById('globalSearch'); if (input) input.value = '';
  const clearBtn = document.getElementById('searchClear'); if (clearBtn) clearBtn.style.display = 'none';
  const res = document.getElementById('searchResults'); if (res) { res.classList.remove('open'); res.innerHTML = ''; }
}

/* ---------- MOBILE DRAWER ---------- */
function nbInitDrawer(){
  const overlay = document.getElementById('nbDrawerOverlay');
  const burger = document.getElementById('nbBurger');
  const closeBtn = document.getElementById('nbDrawerClose');
  if (!overlay || !burger) return;
  burger.addEventListener('click', () => overlay.classList.add('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
}

/* ---------- BOOT ---------- */
window.addEventListener('load', () => {
  nbInitDrawer();
  nbTryRestoreSession();
});
