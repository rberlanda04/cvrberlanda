// Página escondida (não linkada no currículo): formulário pra alunos/turmas
// cadastrarem um projeto. Grava em "projectSubmissions" com status "pending" —
// a revisão de quais sobem pro portfólio é manual, pelo Console do Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
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

// Os 17 Objetivos de Desenvolvimento Sustentável (ONU), nome oficial em português.
const ODS_LIST = [
  "1 — Erradicação da Pobreza",
  "2 — Fome Zero e Agricultura Sustentável",
  "3 — Saúde e Bem-Estar",
  "4 — Educação de Qualidade",
  "5 — Igualdade de Gênero",
  "6 — Água Potável e Saneamento",
  "7 — Energia Limpa e Acessível",
  "8 — Trabalho Decente e Crescimento Econômico",
  "9 — Indústria, Inovação e Infraestrutura",
  "10 — Redução das Desigualdades",
  "11 — Cidades e Comunidades Sustentáveis",
  "12 — Consumo e Produção Responsáveis",
  "13 — Ação Contra a Mudança Global do Clima",
  "14 — Vida na Água",
  "15 — Vida Terrestre",
  "16 — Paz, Justiça e Instituições Eficazes",
  "17 — Parcerias e Meios de Implementação",
];

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function init() {
  const select = document.getElementById("pf-ods");
  ODS_LIST.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    select.appendChild(option);
  });

  const form = document.getElementById("project-form");
  const submitBtn = document.getElementById("pf-submit");
  const successPanel = document.getElementById("project-form-success");

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
      validate: (v) => isValidUrl(v.trim()),
      message: "Cole o link de uma imagem (começando com https://).",
    },
    {
      input: document.getElementById("pf-description"),
      error: document.getElementById("pf-error-description"),
      validate: (v) => v.trim().length >= 10,
      message: "Descreva o projeto com pelo menos 10 caracteres.",
    },
    {
      input: document.getElementById("pf-ods"),
      error: document.getElementById("pf-error-ods"),
      validate: (v) => v.trim().length > 0,
      message: "Selecione o ODS relacionado.",
    },
  ];
  const linkInput = document.getElementById("pf-link");

  const showError = (field, show) => {
    field.error.textContent = show ? field.message : "";
    field.input.classList.toggle("has-error", show);
    if (show) {
      field.input.classList.remove("shake");
      void field.input.offsetWidth;
      field.input.classList.add("shake");
    }
  };

  fields.forEach((field) => {
    const clear = () => showError(field, false);
    field.input.addEventListener("input", clear);
    field.input.addEventListener("change", clear);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    let firstInvalid = null;
    fields.forEach((field) => {
      const valid = field.validate(field.input.value);
      showError(field, !valid);
      if (!valid && !firstInvalid) firstInvalid = field.input;
    });
    if (linkInput.value.trim() && !isValidUrl(linkInput.value.trim())) {
      linkInput.classList.add("has-error");
      if (!firstInvalid) firstInvalid = linkInput;
    } else {
      linkInput.classList.remove("has-error");
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";
    try {
      await addDoc(collection(db, "projectSubmissions"), {
        name: fields[0].input.value.trim(),
        logo: fields[1].input.value.trim(),
        description: fields[2].input.value.trim(),
        ods: fields[3].input.value.trim(),
        link: linkInput.value.trim() || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      form.hidden = true;
      successPanel.hidden = false;
    } catch (err) {
      console.error("Falha ao enviar projeto", err);
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar projeto";
      alert("Não foi possível enviar agora. Tente de novo em instantes.");
    }
  });
}

init();
