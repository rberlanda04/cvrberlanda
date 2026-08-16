// Renderiza todo o conteúdo do site a partir de data/profile.json.
// Trocar esse arquivo JSON é o suficiente para reaproveitar a estrutura
// como um produto para outra pessoa/escola.

// Firebase: só usado pra gravar as mensagens do formulário de contato no
// Firestore (coleção "contactMessages"). As regras de segurança (ver
// firestore.rules) permitem só criar mensagem — ninguém lê/edita pelo site.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKzvn8KwLZz0oo0o_FP0NmMndIjuTjS8g",
  authDomain: "rberlanda-f53b5.firebaseapp.com",
  projectId: "rberlanda-f53b5",
  storageBucket: "rberlanda-f53b5.firebasestorage.app",
  messagingSenderId: "305440619750",
  appId: "1:305440619750:web:47d0b4c542b998ab1f0f27",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const EXTERNAL_LINK_ICON = `
  <svg viewBox="0 0 24 24"><path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/></svg>
`;

// Ícones minimalistas (mesmo estilo dos ícones do menu) para os chips de
// "Áreas de atuação" — são conceitos, não marcas, então não usam logo real.
const SKILL_ICONS = {
  "Cultura Maker": '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  STEAM: '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)"/>',
  PBL: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M8.5 11l2 2 4-4M8.5 16.5h7"/>',
  "Pensamento Computacional": '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6.6 7.2 11 16.4M17.4 7.2 13 16.4M7 6h10"/>',
  BNCC: '<path d="M4 5.5C4 5 7 4 12 6c5-2 8-1 8-.5v13c0-.5-3-1.5-8 .5-5-2-8-1-8-.5Z"/><path d="M12 6v13"/>',
  "Formação de professores": '<path d="M2 9 12 4l10 5-10 5-10-5Z"/><path d="M6 11.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/><path d="M20 9v6"/>',
  Gamificação: '<rect x="2.5" y="8" width="19" height="10" rx="4"/><path d="M7 11v4M5 13h4"/><circle cx="15.5" cy="12" r="1"/><circle cx="18" cy="14.5" r="1"/>',
  "Lógica de programação": '<path d="M9 8 4.5 12 9 16M15 8l4.5 4-4.5 4"/>',
  "Preparação para olimpíadas": '<path d="M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/><path d="M12 13v3M9 21h6M10 18h4v3h-4Z"/>',
  RPG: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="8.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/>',
  IA: '<path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M19.4 4.6l-2.1 2.1M6.7 17.3l-2.1 2.1"/><circle cx="12" cy="12" r="4"/>',
  Blockchain: '<rect x="3" y="9" width="7" height="7" rx="2"/><rect x="14" y="9" width="7" height="7" rx="2"/><path d="M10 12.5h4"/>',
  Criptoativos: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M9.5 9h4a2 2 0 0 1 0 4h-4M9.5 13h4.5a2 2 0 0 1 0 4H9.5"/>',
  "Segurança Digital": '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z"/><path d="M9 12l2 2 4-4"/>',
  "Arquitetura de Computadores": '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2"/>',
  "Sistemas Operacionais": '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18M7 12.5l2 1.5-2 1.5M11 15.5h4"/>',
  "E-Business": '<rect x="3" y="8" width="18" height="11" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  "Startup Thinking": '<path d="M12 2c3 2 5 6 4.5 11-1 .5-2.5.5-4.5.5s-3.5 0-4.5-.5C7 8 9 4 12 2Z"/><path d="M9.5 13.5 7 19l3-1M14.5 13.5 17 19l-3-1"/><circle cx="12" cy="9" r="1.3"/>',
};

