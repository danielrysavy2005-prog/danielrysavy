import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, query, orderBy, where, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── KONFIGURACE ──
const FB = {
  apiKey:            "AIzaSyA5K4Fg_8rz2FMm-7-rVvUKFh-x-lQClZM",
  authDomain:        "koruna-gym.firebaseapp.com",
  projectId:         "koruna-gym",
  messagingSenderId: "929249699163",
  appId:             "1:929249699163:web:5357f7e4147fcbc95ca67e"
};

const app = initializeApp(FB);
const db  = getFirestore(app);

// ── NAV SCROLL ──
const nav = document.getElementById('nav');
window.addEventListener('scroll', () =>
  nav.classList.toggle('scrolled', window.scrollY > 40));

// ── MOBILE MENU ──
document.getElementById('hamBtn').addEventListener('click', () =>
  document.getElementById('mobNav').classList.add('open'));
document.getElementById('mobClose').addEventListener('click', () =>
  document.getElementById('mobNav').classList.remove('open'));
window.closeMob = function() {
  document.getElementById('mobNav').classList.remove('open');
};

// ── SCROLL REVEAL ──
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.r').forEach(el => obs.observe(el));

// ── GALLERY ──
(async () => {
  const el = document.getElementById('dyn-gallery');
  try {
    const snap = await getDocs(query(collection(db,'gallery'), orderBy('createdAt','desc')));
    if (snap.empty) { el.innerHTML = '<div style="color:var(--warm-gray);font-size:.88rem">Galerie bude brzy doplněna.</div>'; return; }
    el.innerHTML = snap.docs.map(d => {
      const {url, name} = d.data();
      return `<img src="${url}" alt="${name||''}" loading="lazy">`;
    }).join('');
  } catch { el.innerHTML = ''; }
})();

// ── AKTUALITY ──
(async () => {
  const el = document.getElementById('news-cards');
  try {
    const snap = await getDocs(query(
      collection(db,'news'),
      where('status','==','published'),
      orderBy('date','desc')
    ));
    if (snap.empty) { el.innerHTML = '<div style="color:var(--warm-gray);font-size:.88rem">Aktuality připravujeme.</div>'; return; }
    el.innerHTML = snap.docs.map(d => {
      const {title, perex, date} = d.data();
      return `<div class="nc r">
        <div class="nc-date">${date||''}</div>
        <h3 class="nc-title">${title}</h3>
        <p class="nc-perex">${perex||''}</p>
      </div>`;
    }).join('');
    // trigger scroll reveal for dynamically added elements
    document.querySelectorAll('.nc.r').forEach(el => obs.observe(el));
  } catch { el.innerHTML = ''; }
})();

// ── POPUP ──
(async () => {
  try {
    const snap = await getDoc(doc(db,'settings','popup'));
    if (!snap.exists()) return;
    const d = snap.data();
    if (!d.enabled) return;
    const key = 'popup_seen';
    const lastSeen = localStorage.getItem(key);
    const days = d.days || 7;
    if (lastSeen && (Date.now() - Number(lastSeen)) < days * 86400000) return;
    document.getElementById('popup-title').textContent = d.title || '';
    document.getElementById('popup-body').textContent  = d.body  || '';
    if (d.ctaText && d.ctaUrl) {
      const cta = document.getElementById('popup-cta');
      cta.textContent = d.ctaText;
      cta.href = d.ctaUrl;
    } else {
      document.getElementById('popup-cta').style.display = 'none';
    }
    if (d.imgUrl) {
      const img = document.getElementById('popup-img');
      img.src = d.imgUrl;
      img.style.display = 'block';
    }
    setTimeout(() => document.getElementById('popup-overlay').classList.add('open'), 1800);
    localStorage.setItem(key, Date.now());
  } catch {}
})();

window.closePopup = function() {
  document.getElementById('popup-overlay').classList.remove('open');
};
document.getElementById('popup-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('popup-overlay')) window.closePopup();
});

// ── NEWSLETTER ──
window.subscribeNewsletter = async function(e) {
  e.preventDefault();
  const email = document.getElementById('nl-email').value.trim();
  if (!email) return false;
  try {
    await addDoc(collection(db,'subscribers'), { email, createdAt: serverTimestamp() });
    document.getElementById('nl-form').style.display = 'none';
    const ok = document.getElementById('nl-ok');
    ok.style.display = 'block';
  } catch { alert('Nepodařilo se přihlásit k odběru. Zkuste to prosím znovu.'); }
  return false;
};
