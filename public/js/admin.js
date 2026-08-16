// Painel escondido (não linkado no site) pra revisar mensagens de contato e
// aprovar/reprovar projetos enviados pela página de cadastro. Protegido por
// login (Firebase Auth) — sem conta cadastrada no Firebase, ninguém entra.
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
  doc,
  updateDoc,
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
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// Reforça no cliente a mesma regra que já existe nas firestore.rules: só
// essa conta Google consegue usar o painel. Qualquer outra conta é
// deslogada na hora, com uma mensagem clara em vez de erro de permissão.
const ALLOWED_EMAIL = "r.berlanda04@gmail.com";

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

const STATUS_LABEL = { pending: "Pendente", approved: "Aprovado", rejected: "Reprovado" };

async function loadProjects() {
  const list = document.getElementById("projects-list");
  const empty = document.getElementById("projects-empty");
  list.innerHTML = "";

  const snapshot = await getDocs(query(collection(db, "projectSubmissions"), orderBy("createdAt", "desc")));
  if (snapshot.empty) {
    empty.textContent = "Nenhum projeto enviado ainda.";
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
          <p class="admin-card-meta">${formatDate(data.createdAt)}</p>
        </div>
        <span class="admin-status admin-status-${data.status}">${STATUS_LABEL[data.status] || data.status}</span>
      </div>
      <p class="admin-card-desc">${data.description || ""}</p>
      ${odsText ? `<p class="admin-card-ods">${odsText}</p>` : ""}
      ${data.link ? `<a class="timeline-link" href="${data.link}" target="_blank" rel="noopener noreferrer">Ver link ${"↗"}</a>` : ""}
    `;

    const actions = el("div", "admin-card-actions");
    const approveBtn = el("button", "btn btn-primary admin-approve-btn", "Aprovar");
    const rejectBtn = el("button", "wizard-nav-btn", "Reprovar");
    approveBtn.type = "button";
    rejectBtn.type = "button";
    approveBtn.disabled = data.status === "approved";
    rejectBtn.disabled = data.status === "rejected";

    approveBtn.addEventListener("click", async () => {
      approveBtn.disabled = true;
      await updateDoc(doc(db, "projectSubmissions", docSnap.id), { status: "approved" });
      loadProjects();
    });
    rejectBtn.addEventListener("click", async () => {
      rejectBtn.disabled = true;
      await updateDoc(doc(db, "projectSubmissions", docSnap.id), { status: "rejected" });
      loadProjects();
    });

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

async function loadMessages() {
  const list = document.getElementById("messages-list");
  const empty = document.getElementById("messages-empty");
  list.innerHTML = "";

  const snapshot = await getDocs(query(collection(db, "contactMessages"), orderBy("createdAt", "desc")));
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
          <p class="admin-card-meta">${formatDate(data.createdAt)}</p>
        </div>
      </div>
      <p class="admin-card-title" style="font-size: 0.95rem;">${data.subject || ""}</p>
      <p class="admin-card-desc">${data.message || ""}</p>
    `;
    list.appendChild(card);
  });
}

function showDashboard() {
  document.getElementById("admin-login-wrap").hidden = true;
  document.getElementById("admin-dashboard").hidden = false;
  loadProjects();
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