function skillIconSvg(label) {
  const inner = SKILL_ICONS[label];
  if (!inner) return "";
  return `<svg class="tag-icon" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

// Grid de números (Turmas, Alunos, Equipes, Projetos) com efeito de contador:
// separa o valor numérico do sufixo (ex.: "410+" -> 410 e "+") para animar.
function parseStatCount(raw) {
  const match = String(raw).match(/^(\d+)(.*)$/);
  if (!match) return { target: 0, suffix: String(raw) };
  return { target: parseInt(match[1], 10), suffix: match[2] };
}

function animateCount(node, target, suffix, duration = 1200) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    node.textContent = `${target}${suffix}`;
    return;
  }
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = `${Math.round(target * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function setupStatsCounter(grid) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        grid.querySelectorAll(".stat-count").forEach((node) => {
          animateCount(node, Number(node.dataset.target || 0), node.dataset.suffix || "");
        });
        obs.disconnect();
      });
    },
    { threshold: 0.3 }
  );
  observer.observe(grid);
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node && value !== undefined && value !== null) node.textContent = value;
}

function initialsFrom(label) {
  const words = (label || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// Badge de logo com fallback em 2 níveis: logo -> fallbackLogo -> círculo com iniciais.
// Assim a seção fica visualmente pronta mesmo antes de todo logo oficial ser adicionado
// em public/assets/logos/ — basta trocar o arquivo depois que o badge passa a exibi-lo.
function createLogoBadge({ logo, fallbackLogo, label, size = 40, dark = false }) {
  const wrap = el("span", "logo-badge");
  wrap.style.setProperty("--logo-size", `${size}px`);

  const showInitials = () => {
    wrap.appendChild(el("span", "logo-circle", initialsFrom(label)));
  };

  if (!logo) {
    showInitials();
    return wrap;
  }

  const img = document.createElement("img");
  img.className = dark ? "logo-img logo-img--dark" : "logo-img";
  img.alt = label || "";
  img.loading = "lazy";
  img.src = logo;
  img.addEventListener("error", () => {
    if (fallbackLogo && !img.dataset.triedFallback) {
      img.dataset.triedFallback = "1";
      img.src = fallbackLogo;
    } else {
      img.remove();
      showInitials();
    }
  });
  wrap.appendChild(img);
  return wrap;
}

// Usado para o avatar do hero e a marca do menu: tenta mostrar uma imagem
// real e, se falhar ao carregar, volta ao conteúdo de texto que já estava lá.
function setImageWithFallback(containerId, src) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!src) return;

  const fallback = container.querySelector("span");
  const img = document.createElement("img");
  img.alt = "";
  img.src = src;
  if (fallback) fallback.style.display = "none";
  img.addEventListener("error", () => {
    img.remove();
    if (fallback) fallback.style.display = "";
  });
  container.prepend(img);
}

function renderAbout(data) {
  setText("about-heading", data.about.heading);
  const container = document.getElementById("about-text");
  container.innerHTML = "";
  const paragraphs = data.about.paragraphs;
  paragraphs.forEach((p, index) => {
    // O último parágrafo é sempre a "história de origem" (ex.: Izicode Edu) — ganha um leve destaque.
    const isLast = index === paragraphs.length - 1;
    container.appendChild(el("p", isLast ? "about-highlight" : null, p));
  });
}

function renderRoles(data) {
  setText("roles-heading", data.currentRoles.heading);
  const grid = document.getElementById("roles-grid");
  grid.innerHTML = "";
  data.currentRoles.items.forEach((role) => {
    const card = el("article", "card card-with-logo");
    card.appendChild(
      createLogoBadge({
        logo: role.logo,
        fallbackLogo: role.fallbackLogo,
        label: role.org,
        size: 92,
        dark: role.logoBg === "dark",
      })
    );
    const body = el(
      "div",
      null,
      `
      <h3 class="card-title">${role.title}</h3>
      <p class="card-org">${role.org}</p>
    `
    );
    card.appendChild(body);
    grid.appendChild(card);
  });
}

