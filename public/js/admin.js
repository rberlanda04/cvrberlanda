// Painel escondido (não linkado no site) pra gerenciar o portfólio de
// projetos, os eventos e revisar mensagens de contato. Protegido por login
// (Firebase Auth, só a conta configurada em ALLOWED_EMAIL consegue entrar).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
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
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const ALLOWED_EMAIL = "r.berlanda04@gmail.com";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatEventDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_LABEL = { pending: "Pendente", approved: "Aprovado", rejected: "Reprovado" };

/* ---------------------------------------------------------
   Abas do painel
   --------------------------------------------------------- */
function setupTabs() {
  const tabs = document.querySelectorAll(".admin-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
      document.querySelectorAll(".admin-section[id^='tab-']").forEach((section) => {
        section.hidden = section.id !== `tab-${tab.dataset.tab}`;
      });
    });
  });
}

/* ---------------------------------------------------------
   Modal genérico (criar/editar projeto ou evento)
   --------------------------------------------------------- */
const modalOverlay = document.getElementById("admin-modal-overlay");
const modalTitle = document.getElementById("admin-modal-title");
const modalFields = document.getElementById("admin-modal-fields");
const modalError = document.getElementById("admin-modal-error");
const modalForm = document.getElementById("admin-modal-form");
const modalSaveBtn = document.getElementById("admin-modal-save");

function openModal(title) {
  modalTitle.textContent = title;
  modalError.textContent = "";
  modalSaveBtn.disabled = false;
  modalSaveBtn.textContent = "Salvar";
  modalOverlay.hidden = false;
}
function closeModal() {
  modalOverlay.hidden = true;
  modalFields.innerHTML = "";
  modalForm.onsubmit = null;
}
document.getElementById("admin-modal-close").addEventListener("click", closeModal);
document.getElementById("admin-modal-cancel").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) closeModal();
});

function buildDropzoneHtml(labelText, existingUrl) {
  return `
    <div class="admin-field">
      <label>${labelText}</label>
      <div class="admin-dropzone" id="modal-dropzone" tabindex="0" role="button">
        <img class="admin-dropzone-preview" id="modal-dropzone-preview" alt="" ${existingUrl ? "" : "hidden"} src="${existingUrl || ""}" />
        <div class="admin-dropzone-empty" id="modal-dropzone-empty" ${existingUrl ? "hidden" : ""}>
          <svg class="pf-dropzone-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M12 4 7 9M12 4l5 5" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
          <span>Arraste uma imagem ou <strong>clique para escolher</strong></span>
        </div>
        <input type="file" id="modal-dropzone-input" accept="image/*" class="pf-dropzone-input" tabindex="-1" />
      </div>
      <p class="pf-note">${existingUrl ? "Deixe em branco pra manter a imagem atual." : "JPG, PNG ou WebP, até 5MB."}</p>
    </div>
  `;
}

function wireDropzone() {
  const dropzone = document.getElementById("modal-dropzone");
  const input = document.getElementById("modal-dropzone-input");
  const preview = document.getElementById("modal-dropzone-preview");
  const empty = document.getElementById("modal-dropzone-empty");

  const show = () => {
    const file = input.files[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    empty.hidden = true;
  };

  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener("change", show);
  ["dragenter", "dragover"].forEach((evtName) =>
    dropzone.addEventListener(evtName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );
  ["dragleave", "dragend"].forEach((evtName) =>
    dropzone.addEventListener(evtName, () => dropzone.classList.remove("is-dragover"))
  );
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    show();
  });
}

