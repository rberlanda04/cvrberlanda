// Página escondida (não linkada no currículo): formulário em etapas pra
// alunos/turmas cadastrarem um projeto. Grava em "projectSubmissions" com
// status "pending" — a revisão de quais sobem pro portfólio é manual,
// direto no Console do Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

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
const storage = getStorage(firebaseApp);

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// Os 17 Objetivos de Desenvolvimento Sustentável (ONU), nome oficial em
// português. Os ícones (assets/logos/ods/ods-N.png) são os oficiais da ONU,
// via Wikimedia Commons.
const ODS_LIST = [
  { n: 1, name: "Erradicação da Pobreza" },
  { n: 2, name: "Fome Zero e Agricultura Sustentável" },
  { n: 3, name: "Saúde e Bem-Estar" },
  { n: 4, name: "Educação de Qualidade" },
  { n: 5, name: "Igualdade de Gênero" },
  { n: 6, name: "Água Potável e Saneamento" },
  { n: 7, name: "Energia Limpa e Acessível" },
  { n: 8, name: "Trabalho Decente e Crescimento Econômico" },
  { n: 9, name: "Indústria, Inovação e Infraestrutura" },
  { n: 10, name: "Redução das Desigualdades" },
  { n: 11, name: "Cidades e Comunidades Sustentáveis" },
  { n: 12, name: "Consumo e Produção Responsáveis" },
  { n: 13, name: "Ação Contra a Mudança Global do Clima" },
  { n: 14, name: "Vida na Água" },
  { n: 15, name: "Vida Terrestre" },
  { n: 16, name: "Paz, Justiça e Instituições Eficazes" },
  { n: 17, name: "Parcerias e Meios de Implementação" },
];

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function setupOdsGrid() {
  const grid = document.getElementById("ods-grid");
  const selected = new Set();

  ODS_LIST.forEach((goal) => {
    const label = `${goal.n} — ${goal.name}`;
    const btn = el(
      "button",
      "ods-option",
      `<img src="assets/logos/ods/ods-${goal.n}.png" alt="ODS ${label}" />`
    );
    btn.type = "button";
    btn.title = label;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      const isSelected = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!isSelected));
      if (isSelected) selected.delete(label);
      else selected.add(label);
      grid.dispatchEvent(new CustomEvent("odschange"));
    });
    grid.appendChild(btn);
  });

  return selected;
}

function init() {
  const selectedOds = setupOdsGrid();

  const viewport = document.querySelector(".wizard-viewport");
  const track = document.getElementById("wizard-track");
  const steps = Array.from(track.children); // 5 campos + 1 tela de sucesso
  const slideCount = steps.length;
  const progressBar = document.getElementById("wizard-progress-bar");
  const dotsWrap = document.getElementById("wizard-dots");
  const nav = document.getElementById("wizard-nav");
  const backBtn = document.getElementById("wizard-back");
  const nextBtn = document.getElementById("wizard-next");
  const form = document.getElementById("project-form");
  const odsGrid = document.getElementById("ods-grid");
  const odsError = document.getElementById("pf-error-ods");
  let current = 0;

  const fields = [
    {
      input: document.getElementById("pf-name"),
      error: document.getElementById("pf-error-name"),
      validate: (v) => v.trim().length >= 3,
      message: "Digite o nome do projeto.",
    },
    {
      input: document.getElementById("pf-logo"),
      error: document.getElementById("pf-error-logo"),
      validate: () => {
        const file = document.getElementById("pf-logo").files[0];
        return !!file && file.type.startsWith("image/") && file.size <= MAX_LOGO_BYTES;
      },
      message: "Escolha uma imagem (JPG, PNG ou WebP) de até 5MB.",
    },
    {
      input: document.getElementById("pf-description"),
      error: document.getElementById("pf-error-description"),
      validate: (v) => v.trim().length >= 10,
      message: "Descreva o projeto com pelo menos 10 caracteres.",
    },
    {
      input: odsGrid,
      error: odsError,
      validate: () => selectedOds.size > 0,
      message: "Selecione pelo menos um ODS.",
      isOds: true,
    },
    {
      input: document.getElementById("pf-link"),
      error: document.getElementById("pf-error-link"),
      validate: (v) => v.trim().length === 0 || isValidUrl(v.trim()),
      message: "Esse link não parece válido (comece com https://) — ou deixe em branco.",
    },
  ];
  const fieldCount = fields.length;
  const successIndex = slideCount - 1;

  // Largura calculada em JS (não fixa no CSS) — essa página tem um número de
  // telas diferente do wizard de contato, que usa as mesmas classes.
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
    nextBtn.textContent = current === fieldCount - 1 ? "Enviar projeto" : "Próximo";
  };

  const showError = (field, show) => {
    if (field.error) field.error.textContent = show ? field.message : "";
    if (field.isOds) {
      field.input.classList.toggle("has-error", show);
    } else {
      field.input.classList.toggle("has-error", show);
      if (show) {
        field.input.classList.remove("shake");
        void field.input.offsetWidth; // força reflow pra reiniciar a animação
        field.input.classList.add("shake");
      }
    }
  };

  const validateCurrent = () => {
    const field = fields[current];
    const value = field.isOds ? null : field.input.value;
    const valid = field.validate(value);
    showError(field, !valid);
    return valid;
  };

  const goTo = (index) => {
    current = Math.max(0, Math.min(fieldCount - 1, index));
    updateUI();
    if (!fields[current].isOds) fields[current].input.focus({ preventScroll: true });
  };

  odsGrid.addEventListener("odschange", () => showError(fields[3], false));

  const logoPreview = document.getElementById("pf-logo-preview");
  fields[1].input.addEventListener("change", () => {
    const file = fields[1].input.files[0];
    if (!file) {
      logoPreview.hidden = true;
      logoPreview.removeAttribute("src");
      return;
    }
    logoPreview.src = URL.createObjectURL(file);
    logoPreview.hidden = false;
  });

  const showSuccess = () => {
    current = successIndex;
    updateUI();
    nav.style.display = "none";
  };

  const submitForm = async () => {
    nextBtn.disabled = true;
    nextBtn.textContent = "Enviando imagem...";
    try {
      const file = fields[1].input.files[0];
      const path = `projectLogos/${Date.now()}-${file.name}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file);
      const logoUrl = await getDownloadURL(fileRef);

      nextBtn.textContent = "Enviando...";
      await addDoc(collection(db, "projectSubmissions"), {
        name: fields[0].input.value.trim(),
        logo: logoUrl,
        description: fields[2].input.value.trim(),
        ods: Array.from(selectedOds),
        link: fields[4].input.value.trim() || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      showSuccess();
    } catch (err) {
      console.error("Falha ao enviar projeto", err);
      nextBtn.disabled = false;
      nextBtn.textContent = "Enviar projeto";
      alert("Não foi possível enviar agora. Tente de novo em instantes.");
    }
  };

  nextBtn.addEventListener("click", () => {
    if (!validateCurrent()) return;
    if (current < fieldCount - 1) goTo(current + 1);
    else submitForm();
  });
  backBtn.addEventListener("click", () => goTo(current - 1));
  form.addEventListener("submit", (event) => event.preventDefault());

  fields.forEach((field, index) => {
    if (field.isOds) return;
    field.input.addEventListener("input", () => showError(field, false));
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

init();