function renderTechStack(data) {
  setText("tech-heading", data.techStack.heading);
  setText("tech-intro", data.techStack.intro);
  const container = document.getElementById("tech-groups");
  container.innerHTML = "";
  data.techStack.groups.forEach((group) => {
    const block = el("div", "tech-group");
    block.appendChild(el("h3", "tech-group-title", group.title));
    const grid = el("div", "tech-grid");
    group.items.forEach((tool) => {
      const tile = el("div", "tech-tile");
      tile.appendChild(createLogoBadge({ logo: tool.logo, label: tool.label, size: 64 }));
      tile.appendChild(el("p", "tech-label", tool.label));
      grid.appendChild(tile);
    });
    block.appendChild(grid);
    container.appendChild(block);
  });
}

const SKILL_GROUP_ICONS = {
  "Robótica & Maker":
    '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  "Educação & Currículo":
    '<path d="M4 5.5C4 5 7 4 12 6c5-2 8-1 8-.5v13c0-.5-3-1.5-8 .5-5-2-8-1-8-.5Z"/><path d="M12 6v13"/>',
  "Tecnologia & Inovação":
    '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2"/>',
};

function renderSkills(data) {
  setText("skills-heading", data.skills.heading);
  const container = document.getElementById("skills-groups");
  container.innerHTML = "";
  data.skills.groups.forEach((group, index) => {
    const block = el("div", "skill-group");
    const groupIcon = SKILL_GROUP_ICONS[group.title] || "";
    const panelId = `skills-panel-${index}`;
    const tags = group.items
      .map((item) => `<li class="tag">${skillIconSvg(item)}<span>${item}</span></li>`)
      .join("");
    block.innerHTML = `
      <button class="skill-group-header" aria-expanded="false" aria-controls="${panelId}">
        <span class="skill-group-icon-wrap">
          <svg class="skill-group-icon" viewBox="0 0 24 24" aria-hidden="true">${groupIcon}</svg>
        </span>
        <span class="skill-group-title">${group.title}</span>
        <span class="skill-group-count">${group.items.length}</span>
        <svg class="chevron skill-group-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="skill-group-panel" id="${panelId}">
        <ul class="tag-list">${tags}</ul>
      </div>
    `;
    container.appendChild(block);
  });
  setupSkillAccordions();
}

function setupSkillAccordions() {
  document.querySelectorAll(".skill-group-header").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      panel.style.maxHeight = isOpen ? "0px" : `${panel.scrollHeight}px`;
    });
  });
}

const TIMELINE_COLLAPSE_LIMIT = 5;

// Mede a altura real dos primeiros N itens e fecha a lista até ali —
// funciona com qualquer tamanho de descrição, sem chute de altura fixa.
function collapseTimeline(list) {
  const items = list.querySelectorAll(".timeline-item");
  if (items.length <= TIMELINE_COLLAPSE_LIMIT) {
    list.style.maxHeight = "none";
    list.classList.remove("timeline-collapsed");
    return;
  }
  const target = items[TIMELINE_COLLAPSE_LIMIT - 1];
  list.style.maxHeight = `${target.offsetTop + target.offsetHeight}px`;
  list.classList.add("timeline-collapsed");
}

function renderTimeline(data) {
  setText("timeline-heading", data.timeline.heading);
  setText("timeline-intro", data.timeline.intro);
  const list = document.getElementById("timeline-list");
  list.innerHTML = "";
  list.classList.remove("expanded");
  let lastEra = null;
  data.timeline.items.forEach((item) => {
    const li = el("li", "timeline-item");
    const showEra = item.era !== lastEra;
    lastEra = item.era;
    li.innerHTML = `
      ${showEra ? `<p class="timeline-era">${item.era}</p>` : ""}
      <div class="timeline-card timeline-card-with-logo">
        <div class="timeline-header">
          <div class="timeline-header-main"></div>
          <span class="timeline-type">${item.type}</span>
        </div>
        <p class="timeline-desc">${item.description}</p>
        <a class="timeline-link" href="${item.url}" target="_blank" rel="noopener noreferrer">
          Visitar ${EXTERNAL_LINK_ICON}
        </a>
      </div>
    `;
    const headerMain = li.querySelector(".timeline-header-main");
    headerMain.appendChild(createLogoBadge({ logo: item.logo, label: item.org, size: 44 }));
    headerMain.appendChild(
      el(
        "div",
        null,
        `<p class="timeline-title">${item.title}</p><p class="timeline-org">${item.org}</p>`
      )
    );
    list.appendChild(li);
  });

  const expandBtn = document.getElementById("timeline-expand");
  const hasCollapsible = data.timeline.items.length > TIMELINE_COLLAPSE_LIMIT;
  expandBtn.style.display = hasCollapsible ? "flex" : "none";
  expandBtn.setAttribute("aria-expanded", "false");
  expandBtn.setAttribute("aria-label", "Ver linha do tempo completa");
  collapseTimeline(list);
}

