# Currículo Web & Portfólio — Estrutura

Estrutura de site (HTML + CSS + JS puro, sem build) para um currículo web integrado a um portfólio de projetos e uma linha do tempo. Pensada para ser publicada no **Firebase Hosting** e para ser **replicada como produto**: todo o conteúdo pessoal fica em um único arquivo de dados, então uma nova pessoa/escola pode reaproveitar a mesma estrutura só trocando esse arquivo.

## Estrutura de pastas

```
cvrberlanda/
├── firebase.json          # configuração do Firebase Hosting
├── .firebaserc             # id do projeto Firebase (trocar antes do deploy)
└── public/                 # pasta publicada (raiz do site)
    ├── index.html           # marcação/seções da página
    ├── css/
    │   └── styles.css        # design system (tokens, tema claro/escuro, responsivo)
    ├── js/
    │   └── main.js            # lê data/profile.json e renderiza todas as seções
    └── data/
        └── profile.json        # TODO o conteúdo (nome, bio, experiência, linha do tempo, competições, contato)
```

## Como o conteúdo está organizado

O arquivo `public/data/profile.json` é a única fonte de conteúdo. Seções:

- `profile` — nome, cargo, tagline, localização, e-mail, redes sociais.
- `about` — texto "Sobre".
- `currentRoles` — cargos atuais (as duas escolas Marista + Izicode Edu).
- `projects` — os dois projetos mais robustos em desenvolvimento (Izicode Landing e WiW Speak/Learnfreehands), com stack, link do repositório e link de demo.
- `githubAccounts` — as 4 contas/organizações do GitHub (rberlanda01, izicripto, dbmox, rberlanda04) com uma linha de contexto de cada uma.
- `skills` — grupos de competências (Robótica & Maker, Educação & Currículo, Tecnologia & Inovação).
- `timeline` — a linha do tempo do portfólio, **em ordem cronológica**: primeiro os projetos mais antigos (`*.surge.sh`), depois os materiais didáticos (Gamma) e por fim o produto atual (`izicodeedu-532ac.web.app`). Cada item tem `era`, `title`, `org`, `type`, `description` e `url`.
- `competitions` — chips de olimpíadas/eventos (OBT, OBES, OBA, OBAFOG, OBR, FMR Hackathon Programar, Eventos Maker). Os nomes completos de cada sigla ficam marcados como ajuste fino no campo `footnote` — vale confirmar as edições/anos exatos antes de publicar.
- `mentoredProjects` — lista vazia de propósito: é o espaço para cadastrar, um a um, os projetos de estudantes mentorados (título, evento, descrição, e futuramente foto/link).
- `contact` — textos da seção de contato.

## Rodando localmente

O site usa `fetch()` para carregar o JSON, então **precisa ser servido por HTTP** — abrir `index.html` direto com duplo clique (`file://`) não funciona: o navegador bloqueia por CORS e a página fica com "Carregando…" para sempre.

### Opção mais simples: `start-local.bat`

Dê duplo clique em [`start-local.bat`](start-local.bat), na raiz do projeto. Ele sobe um servidor local na porta 8080 (usa o Python já instalado na máquina) e abre o site automaticamente no navegador. Para parar, feche a janela "Servidor local - Curriculo".

### Outras opções

```powershell
# usando o próprio Firebase CLI
firebase emulators:start --only hosting

# ou qualquer servidor estático, por exemplo com Node instalado
npx serve public
```

## Publicando no Firebase Hosting

1. Instalar o Firebase CLI (uma vez): `npm install -g firebase-tools`
2. Login: `firebase login`
3. Criar um projeto no [console do Firebase](https://console.firebase.google.com/) (ou reaproveitar um existente).
4. Editar `.firebaserc` e trocar `"SEU-PROJECT-ID-AQUI"` pelo ID real do projeto.
5. Deploy: `firebase deploy --only hosting`

O link gerado (algo como `https://SEU-PROJECT-ID.web.app`) passa a ser o portal público do currículo/portfólio.

## Replicando como produto para outra pessoa

1. Duplicar a pasta do projeto.
2. Substituir todo o conteúdo de `public/data/profile.json` pelos dados da nova pessoa.
3. Se quiser uma identidade visual diferente, ajustar só as variáveis no topo de `public/css/styles.css` (`--color-primary`, `--color-accent`, etc.) — o resto do layout se adapta automaticamente.
4. Trocar `.firebaserc` para o novo projeto Firebase e fazer o deploy.

Nenhum outro arquivo precisa ser tocado para o caso de uso básico — é por isso que a estrutura funciona como um template reaproveitável.

## Pendências / próximos ajustes sugeridos

- Preencher os links de redes sociais em `profile.social` (hoje vazios).
- Confirmar os nomes completos das siglas de competições em `competitions.items`.
- Popular `mentoredProjects.items` com os primeiros projetos de estudantes (fotos podem ir em `public/assets/`).
- Definir datas/anos reais para cada fase da linha do tempo, se quiser exibi-los (hoje a ordenação é só por sequência, sem datas fixas).
