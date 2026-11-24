// Dashboard do painel: gráficos com os números do site (acessos, mensagens),
// do portfólio (projetos, ODS, notas), dos eventos, do impacto em sala de
// aula, das competições, das ferramentas e das escolas. Lê o Firestore
// (só leitura, com o login do admin) e o data/profile.json. Os gráficos são
// SVG feitos à mão, sem biblioteca, e cada um tem a tabela com os números.
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const STATUS = {
  approved: { rotulo: "Aprovados", cls: "ok" },
  pending: { rotulo: "Pendentes", cls: "warn" },
  rejected: { rotulo: "Reprovados", cls: "bad" },
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => new Intl.NumberFormat("pt-BR").format(v);
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

function paraNumero(valor) {
  const n = parseInt(String(valor).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function chaveMes(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function rotuloMes(chave) {
  const [a, m] = chave.split("-");
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}
function ultimosMeses(n, fim = new Date()) {
  const lista = [];
  for (let i = n - 1; i >= 0; i--) lista.push(chaveMes(new Date(fim.getFullYear(), fim.getMonth() - i, 1)));
  return lista;
}
function dataDe(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------------------------------------------------------
   Tooltip único, compartilhado por todos os gráficos
   --------------------------------------------------------- */
let tip;
function ligarTooltip(raiz) {
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "dash-tip";
    tip.hidden = true;
    document.body.appendChild(tip);
  }
  const mostrar = (alvo, x, y) => {
    tip.innerHTML = alvo.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(8, y - r.height - 12)}px`;
  };
  raiz.addEventListener("pointermove", (e) => {
    const alvo = e.target.closest("[data-tip]");
    if (!alvo) return (tip.hidden = true);
    mostrar(alvo, e.clientX, e.clientY);
  });
  raiz.addEventListener("pointerleave", () => (tip.hidden = true));
  raiz.addEventListener("focusin", (e) => {
    const alvo = e.target.closest("[data-tip]");
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    mostrar(alvo, r.left + r.width / 2, r.top);
  });
  raiz.addEventListener("focusout", () => (tip.hidden = true));
}

/* ---------------------------------------------------------
   Gráficos (SVG)
   --------------------------------------------------------- */
// Colunas verticais: [{ rotulo, valor, tip }]. Escala começa em zero.
function colunas(dados, { altura = 180, largura = 600, serie = "s1", destaqueUltima = false, sufixo = "" } = {}) {
  if (!dados.length) return `<p class="dash-vazio">Sem dados ainda.</p>`;
  const W = largura, H = altura, padL = 34, padB = 26, padT = 18;
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const passo = escalaPasso(max);
  const topo = Math.ceil(max / passo) * passo;
  const larg = (W - padL) / dados.length;
  const barra = Math.max(4, Math.min(38, larg * 0.62));
  const y = (v) => padT + (H - padT - padB) * (1 - v / topo);
  let grade = "";
  for (let v = 0; v <= topo; v += passo) {
    grade += `<line class="dash-grade" x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`
      + `<text class="dash-eixo" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`;
  }
  const mostrarRotulo = (i) => dados.length <= 14 || i % Math.ceil(dados.length / 10) === 0 || i === dados.length - 1;
  const barras = dados.map((d, i) => {
    const x = padL + i * larg + (larg - barra) / 2;
    const h = Math.max(d.valor > 0 ? 2 : 0, H - padB - y(d.valor));
    const cls = destaqueUltima && i === dados.length - 1 ? `${serie} dash-forte` : serie;
    const dica = d.tip || `<b>${esc(d.rotulo)}</b><br>${num(d.valor)}${sufixo}`;
    return `<g tabindex="0" data-tip="${esc(dica)}">
      <rect class="dash-alvo" x="${padL + i * larg}" y="${padT}" width="${larg}" height="${H - padT - padB}"/>
      <path class="dash-barra ${cls}" d="${caminhoBarra(x, H - padB - h, barra, h)}"/>
      ${mostrarRotulo(i) ? `<text class="dash-eixo" x="${x + barra / 2}" y="${H - 8}" text-anchor="middle">${esc(d.rotulo)}</text>` : ""}
    </g>`;
  }).join("");
  return `<svg class="dash-svg" viewBox="0 0 ${W} ${H}" role="img">${grade}${barras}</svg>`;
}

// Barras horizontais com o número na ponta: [{ rotulo, valor, tip }].
function barras(dados, { serie = "s1", sufixo = "" } = {}) {
  if (!dados.length) return `<p class="dash-vazio">Sem dados ainda.</p>`;
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return `<div class="dash-hbars">${dados.map((d) => `
    <div class="dash-hbar" tabindex="0" data-tip="${esc(d.tip || `<b>${esc(d.rotulo)}</b><br>${num(d.valor)}${sufixo}`)}">
      <span class="dash-hbar-rotulo">${esc(d.rotulo)}</span>
      <span class="dash-hbar-trilho"><span class="dash-hbar-valor ${d.cls || serie}" style="width:${(d.valor / max) * 100}%"></span></span>
      <span class="dash-hbar-num">${num(d.valor)}${sufixo}</span>
    </div>`).join("")}</div>`;
}

// Matriz presença (linhas × colunas), ex.: competição × ano.
function matriz(linhas, colunasRot, temCelula) {
  return `<div class="dash-matriz-wrap"><table class="dash-matriz">
    <thead><tr><th></th>${colunasRot.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${linhas.map((l) => `<tr><th>${esc(l.rotulo)}</th>${colunasRot.map((c) => {
      const sim = temCelula(l, c);
      return `<td><span class="dash-cel ${sim ? "on" : ""}" tabindex="0" data-tip="${esc(`<b>${esc(l.nome || l.rotulo)}</b><br>${c}: ${sim ? "participou" : "não participou"}`)}"></span></td>`;
    }).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function caminhoBarra(x, y, w, h) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
function escalaPasso(max) {
  const bruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function tabela(cabecalho, linhas) {
  return `<details class="dash-tabela"><summary>Ver tabela</summary><div class="dash-tabela-wrap"><table>
    <thead><tr>${cabecalho.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${linhas.map((l) => `<tr>${l.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div></details>`;
}

function cartao(titulo, subtitulo, corpo, { largo = false, extra = "" } = {}) {
  return `<article class="dash-card ${largo ? "dash-largo" : ""}">
    <header class="dash-card-head"><h3>${esc(titulo)}</h3>${subtitulo ? `<p>${subtitulo}</p>` : ""}</header>
    ${corpo}${extra}
  </article>`;
}

function kpi(rotulo, valor, detalhe = "") {
  return `<div class="dash-kpi"><span class="dash-kpi-num">${valor}</span><span class="dash-kpi-rot">${esc(rotulo)}</span>${detalhe ? `<span class="dash-kpi-det">${detalhe}</span>` : ""}</div>`;
}

/* ---------------------------------------------------------
   Leitura dos dados
   --------------------------------------------------------- */
async function lerColecao(db, nome) {
  try {
    const snap = await getDocs(collection(db, nome));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn(`Dashboard: não foi possível ler ${nome}`, err);
    return null;
  }
}

async function lerPerfil() {
  try {
    const r = await fetch(`data/profile.json?v=${Date.now()}`);
    return await r.json();
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------
   Montagem
   --------------------------------------------------------- */
export async function renderDashboard(db) {
  const raiz = document.getElementById("dash-root");
  if (!raiz) return;
  raiz.innerHTML = `<p class="dash-vazio">Carregando os números…</p>`;

  const [stats, projetos, eventos, mensagens, perfil] = await Promise.all([
    lerColecao(db, "stats"),
    lerColecao(db, "projectSubmissions"),
    lerColecao(db, "events"),
    lerColecao(db, "contactMessages"),
    lerPerfil(),
  ]);

  const secoes = [
    secaoSite(stats, mensagens, projetos, eventos),
    secaoImpacto(perfil),
    secaoCompeticoesEventos(perfil, eventos),
    secaoProjetos(projetos),
    secaoPortfolio(perfil),
    secaoEscolas(perfil, eventos),
  ];
  raiz.innerHTML = secoes.join("");
  raiz.querySelector("#dash-atualizado").textContent =
    `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (!raiz.dataset.ligado) {
    ligarTooltip(raiz);
    raiz.dataset.ligado = "1";
  }
}

function secaoSite(stats, mensagens, projetos, eventos) {
  const total = stats?.find((s) => s.id === "siteVisits")?.count ?? null;
  const porDia = new Map((stats || []).filter((s) => s.id.startsWith("d-")).map((s) => [s.id.slice(2), s.count || 0]));
  const hoje = hojeSP();
  const dias = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(`${hoje}T12:00:00`);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10).replaceAll("-", "");
    dias.push({ k, rotulo: `${d.getDate()}/${d.getMonth() + 1}`, valor: porDia.get(k) || 0 });
  }
  const ult7 = dias.slice(-7).reduce((s, d) => s + d.valor, 0);
  const temHistorico = porDia.size > 0;
  const primeiroDia = temHistorico ? [...porDia.keys()].sort()[0] : null;

  const meses = ultimosMeses(12);
  const msgPorMes = new Map(meses.map((m) => [m, 0]));
  (mensagens || []).forEach((m) => {
    const d = dataDe(m.createdAt);
    if (d && msgPorMes.has(chaveMes(d))) msgPorMes.set(chaveMes(d), msgPorMes.get(chaveMes(d)) + 1);
  });
  const aprovados = (projetos || []).filter((p) => p.status === "approved").length;
  const pendentes = (projetos || []).filter((p) => p.status === "pending").length;
  const futuros = (eventos || []).filter((e) => e.date && e.date >= hoje).length;

  const kpis = `<div class="dash-kpis">
    ${kpi("Acessos ao currículo", total === null ? "—" : num(total), "desde a criação do contador")}
    ${kpi("Acessos nos últimos 7 dias", temHistorico ? num(ult7) : "—", temHistorico ? "" : "começa a contar hoje")}
    ${kpi("Mensagens recebidas", mensagens ? num(mensagens.length) : "—")}
    ${kpi("Projetos no portfólio", projetos ? num(aprovados) : "—", pendentes ? `${pendentes} esperando revisão` : "nenhum pendente")}
    ${kpi("Eventos publicados", eventos ? num(eventos.length) : "—", `${futuros} próximos`)}
  </div>`;

  const acessos = cartao(
    "Acessos por dia",
    temHistorico
      ? `Últimos 30 dias · contagem diária desde ${primeiroDia.slice(6, 8)}/${primeiroDia.slice(4, 6)}`
      : "O contador diário começou agora: o gráfico enche a cada visita. O total acima vem do contador antigo.",
    colunas(dias.map((d) => ({ rotulo: d.rotulo, valor: d.valor })), { destaqueUltima: true, sufixo: " acessos", largura: 1100, altura: 220 }),
    { extra: tabela(["Dia", "Acessos"], dias.map((d) => [d.rotulo, d.valor])) }
  );
  const msgs = cartao(
    "Mensagens por mês",
    "Formulário de contato, últimos 12 meses",
    colunas(meses.map((m) => ({ rotulo: rotuloMes(m), valor: msgPorMes.get(m) })), { serie: "s2", sufixo: " mensagens", largura: 420, altura: 250 }),
    { extra: tabela(["Mês", "Mensagens"], meses.map((m) => [rotuloMes(m), msgPorMes.get(m)])) }
  );
  return secao("Números do site", "dash-site", kpis + `<div class="dash-grid dash-grid-site">${acessos}${msgs}</div>`, true);
}

function secaoImpacto(perfil) {
  const anos = [...(perfil?.impactStats?.statsByYear || [])].sort((a, b) => a.year.localeCompare(b.year));
  if (!anos.length) return "";
  const metricas = [...new Set(anos.flatMap((a) => a.stats.map((s) => s.label)))];
  const valor = (ano, m) => ano.stats.find((s) => s.label === m)?.count ?? "0";
  const ultimo = anos[anos.length - 1];
  const acumulado = (m) => anos.reduce((s, a) => s + paraNumero(valor(a, m)), 0);
  const kpis = `<div class="dash-kpis">${metricas.map((m) =>
    kpi(`${m} em ${ultimo.year}`, esc(valor(ultimo, m)), `${num(acumulado(m))}${anos.some((a) => String(valor(a, m)).includes("+")) ? "+" : ""} desde ${anos[0].year}`)).join("")}</div>`;
  const pequenos = metricas.map((m) => cartao(
    m,
    `Por ano letivo, ${anos[0].year} a ${ultimo.year}`,
    colunas(anos.map((a) => ({ rotulo: a.year, valor: paraNumero(valor(a, m)), tip: `<b>${m} em ${a.year}</b><br>${esc(valor(a, m))}` })), { destaqueUltima: true, altura: 190, largura: 300 }),
    { extra: tabela(["Ano", m], anos.map((a) => [a.year, valor(a, m)])) }
  )).join("");
  return secao("Impacto em sala de aula", "dash-impacto", kpis + `<div class="dash-grid dash-grid-4">${pequenos}</div>`
    + `<p class="dash-nota">Fonte: "Impacto em números" do currículo (data/profile.json). Valores com "+" entram no gráfico pelo número inteiro.</p>`);
}

function secaoCompeticoesEventos(perfil, eventos) {
  const porAno = [...(perfil?.competitions?.byYear || [])].sort((a, b) => a.year.localeCompare(b.year));
  const catalogo = perfil?.competitions?.catalog || {};
  const anos = porAno.map((a) => a.year);
  const siglas = [...new Set(porAno.flatMap((a) => a.items))];
  const linhas = siglas
    .map((s) => ({ rotulo: s, nome: catalogo[s]?.description || s, anos: porAno.filter((a) => a.items.includes(s)).map((a) => a.year) }))
    .sort((a, b) => b.anos.length - a.anos.length || a.rotulo.localeCompare(b.rotulo));

  const qtd = cartao(
    "Competições e eventos por ano",
    "Olimpíadas, feiras e hackathons com alunos",
    colunas(porAno.map((a) => ({ rotulo: a.year, valor: a.items.length, tip: `<b>${a.year}</b><br>${a.items.length} participações<br>${esc(a.items.join(", "))}` })), { destaqueUltima: true }),
    { extra: tabela(["Ano", "Participações", "Quais"], porAno.map((a) => [a.year, a.items.length, a.items.join(", ")])) }
  );
  const mapa = cartao(
    "Onde estivemos, ano a ano",
    "Cada quadrado preenchido é uma participação",
    matriz(linhas, anos, (l, ano) => l.anos.includes(ano)),
    { largo: true }
  );

  const hoje = hojeSP();
  const lista = eventos || [];
  const meses = ultimosMeses(12, new Date(new Date().getFullYear(), new Date().getMonth() + 3, 1));
  const evPorMes = new Map(meses.map((m) => [m, 0]));
  lista.forEach((e) => {
    if (!e.date) return;
    const k = e.date.slice(0, 7);
    if (evPorMes.has(k)) evPorMes.set(k, evPorMes.get(k) + 1);
  });
  const proximos = lista.filter((e) => e.date && e.date >= hoje).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const evMes = cartao(
    "Eventos do site por mês",
    "Cadastrados no painel; inclui os próximos 3 meses",
    colunas(meses.map((m) => ({ rotulo: rotuloMes(m), valor: evPorMes.get(m) })), { serie: "s3", sufixo: " eventos" }),
    { extra: tabela(["Mês", "Eventos"], meses.map((m) => [rotuloMes(m), evPorMes.get(m)])) }
  );
  const prox = cartao(
    "Próximos eventos",
    proximos.length ? "" : "Nenhum evento futuro cadastrado",
    proximos.length ? `<ul class="dash-lista">${proximos.map((e) => {
      const d = new Date(`${e.date}T12:00:00`);
      return `<li><span class="dash-data">${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]}</span><span><b>${esc(e.title)}</b>${e.location ? `<br><small>${esc(e.location)}</small>` : ""}</span></li>`;
    }).join("")}</ul>` : ""
  );
  return secao("Competições e eventos", "dash-eventos", `<div class="dash-grid">${qtd}${evMes}${mapa}${prox}</div>`);
}

function secaoProjetos(projetos) {
  if (!projetos) return secao("Projetos do portfólio", "dash-projetos", `<p class="dash-vazio">Não foi possível ler os projetos.</p>`);
  const status = Object.entries(STATUS).map(([k, s]) => ({ rotulo: s.rotulo, valor: projetos.filter((p) => p.status === k).length, cls: s.cls }));
  const ods = new Map();
  projetos.filter((p) => p.status === "approved").forEach((p) => (p.ods || []).forEach((o) => ods.set(o, (ods.get(o) || 0) + 1)));
  const odsDados = [...ods.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([o, v]) => ({ rotulo: o.replace(/^(\d+) — /, "ODS $1 · "), valor: v }));
  const notas = projetos.filter((p) => Number.isFinite(p.rating));
  const media = notas.length ? (notas.reduce((s, p) => s + p.rating, 0) / notas.length).toFixed(1).replace(".", ",") : "—";
  const faixas = [["1 a 4", 1, 4], ["5 a 6", 5, 6], ["7 a 8", 7, 8], ["9 a 10", 9, 10]]
    .map(([r, a, b]) => ({ rotulo: r, valor: notas.filter((p) => p.rating >= a && p.rating <= b).length }));
  const meses = ultimosMeses(12);
  const porMes = new Map(meses.map((m) => [m, 0]));
  projetos.forEach((p) => {
    const d = dataDe(p.createdAt);
    if (d && porMes.has(chaveMes(d))) porMes.set(chaveMes(d), porMes.get(chaveMes(d)) + 1);
  });

  const kpis = `<div class="dash-kpis">
    ${kpi("Projetos cadastrados", num(projetos.length))}
    ${kpi("Nota média", media, notas.length ? `${notas.length} avaliados` : "")}
    ${kpi("ODS diferentes", num(ods.size), "nos projetos aprovados")}
  </div>`;
  const cards = [
    cartao("Situação dos projetos", "Enviados pelo formulário ou criados no painel", barras(status),
      { extra: tabela(["Situação", "Projetos"], status.map((s) => [s.rotulo, s.valor])) }),
    cartao("ODS mais trabalhados", "Projetos aprovados (um projeto pode ter várias ODS)", barras(odsDados, { serie: "s3" }),
      { extra: tabela(["ODS", "Projetos"], odsDados.map((d) => [d.rotulo, d.valor])) }),
    cartao("Distribuição das notas", "Projetos com nota de 1 a 10", colunas(faixas, { serie: "s2", sufixo: " projetos", altura: 150 }),
      { extra: tabela(["Faixa", "Projetos"], faixas.map((f) => [f.rotulo, f.valor])) }),
    cartao("Projetos cadastrados por mês", "Últimos 12 meses", colunas(meses.map((m) => ({ rotulo: rotuloMes(m), valor: porMes.get(m) })), { sufixo: " projetos", altura: 150 }),
      { extra: tabela(["Mês", "Projetos"], meses.map((m) => [rotuloMes(m), porMes.get(m)])) }),
  ].join("");
  return secao("Projetos do portfólio", "dash-projetos", kpis + `<div class="dash-grid">${cards}</div>`);
}

function secaoPortfolio(perfil) {
  const linha = perfil?.timeline?.items || [];
  const contar = (lista, chave) => {
    const m = new Map();
    lista.forEach((i) => m.set(i[chave] || "Outros", (m.get(i[chave] || "Outros") || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([rotulo, valor]) => ({ rotulo, valor }));
  };
  const tipos = contar(linha.filter((i) => i.type), "type");
  const fases = contar(linha.filter((i) => i.era), "era");
  const atuais = linha.filter((i) => i.era === "Atual");
  const grupos = (perfil?.techStack?.groups || []).map((g) => ({ rotulo: g.title, valor: g.items.length, tip: `<b>${esc(g.title)}</b><br>${esc(g.items.map((i) => i.label).join(", "))}` }));
  const totalFerramentas = grupos.reduce((s, g) => s + g.valor, 0);
  const areas = (perfil?.skills?.groups || []).map((g) => ({ rotulo: g.title, valor: g.items.length, tip: `<b>${esc(g.title)}</b><br>${esc(g.items.join(", "))}` }));

  const kpis = `<div class="dash-kpis">
    ${kpi("Itens na linha do tempo", num(linha.filter((i) => i.title).length))}
    ${kpi("Produtos e projetos atuais", num(atuais.length))}
    ${kpi("Ferramentas e tecnologias", num(totalFerramentas), `${grupos.length} grupos`)}
  </div>`;
  const cards = [
    cartao("Portfólio por tipo", "Linha do tempo do currículo", barras(tipos), { extra: tabela(["Tipo", "Itens"], tipos.map((t) => [t.rotulo, t.valor])) }),
    cartao("Portfólio por fase", "Da web pessoal aos projetos atuais", barras(fases, { serie: "s2" }), { extra: tabela(["Fase", "Itens"], fases.map((t) => [t.rotulo, t.valor])) }),
    cartao("Ferramentas por grupo", "Passe o mouse para ver quais", barras(grupos, { serie: "s3" }), { extra: tabela(["Grupo", "Ferramentas"], grupos.map((g) => [g.rotulo, g.valor])) }),
    cartao("Áreas de atuação", "Competências listadas no currículo", barras(areas, { serie: "s2" }), { extra: tabela(["Área", "Itens"], areas.map((a) => [a.rotulo, a.valor])) }),
    cartao("Produtos atuais", "", `<ul class="dash-lista dash-lista-logo">${atuais.map((i) => `<li>${i.logo ? `<img src="${esc(i.logo)}" alt="">` : ""}<span><b>${esc(i.title)}</b><br><small>${esc(i.type || "")}${i.url ? ` · <a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${esc(i.org || "abrir")}</a>` : ""}</small></span></li>`).join("")}</ul>`, { largo: true }),
  ].join("");
  return secao("Portfólio e ferramentas", "dash-portfolio", kpis + `<div class="dash-grid">${cards}</div>`);
}

function secaoEscolas(perfil, eventos) {
  const papeis = perfil?.currentRoles?.items || [];
  const parceiros = perfil?.partners?.items || [];
  const locais = new Map();
  (eventos || []).forEach((e) => { if (e.location) locais.set(e.location, (locais.get(e.location) || 0) + 1); });
  const locaisDados = [...locais.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([rotulo, valor]) => ({ rotulo, valor }));
  const anos = [...(perfil?.impactStats?.statsByYear || [])].sort((a, b) => a.year.localeCompare(b.year));
  const equipes = anos.map((a) => ({ rotulo: a.year, valor: paraNumero(a.stats.find((s) => /equipe/i.test(s.label))?.count ?? 0) }));
  const cards = [
    cartao("Escolas e organizações", "Onde o trabalho acontece hoje",
      `<ul class="dash-lista dash-lista-logo">${papeis.map((p) => `<li>${p.logo ? `<img src="${esc(p.logo)}" alt="" onerror="this.src='${esc(p.fallbackLogo || "")}'">` : ""}<span><b>${esc(p.org)}</b><br><small>${esc(p.title)}</small></span></li>`).join("")}</ul>`),
    cartao("Equipes por ano", "Equipes de alunos mentoradas", colunas(equipes, { destaqueUltima: true, altura: 150, sufixo: " equipes" }),
      { extra: tabela(["Ano", "Equipes"], equipes.map((e) => [e.rotulo, e.valor])) }),
    cartao("Eventos por local", locaisDados.length ? "Escolas e lugares dos eventos cadastrados" : "Nenhum evento com local cadastrado", barras(locaisDados, { serie: "s2" }),
      { extra: locaisDados.length ? tabela(["Local", "Eventos"], locaisDados.map((l) => [l.rotulo, l.valor])) : "" }),
    cartao("Parceiros e alinhamento", "", `<div class="dash-chips">${parceiros.map((p) => `<span class="dash-chip">${p.logo ? `<img src="${esc(p.logo)}" alt="">` : ""}${esc(p.label)}</span>`).join("")}</div>`),
  ].join("");
  return secao("Escolas, equipes e parceiros", "dash-escolas", `<div class="dash-grid">${cards}</div>`);
}

function secao(titulo, id, corpo, comCabecalho = false) {
  return `<section class="dash-secao" id="${id}">
    <div class="dash-secao-head"><h2>${esc(titulo)}</h2>${comCabecalho ? `<span class="dash-atualizado" id="dash-atualizado"></span>` : ""}</div>
    ${corpo}
  </section>`;
}