function setupTimelineExpand() {
  const btn = document.getElementById("timeline-expand");
  const list = document.getElementById("timeline-list");
  btn.addEventListener("click", () => {
    const isExpanded = !list.classList.contains("expanded");
    list.classList.toggle("expanded", isExpanded);
    btn.setAttribute("aria-expanded", String(isExpanded));
    btn.setAttribute("aria-label", isExpanded ? "Mostrar menos" : "Ver linha do tempo completa");
    if (isExpanded) {
      list.style.maxHeight = `${list.scrollHeight}px`;
      list.classList.remove("timeline-collapsed");
    } else {
      collapseTimeline(list);
      document.getElementById("portfolio").scrollIntoView({ block: "start", behavior: "smooth" });
    }
  });
}

// Carrossel de 2 slides no Contato: contatos rápidos <-> formulário.
// Formulário de contato em etapas: um campo por vez, com validação própria
// (o form usa novalidate — a validação e as mensagens de erro são só nossas).
function setupContactWizard() {
  const viewport = document.querySelector(".wizard-viewport");
  const track = document.getElementById("wizard-track");
  const steps = Array.from(track.children); // 3 campos + 1 tela de sucesso
  const slideCount = steps.length;
  const progressBar = document.getElementById("wizard-progress-bar");
  const dotsWrap = document.getElementById("wizard-dots");
  const nav = document.getElementById("wizard-nav");
  const backBtn = document.getElementById("wizard-back");
  const nextBtn = document.getElementById("wizard-next");
  const form = document.getElementById("contact-form");
  let current = 0;

  const fields = [
    {
      input: document.getElementById("contact-name"),
      error: document.getElementById("error-name"),
      validate: (v) => v.trim().length >= 2,
      message: "Digite seu nome pra continuar.",
    },
    {
      input: document.getElementById("contact-email"),
      error: document.getElementById("error-email"),
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      message: "Digite um e-mail válido.",
    },
    {
      input: document.getElementById("contact-subject"),
      error: document.getElementById("error-subject"),
      validate: (v) => v.trim().length >= 3,
      message: "Conta rapidinho o assunto.",
    },
    {
      input: document.getElementById("contact-message"),
      error: document.getElementById("error-message"),
      validate: (v) => v.trim().length >= 10,
      message: "Escreva uma mensagem um pouco mais completa (pelo menos 10 caracteres).",
    },
  ];
  const fieldCount = fields.length;
  const successIndex = slideCount - 1;

  // Largura calculada em JS (não fixa no CSS) — a página de cadastro de
  // projeto usa as mesmas classes com um número diferente de telas.
  track.style.width = `${slideCount * 100}%`;
  steps.forEach((step) => {
    step.style.width = `${100 / slideCount}%`;
  });

  dotsWrap.innerHTML = "";
  const dots = fields.map(() => {
    const dot = el("span", "wizard-dot");
    dotsWrap.appendChild(dot);
    return dot;
  });

  const updateUI = () => {
    track.style.transform = `translateX(-${current * (100 / slideCount)}%)`;
    viewport.style.height = `${steps[current].offsetHeight}px`;
    const progressStep = Math.min(current + 1, fieldCount);
    progressBar.style.width = `${(progressStep / fieldCount) * 100}%`;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
    backBtn.classList.toggle("is-hidden", current === 0);
    nextBtn.textContent = current === fieldCount - 1 ? "Enviar mensagem" : "Próximo";
  };

  const showError = (index, show) => {
    fields[index].error.textContent = show ? fields[index].message : "";
    fields[index].input.classList.toggle("has-error", show);
    if (show) {
      fields[index].input.classList.remove("shake");
      void fields[index].input.offsetWidth; // força reflow pra reiniciar a animação
      fields[index].input.classList.add("shake");
    }
  };

  const validateCurrent = () => {
    const field = fields[current];
    const valid = field.validate(field.input.value);
    showError(current, !valid);
    return valid;
  };

  const goTo = (index) => {
    current = Math.max(0, Math.min(fieldCount - 1, index));
    updateUI();
    fields[current].input.focus({ preventScroll: true });
  };

  const showSuccess = () => {
    current = successIndex;
    updateUI();
    nav.style.display = "none";
  };

  const submitWizard = async () => {
    const name = fields[0].input.value.trim();
    const email = fields[1].input.value.trim();
    const subject = fields[2].input.value.trim();
    const message = fields[3].input.value.trim();

    nextBtn.disabled = true;
    nextBtn.textContent = "Enviando...";
    try {
      await addDoc(collection(db, "contactMessages"), {
        name,
        email,
        subject,
        message,
        createdAt: serverTimestamp(),
      });
      showSuccess();
    } catch (err) {
      console.error("Falha ao gravar mensagem no Firestore, usando e-mail como alternativa", err);
      const recipient = form.dataset.recipient;
      if (recipient) {
        const body = `${message}\n\n— ${name} (${email})`;
        window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
      nextBtn.disabled = false;
      nextBtn.textContent = "Enviar mensagem";
    }
  };

  nextBtn.addEventListener("click", () => {
    if (!validateCurrent()) return;
    if (current < fieldCount - 1) goTo(current + 1);
    else submitWizard();
  });
  backBtn.addEventListener("click", () => goTo(current - 1));
  form.addEventListener("submit", (event) => event.preventDefault());

  fields.forEach((field, index) => {
    field.input.addEventListener("input", () => showError(index, false));
    field.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && field.input.tagName !== "TEXTAREA") {
        event.preventDefault();
        nextBtn.click();
      }
    });
  });

  window.addEventListener("resize", () => updateUI());
  updateUI();
}