async function uploadIfNeeded(pathPrefix, existingUrl) {
  const input = document.getElementById("modal-dropzone-input");
  const file = input.files[0];
  if (!file) return existingUrl || "";
  if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Escolha uma imagem (JPG, PNG ou WebP) de até 5MB.");
  }
  const fileRef = ref(storage, `${pathPrefix}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

/* ---------------------------------------------------------
   Portfólio de projetos
   --------------------------------------------------------- */
function buildOdsGridHtml(selected) {
  return ODS_LIST.map((goal) => {
    const label = `${goal.n} — ${goal.name}`;
    const isSelected = selected.includes(label);
    return `<button type="button" class="ods-option" data-label="${label}" aria-pressed="${isSelected}" title="${label}">
      <img src="assets/logos/ods/ods-${goal.n}.png" alt="ODS ${label}" />
    </button>`;
  }).join("");
}

function wireOdsGrid() {
  const grid = document.getElementById("modal-ods-grid");
  grid.querySelectorAll(".ods-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!pressed));
    });
  });
}

function getSelectedOds() {
  return Array.from(document.querySelectorAll("#modal-ods-grid .ods-option[aria-pressed='true']")).map(
    (btn) => btn.dataset.label
  );
}

function openProjectModal(existing, docId) {
  const isEdit = !!existing;
  openModal(isEdit ? "Editar projeto" : "Novo projeto");
  const data = existing || { name: "", description: "", link: "", ods: [], rating: "", status: "approved", logo: "" };

  modalFields.innerHTML = `
    <div class="admin-field">
      <label for="modal-name">Nome do projeto</label>
      <input type="text" id="modal-name" value="${data.name || ""}" />
    </div>
    ${buildDropzoneHtml("Logo do projeto", data.logo)}
    <div class="admin-field">
      <label for="modal-description">Descrição</label>
      <textarea id="modal-description" rows="3">${data.description || ""}</textarea>
    </div>
    <div class="admin-field">
      <label>ODS relacionado</label>
      <div class="ods-grid" id="modal-ods-grid">${buildOdsGridHtml(data.ods || [])}</div>
    </div>
    <div class="admin-field">
      <label for="modal-link">Link do projeto (opcional)</label>
      <input type="url" id="modal-link" value="${data.link || ""}" placeholder="https://..." />
    </div>
    <div class="admin-field-row">
      <div class="admin-field">
        <label for="modal-status">Status</label>
        <select id="modal-status">
          <option value="approved" ${data.status === "approved" ? "selected" : ""}>Aprovado</option>
          <option value="pending" ${data.status === "pending" ? "selected" : ""}>Pendente</option>
          <option value="rejected" ${data.status === "rejected" ? "selected" : ""}>Reprovado</option>
        </select>
      </div>
      <div class="admin-field">
        <label for="modal-rating">Nota (1-10)</label>
        <input type="number" id="modal-rating" min="1" max="10" step="1" value="${data.rating || ""}" />
      </div>
    </div>
  `;
  wireDropzone();
  wireOdsGrid();

  modalForm.onsubmit = async (event) => {
    event.preventDefault();
    modalError.textContent = "";

    const name = document.getElementById("modal-name").value.trim();
    const description = document.getElementById("modal-description").value.trim();
    const link = document.getElementById("modal-link").value.trim();
    const status = document.getElementById("modal-status").value;
    const ratingRaw = document.getElementById("modal-rating").value;
    const rating = ratingRaw ? Number(ratingRaw) : null;
    const ods = getSelectedOds();

    if (name.length < 3) {
      modalError.textContent = "Digite o nome do projeto.";
      return;
    }
    if (description.length < 10) {
      modalError.textContent = "Descreva o projeto com pelo menos 10 caracteres.";
      return;
    }
    if (status === "approved" && (!Number.isInteger(rating) || rating < 1 || rating > 10)) {
      modalError.textContent = "Dê uma nota de 1 a 10 pra aprovar o projeto.";
      return;
    }

    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = "Salvando...";
    try {
      const logo = await uploadIfNeeded("projectLogos", data.logo);
      if (!logo) {
        modalError.textContent = "Escolha uma imagem de logo.";
        modalSaveBtn.disabled = false;
        modalSaveBtn.textContent = "Salvar";
        return;
      }
      const payload = { name, logo, description, ods, link: link || null, status };
      if (rating) payload.rating = rating;

      if (isEdit) {
        await updateDoc(doc(db, "projectSubmissions", docId), payload);
      } else {
        await addDoc(collection(db, "projectSubmissions"), { ...payload, createdAt: serverTimestamp() });
      }
      closeModal();
      loadProjects();
    } catch (err) {
      console.error("Falha ao salvar projeto", err);
      modalError.textContent = err.message || "Não foi possível salvar. Tente de novo.";
      modalSaveBtn.disabled = false;
      modalSaveBtn.textContent = "Salvar";
    }
  };
}

async function deleteProject(docId) {
  if (!confirm("Excluir este projeto do portfólio? Essa ação não pode ser desfeita.")) return;
  await deleteDoc(doc(db, "projectSubmissions", docId));
  loadProjects();
}

async function loadProjects() {
  const list = document.getElementById("projects-list");
  const empty = document.getElementById("projects-empty");
  list.innerHTML = "";

  let snapshot;
  try {
    snapshot = await getDocs(query(collection(db, "projectSubmissions"), orderBy("createdAt", "desc")));
  } catch (err) {
    empty.textContent = "Erro ao carregar (as regras do Firestore ainda não foram publicadas no Console).";
    return;
  }
  document.getElementById("stat-projects").textContent = snapshot.size;
  if (snapshot.empty) {
    empty.textContent = "Nenhum projeto ainda — clique em \"+ Novo projeto\" pra adicionar o primeiro.";
    return;
  }
  empty.remove();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const card = el("article", "admin-card");
    const odsText = Array.isArray(data.ods) ? data.ods.join(" · ") : "";
    card.innerHTML = `
      <div class="admin-card-head">
        <img class="admin-card-logo" src="${data.logo || ""}" alt="" onerror="this.style.visibility='hidden'" />
        <div>
          <p class="admin-card-title">${data.name || "(sem nome)"}</p>
          <p class="admin-card-meta">${formatDate(data.createdAt)}${data.rating ? ` · Nota ${data.rating}` : ""}</p>
        </div>
        <span class="admin-status admin-status-${data.status}">${STATUS_LABEL[data.status] || data.status}</span>
      </div>
      <p class="admin-card-desc">${data.description || ""}</p>
      ${odsText ? `<p class="admin-card-ods">${odsText}</p>` : ""}
      ${data.link ? `<a class="timeline-link" href="${data.link}" target="_blank" rel="noopener noreferrer">Ver link ${"↗"}</a>` : ""}
    `;

    const actions = el("div", "admin-card-actions");
    const editBtn = el("button", "wizard-nav-btn", "Editar");
    const deleteBtn = el("button", "wizard-nav-btn admin-delete-btn", "Excluir");
    editBtn.type = "button";
    deleteBtn.type = "button";
    editBtn.addEventListener("click", () => openProjectModal(data, docSnap.id));
    deleteBtn.addEventListener("click", () => deleteProject(docSnap.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

document.getElementById("new-project-btn").addEventListener("click", () => openProjectModal(null, null));

/* ---------------------------------------------------------
   Eventos
   --------------------------------------------------------- */
function openEventModal(existing, docId) {
  const isEdit = !!existing;
  openModal(isEdit ? "Editar evento" : "Novo evento");
  const data = existing || { title: "", date: "", location: "", description: "", link: "", image: "" };

  modalFields.innerHTML = `
    <div class="admin-field">
      <label for="modal-name">Título do evento</label>
      <input type="text" id="modal-name" value="${data.title || ""}" />
    </div>
    <div class="admin-field-row">
      <div class="admin-field">
        <label for="modal-date">Data</label>
        <input type="date" id="modal-date" value="${data.date || ""}" />
      </div>
      <div class="admin-field">
        <label for="modal-location">Local (opcional)</label>
        <input type="text" id="modal-location" value="${data.location || ""}" placeholder="Ex.: Colégio Marista Anjo da Guarda" />
      </div>
    </div>
    <div class="admin-field">
      <label for="modal-description">Descrição</label>
      <textarea id="modal-description" rows="3">${data.description || ""}</textarea>
    </div>
    ${buildDropzoneHtml("Imagem (opcional)", data.image)}
    <div class="admin-field">
      <label for="modal-link">Link (opcional)</label>
      <input type="url" id="modal-link" value="${data.link || ""}" placeholder="https://..." />
    </div>
  `;
  wireDropzone();

  modalForm.onsubmit = async (event) => {
    event.preventDefault();
    modalError.textContent = "";

    const title = document.getElementById("modal-name").value.trim();
    const eventDate = document.getElementById("modal-date").value;
    const location = document.getElementById("modal-location").value.trim();
    const description = document.getElementById("modal-description").value.trim();
    const link = document.getElementById("modal-link").value.trim();

    if (title.length < 3) {
      modalError.textContent = "Digite o título do evento.";
      return;
    }
    if (!eventDate) {
      modalError.textContent = "Escolha a data do evento.";
      return;
    }

    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = "Salvando...";
    try {
      const image = await uploadIfNeeded("eventImages", data.image);
      const payload = {
        title,
        date: eventDate,
        location: location || null,
        description,
        image: image || null,
        link: link || null,
      };

      if (isEdit) {
        await updateDoc(doc(db, "events", docId), payload);
      } else {
        await addDoc(collection(db, "events"), { ...payload, createdAt: serverTimestamp() });
      }
      closeModal();
      loadEvents();
    } catch (err) {
      console.error("Falha ao salvar evento", err);
      modalError.textContent = err.message || "Não foi possível salvar. Tente de novo.";
      modalSaveBtn.disabled = false;
      modalSaveBtn.textContent = "Salvar";
    }
  };
}

async function deleteEvent(docId) {
  if (!confirm("Excluir este evento? Essa ação não pode ser desfeita.")) return;
  await deleteDoc(doc(db, "events", docId));
  loadEvents();
}

async function loadEvents() {
  const list = document.getElementById("events-list");
  const empty = document.getElementById("events-empty");
  list.innerHTML = "";

  let snapshot;
  try {
    snapshot = await getDocs(query(collection(db, "events"), orderBy("date", "desc")));
  } catch (err) {
    empty.textContent = "Erro ao carregar (as regras do Firestore ainda não foram publicadas no Console).";
    return;
  }
  document.getElementById("stat-events").textContent = snapshot.size;
  if (snapshot.empty) {
    empty.textContent = "Nenhum evento ainda — clique em \"+ Novo evento\" pra adicionar o primeiro.";
    return;
  }
  empty.remove();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const card = el("article", "admin-card");
    card.innerHTML = `
      <div class="admin-card-head">
        ${data.image ? `<img class="admin-card-logo" src="${data.image}" alt="" onerror="this.style.visibility='hidden'" />` : ""}
        <div>
          <p class="admin-card-title">${data.title || "(sem título)"}</p>
          <p class="admin-card-meta">${formatEventDate(data.date)}${data.location ? ` · ${data.location}` : ""}</p>
        </div>
      </div>
      <p class="admin-card-desc">${data.description || ""}</p>
      ${data.link ? `<a class="timeline-link" href="${data.link}" target="_blank" rel="noopener noreferrer">Ver link ${"↗"}</a>` : ""}
    `;

    const actions = el("div", "admin-card-actions");
    const editBtn = el("button", "wizard-nav-btn", "Editar");
    const deleteBtn = el("button", "wizard-nav-btn admin-delete-btn", "Excluir");
    editBtn.type = "button";
    deleteBtn.type = "button";
    editBtn.addEventListener("click", () => openEventModal(data, docSnap.id));
    deleteBtn.addEventListener("click", () => deleteEvent(docSnap.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

document.getElementById("new-event-btn").addEventListener("click", () => openEventModal(null, null));

/* ---------------------------------------------------------
   Mensagens de contato (só leitura)
   --------------------------------------------------------- */
async function loadMessages() {
  const list = document.getElementById("messages-list");
  const empty = document.getElementById("messages-empty");
  list.innerHTML = "";

  let snapshot;
  try {
    snapshot = await getDocs(query(collection(db, "contactMessages"), orderBy("createdAt", "desc")));
  } catch (err) {
    empty.textContent = "Erro ao carregar (as regras do Firestore ainda não foram publicadas no Console).";
    return;
  }
  document.getElementById("stat-messages").textContent = snapshot.size;
  if (snapshot.empty) {
    empty.textContent = "Nenhuma mensagem ainda.";
    return;
  }
  empty.remove();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const card = el("article", "admin-card");
    card.innerHTML = `
      <div class="admin-card-head">
        <div>
          <p class="admin-card-title">${data.name || "(sem nome)"}</p>
          <p class="admin-card-meta">
            ${data.email ? `<a href="mailto:${data.email}">${data.email}</a> · ` : ""}${formatDate(data.createdAt)}
          </p>
        </div>
      </div>
      <p class="admin-card-title" style="font-size: 0.95rem;">${data.subject || ""}</p>
      <p class="admin-card-desc">${data.message || ""}</p>
    `;
    list.appendChild(card);
  });
}

async function loadVisitCount() {
  const el = document.getElementById("stat-visits");
  try {
    const snap = await getDoc(doc(db, "stats", "siteVisits"));
    el.textContent = snap.exists() ? snap.data().count : 0;
  } catch (err) {
    el.textContent = "—";
  }
}

/* ---------------------------------------------------------
   Login
   --------------------------------------------------------- */
function showDashboard() {
  document.getElementById("admin-login-wrap").hidden = true;
  document.getElementById("admin-dashboard").hidden = false;
  loadVisitCount();
  loadProjects();
  loadEvents();
  loadMessages();
}

function showLogin() {
  document.getElementById("admin-login-wrap").hidden = false;
  document.getElementById("admin-dashboard").hidden = true;
}

onAuthStateChanged(auth, (user) => {
  if (user && user.email === ALLOWED_EMAIL) {
    showDashboard();
  } else if (user) {
    document.getElementById("admin-login-error").textContent =
      "Essa conta Google não tem acesso ao painel.";
    signOut(auth);
  } else {
    showLogin();
  }
});

document.getElementById("admin-google-btn").addEventListener("click", async () => {
  const errorEl = document.getElementById("admin-login-error");
  const btn = document.getElementById("admin-google-btn");
  errorEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Entrando...";
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    errorEl.textContent = `Não foi possível entrar com o Google. (${err.code || err.message})`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar com Google";
  }
});

document.getElementById("admin-logout").addEventListener("click", () => signOut(auth));

setupTabs();
