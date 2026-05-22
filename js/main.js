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