function renderCompetitions(data) {
  setText("competitions-heading", data.competitions.heading);
  setText("competitions-intro", data.competitions.intro);
  setText("competitions-footnote", data.competitions.footnote);

  const catalog = data.competitions.catalog || {};
  const grid = document.getElementById("competitions-grid");

  const renderYear = (yearEntry) => {
    grid.innerHTML = "";
    yearEntry.items.forEach((acronym) => {
      const entry = catalog[acronym] || {};
      const li = el("li", "chip-card chip-featured");
      li.appendChild(createLogoBadge({ logo: entry.logo, label: acronym, size: 84 }));
      li.appendChild(el("p", "chip-acronym", acronym));
      if (entry.description) li.appendChild(el("p", "chip-desc", entry.description));
      grid.appendChild(li);
    });
  };

  const byYear = data.competitions.byYear || [];
  const yearsWrap = document.getElementById("competitions-years");
  yearsWrap.innerHTML = "";
  byYear.forEach((yearEntry, index) => {
    const btn = el("button", "stats-year-tab", yearEntry.year);
    btn.type = "button";
    btn.setAttribute("aria-pressed", String(index === 0));
    btn.addEventListener("click", () => {
      yearsWrap.querySelectorAll(".stats-year-tab").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      renderYear(yearEntry);
    });
    yearsWrap.appendChild(btn);
  });
  if (byYear.length) renderYear(byYear[0]);
}

