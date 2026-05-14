import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  deleteDoc, updateDoc, query, orderBy, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ══════════════════════════════════════════════════════
//  KONFIGURACE — doplňte hodnoty z Firebase Console
//  a z emailjs.com
// ══════════════════════════════════════════════════════
const FB = {
  apiKey:            "FIREBASE_API_KEY",
  authDomain:        "FIREBASE_PROJECT_ID.firebaseapp.com",
  projectId:         "FIREBASE_PROJECT_ID",
  storageBucket:     "FIREBASE_PROJECT_ID.appspot.com",
  messagingSenderId: "FIREBASE_SENDER_ID",
  appId:             "FIREBASE_APP_ID"
};
const EJS = {
  publicKey:   "EMAILJS_PUBLIC_KEY",
  serviceId:   "EMAILJS_SERVICE_ID",
  templateId:  "EMAILJS_TEMPLATE_ID",
};
// ══════════════════════════════════════════════════════

const app  = initializeApp(FB);
const auth = getAuth(app);
const db   = getFirestore(app);
const st   = getStorage(app);
emailjs.init(EJS.publicKey);

// ── AUTH ──
onAuthStateChanged(auth, u => {
  if (u) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('sb-email').textContent = u.email;
    loadAll();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
});

const loginHandler = async () => {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  document.getElementById('l-err').textContent = '';
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch { document.getElementById('l-err').textContent = 'Nesprávné přihlašovací údaje.'; }
};
document.getElementById('l-btn').addEventListener('click', loginHandler);
document.getElementById('l-pass').addEventListener('keydown', e => e.key==='Enter' && loginHandler());
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// ── TABS ──
window.goTab = function(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
};
document.querySelectorAll('.sb-link').forEach(b => b.addEventListener('click', () => goTab(b.dataset.tab)));

async function loadAll() {
  await Promise.all([loadGallery(), loadNews(), loadPopup(), loadSubs()]);
  updateDash();
}

// ── GALLERY ──
let photos = [];

async function loadGallery() {
  document.getElementById('gal-loading').style.display = 'flex';
  const snap = await getDocs(query(collection(db,'gallery'), orderBy('createdAt','desc')));
  photos = snap.docs.map(d => ({id:d.id,...d.data()}));
  renderGallery();
  document.getElementById('gal-loading').style.display = 'none';
}