function renderMentored(data) {
  setText("mentored-heading", data.mentoredProjects.heading);
  setText("mentored-intro", data.mentoredProjects.intro);

  setText("mentored-stats-label", data.mentoredProjects.statsLabel);

  const statsGrid = document.getElementById("mentored-stats");
  const renderYearStats = (yearEntry) => {
    statsGrid.innerHTML = "";
    yearEntry.stats.forEach((stat) => {
      const { target, suffix } = parseStatCount(stat.count);
      const tile = el(
        "div",
        "stat-tile",
        `
        <span class="stat-count" data-target="${target}" data-suffix="${suffix}">0${suffix}</span>
        <span class="stat-label">${stat.label}</span>
      `
      );
      statsGrid.appendChild(tile);
    });
    setupStatsCounter(statsGrid);
  };

  const yearsData = data.mentoredProjects.statsByYear || [];
  const yearsWrap = document.getElementById("mentored-stats-years");
  yearsWrap.innerHTML = "";
  yearsData.forEach((yearEntry, index) => {
    const btn = el("button", "stats-year-tab", yearEntry.year);
    btn.type = "button";
    btn.setAttribute("aria-pressed", String(index === 0));
    btn.addEventListener("click", () => {
      yearsWrap
        .querySelectorAll(".stats-year-tab")
        .forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      renderYearStats(yearEntry);
    });
    yearsWrap.appendChild(btn);
  });
  if (yearsData.length) renderYearStats(yearsData[0]);

  const grid = document.getElementById("mentored-grid");
  grid.innerHTML = "";
  const staticItems = data.mentoredProjects.items || [];
  staticItems.forEach((project) => grid.appendChild(buildMentoredCard(project)));
  updateMentoredEmptyState(grid);
  loadApprovedMentoredProjects(grid);
}

function buildMentoredCard(project) {
  const card = el("article", "card card-with-logo");
  card.appendChild(createLogoBadge({ logo: project.logo, label: project.title, size: 48 }));
  const body = el("div");
  const titleHtml = project.url
    ? `<a class="card-title card-title-link" href="${project.url}" target="_blank" rel="noopener noreferrer">${project.title}</a>`
    : `<h3 class="card-title">${project.title}</h3>`;
  body.innerHTML = `
    <p class="card-period">${project.period || ""}</p>
    ${titleHtml}
    <p class="card-org">${project.event || ""}</p>
    <p class="card-desc">${project.description || ""}</p>
  `;
  card.appendChild(body);
  return card;
}

function updateMentoredEmptyState(grid) {
  const existingEmpty = grid.querySelector(".empty-state");
  if (grid.querySelector(".card")) {
    if (existingEmpty) existingEmpty.remove();
  } else if (!existingEmpty) {
    grid.appendChild(
      el("div", "empty-state", "Nenhum projeto cadastrado ainda — adicione itens em data/profile.json → mentoredProjects.items.")
    );
  }
}

// Projetos enviados por alunos via cadastro-projeto.html e aprovados no
// painel /admin aparecem aqui automaticamente, sem precisar editar o
// profile.json nem fazer novo deploy.
async function loadApprovedMentoredProjects(grid) {
  try {
    const snapshot = await getDocs(
      query(collection(db, "projectSubmissions"), where("status", "==", "approved"))
    );
    // Ordenados pela nota (1-10) dada no painel /admin ao aprovar — os
    // projetos mais bem avaliados aparecem primeiro.
    const submissions = snapshot.docs
      .map((docSnap) => docSnap.data())
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    submissions.forEach((submission) => {
      grid.appendChild(
        buildMentoredCard({
          title: submission.name,
          logo: submission.logo,
          description: submission.description,
          url: submission.link || null,
          event: "Projeto de aluno",
        })
      );
    });
    if (submissions.length) updateMentoredEmptyState(grid);
  } catch (err) {
    console.error("Falha ao carregar projetos aprovados", err);
  }
}

// Os 17 Objetivos de Desenvolvimento Sustentável (ONU), nome oficial em português.
function renderContact(data) {
  setText("contact-heading", data.contact.heading);

  // Ícones clicáveis (sem mostrar o endereço em texto): um por e-mail + LinkedIn.
  const iconsList = document.getElementById("contact-icons");
  iconsList.innerHTML = "";
  (data.profile.emails || []).forEach((email) => {
    const li = el("li");
    const link = document.createElement("a");
    link.className = "contact-icon-link";
    link.href = `mailto:${email.address}`;
    link.title = `${email.label}: ${email.address}`;
    link.setAttribute("aria-label", `Enviar e-mail (${email.label}: ${email.address})`);
    link.appendChild(createLogoBadge({ logo: email.logo, label: email.label, size: 52 }));
    li.appendChild(link);
    iconsList.appendChild(li);
  });
  const contactSocialLabels = ["LinkedIn", "GitHub"];
  contactSocialLabels.forEach((label) => {
    const social = data.profile.social.find((s) => s.label === label && s.url);
    if (!social) return;
    const li = el("li");
    const link = document.createElement("a");
    link.className = "contact-icon-link";
    link.href = social.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = label;
    link.setAttribute("aria-label", `Abrir perfil no ${label}`);
    link.appendChild(createLogoBadge({ logo: social.logo, label, size: 52 }));
    li.appendChild(link);
    iconsList.appendChild(li);
  });

  setText("contact-location", data.profile.location);

  // Formulário sem backend: o wizard monta um mailto: com os dados preenchidos.
  const form = document.getElementById("contact-form");
  form.dataset.recipient = (data.profile.emails && data.profile.emails[0] && data.profile.emails[0].address) || "";
}

function renderProfile(data) {
  setText("nav-name", data.profile.name);
  setText("hero-role", data.profile.role);
  setText("hero-name", data.profile.name);
  setText("hero-tagline", data.profile.tagline);
  setText("hero-location", data.profile.location);
  setText("hero-initials", data.profile.initials);
  setText("brand-initials", data.profile.initials);
  setText("footer-name", `© ${new Date().getFullYear()} ${data.profile.name}`);
  document.title = `${data.profile.name} — Currículo & Portfólio`;

  setImageWithFallback("hero-avatar", data.profile.photo);
  setImageWithFallback("brand-mark", data.profile.brandLogo);
}

function renderPartners(data) {
  setText("partners-heading", data.partners.heading);
  setText("partners-intro", data.partners.intro);
  const grid = document.getElementById("partners-grid");
  grid.innerHTML = "";
  data.partners.items.forEach((partner) => {
    const tile = el("div", "tech-tile");
    tile.appendChild(createLogoBadge({ logo: partner.logo, label: partner.label, size: 64 }));
    tile.appendChild(el("p", "tech-label", partner.label));
    grid.appendChild(tile);
  });
}

async function init() {
  try {
    const res = await fetch("data/profile.json", { cache: "no-store" });
    const data = await res.json();

    renderProfile(data);
    renderAbout(data);
    renderRoles(data);
    renderSkills(data);
    renderTechStack(data);
    renderPartners(data);
    renderTimeline(data);
    renderCompetitions(data);
    renderMentored(data);
    renderContact(data);
  } catch (err) {
    console.error("Falha ao carregar data/profile.json", err);
    setText("hero-name", "Erro ao carregar dados");
    setText("hero-tagline", "Verifique se o arquivo data/profile.json existe e o site está sendo servido por um servidor HTTP (não aberto direto como arquivo local).");
  }
}

function setupThemeToggle() {
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  // Sempre começa no claro, mesmo se o sistema do visitante estiver no escuro.
  // Só muda se a pessoa já escolheu um tema antes (salvo no localStorage).
  root.setAttribute("data-theme", stored || "light");

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const isDarkNow = root.getAttribute("data-theme") === "dark";
    const next = isDarkNow ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

// Seções aparecem suavemente ao entrar na tela ao rolar a página.
function setupRevealAnimations() {
  const sections = document.querySelectorAll("#conteudo > section:not(.hero)");
  sections.forEach((section) => section.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  sections.forEach((section) => observer.observe(section));
}

setupThemeToggle();
setupRevealAnimations();
setupTimelineExpand();
setupContactWizard();
init();