function renderGallery() {
  document.getElementById('gallery-grid').innerHTML = photos.map(p => `
    <div class="gal-item">
      <img src="${p.url}" alt="">
      <button class="gal-del" onclick="delPhoto('${p.id}','${p.path}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');
}

const zone = document.getElementById('upload-zone');
const fi   = document.getElementById('gal-file');
zone.addEventListener('click', () => fi.click());
zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); uploadFiles(e.dataTransfer.files); });
fi.addEventListener('change', () => uploadFiles(fi.files));

async function uploadFiles(files) {
  for (const f of files) {
    if (f.size > 5*1024*1024) { alert2('gal-alert','err',`${f.name} je příliš velký (max 5 MB).`); continue; }
    const path = `gallery/${Date.now()}_${f.name}`;
    await uploadBytes(ref(st, path), f);
    const url = await getDownloadURL(ref(st, path));
    const r2 = await addDoc(collection(db,'gallery'), {url, path, name:f.name, createdAt:serverTimestamp()});
    photos.unshift({id:r2.id, url, path, name:f.name});
    renderGallery();
  }
  alert2('gal-alert','ok','Fotky nahrány.'); updateDash(); fi.value='';
}

window.delPhoto = async (id, path) => {
  if (!confirm('Smazat fotku?')) return;
  try { await deleteObject(ref(st, path)); } catch {}
  await deleteDoc(doc(db,'gallery',id));
  photos = photos.filter(p => p.id !== id);
  renderGallery(); updateDash();
  alert2('gal-alert','ok','Fotka smazána.');
};

// ── NEWS ──
let articles = [];

async function loadNews() {
  document.getElementById('news-loading').style.display = 'flex';
  const snap = await getDocs(query(collection(db,'news'), orderBy('date','desc')));
  articles = snap.docs.map(d => ({id:d.id,...d.data()}));
  renderNews();
  document.getElementById('news-loading').style.display = 'none';
}

function renderNews() {
  const el = document.getElementById('news-list');
  if (!articles.length) { el.innerHTML = '<div style="color:var(--muted);font-size:.84rem;padding:10px 0">Žádné aktuality.</div>'; return; }
  el.innerHTML = articles.map(a => `
    <div class="ni">
      <div class="ni-left"><div class="ni-title">${a.title}</div><div class="ni-meta">${a.date||''}</div></div>
      <span class="badge ${a.status==='published'?'badge-green':'badge-gray'}">${a.status==='published'?'Publikováno':'Koncept'}</span>
      <div class="ni-actions">
        <button class="btn btn-sm btn-outline" onclick="editNews('${a.id}')">Upravit</button>
        <button class="btn btn-sm btn-danger" onclick="delNews('${a.id}')">Smazat</button>
      </div>
    </div>`).join('');
}

window.openEditor = function() {
  const ed = document.getElementById('news-editor');
  ed.classList.add('open');
  document.getElementById('ed-id').value = '';
  document.getElementById('ed-title').value = '';
  document.getElementById('ed-perex').value = '';
  document.getElementById('ed-body').value = '';
  document.getElementById('ed-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('ed-status').value = 'published';
  document.getElementById('ed-label').textContent = 'Nová aktualita';
  ed.scrollIntoView({behavior:'smooth'});
};

window.closeEditor = () => document.getElementById('news-editor').classList.remove('open');

window.editNews = function(id) {
  const a = articles.find(x => x.id===id); if (!a) return;
  document.getElementById('ed-id').value = id;
  document.getElementById('ed-title').value = a.title||'';
  document.getElementById('ed-perex').value = a.perex||'';
  document.getElementById('ed-body').value = a.body||'';
  document.getElementById('ed-date').value = a.date||'';
  document.getElementById('ed-status').value = a.status||'published';
  document.getElementById('ed-label').textContent = 'Upravit aktualitu';
  const ed = document.getElementById('news-editor');
  ed.classList.add('open'); ed.scrollIntoView({behavior:'smooth'});
};

window.saveNews = async function() {
  const id = document.getElementById('ed-id').value;
  const data = {
    title:  document.getElementById('ed-title').value.trim(),
    perex:  document.getElementById('ed-perex').value.trim(),
    body:   document.getElementById('ed-body').value.trim(),
    date:   document.getElementById('ed-date').value,
    status: document.getElementById('ed-status').value,
    updatedAt: serverTimestamp()
  };
  if (!data.title) { alert2('news-alert','err','Vyplňte nadpis.'); return; }
  if (id) {
    await updateDoc(doc(db,'news',id), data);
    const i = articles.findIndex(x => x.id===id);
    if (i!==-1) articles[i] = {id,...data};
  } else {
    const r = await addDoc(collection(db,'news'), {...data, createdAt:serverTimestamp()});
    articles.unshift({id:r.id,...data});
  }
  renderNews(); window.closeEditor(); updateDash();
  alert2('news-alert','ok','Aktualita uložena.');
};

window.delNews = async function(id) {
  if (!confirm('Smazat tuto aktualitu?')) return;
  await deleteDoc(doc(db,'news',id));
  articles = articles.filter(a => a.id!==id);
  renderNews(); updateDash();
};

// ── POPUP ──
let popEnabled = false;

async function loadPopup() {
  const snap = await getDoc(doc(db,'settings','popup'));
  if (snap.exists()) {
    const d = snap.data();
    popEnabled = !!d.enabled;
    document.getElementById('pu-title').value    = d.title   ||'';
    document.getElementById('pu-body').value     = d.body    ||'';
    document.getElementById('pu-cta-text').value = d.ctaText ||'';
    document.getElementById('pu-cta-url').value  = d.ctaUrl  ||'';
    document.getElementById('pu-img').value      = d.imgUrl  ||'';
    document.getElementById('pu-days').value     = d.days    ||7;
  }
  syncToggle();
}

function syncToggle() {
  document.getElementById('popup-toggle').classList.toggle('on', popEnabled);
  document.getElementById('s-popup').textContent = popEnabled ? 'ZAP' : 'VYP';
}
document.getElementById('popup-toggle').addEventListener('click', () => { popEnabled=!popEnabled; syncToggle(); });

window.savePopup = async function() {
  await setDoc(doc(db,'settings','popup'), {
    enabled: popEnabled,
    title:   document.getElementById('pu-title').value.trim(),
    body:    document.getElementById('pu-body').value.trim(),
    ctaText: document.getElementById('pu-cta-text').value.trim(),
    ctaUrl:  document.getElementById('pu-cta-url').value.trim(),
    imgUrl:  document.getElementById('pu-img').value.trim(),
    days:    parseInt(document.getElementById('pu-days').value)||7,
  });
  alert2('popup-alert','ok','Nastavení popupu uloženo.');
};

// ── SUBSCRIBERS ──
let subs = [];

async function loadSubs() {
  document.getElementById('sub-loading').style.display = 'flex';
  const snap = await getDocs(query(collection(db,'subscribers'), orderBy('createdAt','desc')));
  subs = snap.docs.map(d => ({id:d.id,...d.data()}));
  renderSubs();
  document.getElementById('sub-loading').style.display = 'none';
}

function renderSubs() {
  document.getElementById('sub-count').textContent = subs.length+' odběratelů';
  const el = document.getElementById('sub-list');
  if (!subs.length) { el.innerHTML = '<div style="color:var(--muted);font-size:.84rem;padding:8px 0">Zatím žádní odběratelé.</div>'; return; }
  el.innerHTML = subs.map(s => `
    <div class="si">
      <span class="si-email">${s.email}</span>
      <span class="si-date">${s.createdAt?.toDate?s.createdAt.toDate().toLocaleDateString('cs'):''}</span>
      <button class="si-del" onclick="delSub('${s.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>`).join('');
}

window.delSub = async function(id) {
  if (!confirm('Odebrat odběratele?')) return;
  await deleteDoc(doc(db,'subscribers',id));
  subs = subs.filter(s => s.id!==id);
  renderSubs(); updateDash();
};

// ── SEND MAIL ──
window.sendMail = async function() {
  const subject = document.getElementById('m-subject').value.trim();
  const body    = document.getElementById('m-body').value.trim();
  if (!subject||!body) { alert2('mail-alert','err','Vyplňte předmět i text.'); return; }
  if (!subs.length)    { alert2('mail-alert','err','Žádní odběratelé.'); return; }

  const btn = document.getElementById('m-send-btn');
  const prog = document.getElementById('mail-progress');
  const bar  = document.getElementById('m-bar');
  const txt  = document.getElementById('m-txt');
  btn.disabled = true; prog.style.display = 'block';

  let sent=0, failed=0;
  for (const s of subs) {
    try {
      await emailjs.send(EJS.serviceId, EJS.templateId, {
        to_email: s.email, subject, message: body, gym_name: 'KORUNA GYM Kolín'
      });
      sent++;
    } catch { failed++; }
    const pct = Math.round(((sent+failed)/subs.length)*100);
    bar.style.width = pct+'%';
    txt.textContent = `Odesláno ${sent+failed} / ${subs.length}…`;
    await new Promise(r => setTimeout(r,150));
  }
  btn.disabled = false; prog.style.display = 'none'; bar.style.width='0%';
  alert2('mail-alert', failed?'err':'ok', failed?`Odesláno ${sent}, selhalo ${failed}.`:`Úspěšně odesláno ${sent} e-mailů.`);
};

// ── DASHBOARD ──
function updateDash() {
  document.getElementById('s-photos').textContent = photos.length;
  document.getElementById('s-news').textContent   = articles.filter(a=>a.status==='published').length;
  document.getElementById('s-subs').textContent   = subs.length;
}

// ── HELPERS ──
function alert2(id, type, msg) {
  const icon = type==='ok'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  const el = document.getElementById(id);
  el.innerHTML = `<div class="alert alert-${type==='ok'?'ok':'err'}">${icon}${msg}</div>`;
  setTimeout(()=>{ if(el) el.innerHTML=''; }, 4000);
}
