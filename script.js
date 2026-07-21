// FAQ Accordion Trigger Toggle logic
function toggleFaq(button) {
  const item = button.parentElement;
  item.classList.toggle('open');
  const toggle = button.querySelector('.faq-tog');
  if(item.classList.contains('open')) {
    toggle.textContent = '−';
  } else {
    toggle.textContent = '+';
  }
}

// Modal Toggle Elements
const modal = document.getElementById('analyzer-modal');
const closeModal = document.getElementById('modal-close-btn');
const toast = document.getElementById('toast-notice');

function openModalFunc(defaultUrl = "") {
  modal.classList.add('open');
  if(defaultUrl) {
    document.getElementById('modal-input-url').value = defaultUrl;
  }
}

document.getElementById('btn-cta-submit').addEventListener('click', () => {
  const urlVal = document.querySelector('.cta-input').value;
  openModalFunc(urlVal);
});

closeModal.addEventListener('click', () => {
  modal.classList.remove('open');
});

modal.addEventListener('click', (e) => {
  if(e.target === modal) modal.classList.remove('open');
});

// ── OpenAI-powered site analysis ──────────────────────────────────────────
const WORKER_URL = 'https://sitelensfirstworker.sarkisavanessian.workers.dev';

// Results overlay markup (injected once)
const resultsOvHTML = `
<div class="modal-ov" id="results-modal">
  <div class="modal-box" style="max-width:640px;width:100%;">
    <button class="modal-close" id="results-close-btn">&times;</button>
    <div id="results-loading" style="text-align:center;padding:32px 0;">
      <div style="width:48px;height:48px;border:3px solid rgba(0,194,255,0.2);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
      <p style="color:var(--muted);font-size:15px;">Analyzing your website with AI…</p>
    </div>
    <div id="results-content" style="display:none;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">
        <div id="res-score-circle" style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 24px rgba(0,194,255,0.35);">
          <span id="res-score-num" style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#fff;"></span>
        </div>
        <div>
          <h3 style="font-family:'Syne';font-size:20px;color:#fff;margin-bottom:4px;" id="res-headline"></h3>
          <p style="font-size:13px;color:var(--muted);" id="res-url-display"></p>
        </div>
      </div>
      <div id="res-sections"></div>
      <p style="font-size:12px;color:var(--muted);margin-top:20px;line-height:1.6;">⚡ Analysis powered by OpenAI GPT-4o. Results are AI-generated estimates based on publicly available information about your domain.</p>
    </div>
    <div id="results-error" style="display:none;text-align:center;padding:24px 0;">
      <p style="color:#ff5757;font-size:15px;" id="results-error-msg">Something went wrong. Please try again.</p>
    </div>
  </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', resultsOvHTML);

const resultsModal = document.getElementById('results-modal');
document.getElementById('results-close-btn').addEventListener('click', () => resultsModal.classList.remove('open'));
resultsModal.addEventListener('click', e => { if (e.target === resultsModal) resultsModal.classList.remove('open'); });

async function analyzeWebsite(url, email, saveToDb = false) {
  resultsModal.classList.add('open');
  document.getElementById('results-loading').style.display = 'block';
  document.getElementById('results-content').style.display = 'none';
  document.getElementById('results-error').style.display = 'none';

  const prompt = `You are SiteLens, a professional website audit AI. A user has submitted the URL: "${url}".

Based on your knowledge of website best practices, SEO, design, mobile UX, and conversion optimization, provide a structured audit. Respond ONLY with valid JSON (no markdown, no explanation outside the JSON) in this exact shape:
{
  "score": <integer 0-100>,
  "headline": "<one-sentence verdict>",
  "sections": [
    {
      "title": "<category name>",
      "emoji": "<single emoji>",
      "rating": "<Good|Fair|Needs Work>",
      "insight": "<2-3 sentence specific insight for this URL>"
    }
  ]
}

Include exactly 5 sections covering: SEO, Page Speed, Design & UX, Mobile Experience, Conversion Optimization. Be specific and actionable. If the site is unknown, make reasonable inferences based on the domain name and TLD.`;

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 900,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();

    // Defensive check: even a 200 response could carry an OpenAI/Worker error
    // object instead of the expected `choices` array — catch that explicitly
    // instead of letting it crash further down as a confusing JSON parse error.
    if (data.error) {
      throw new Error(data.error.message || 'The AI service returned an error.');
    }

    let raw = data.choices?.[0]?.message?.content || '';
    if (typeof raw !== 'string') { raw = JSON.stringify(raw); }
    if (!raw) {
      throw new Error('The AI service returned an empty response. Please try again.');
    }
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Render results
    document.getElementById('res-score-num').textContent = parsed.score;
    document.getElementById('res-headline').textContent = parsed.headline;
    document.getElementById('res-url-display').textContent = url;

    const ratingColor = { 'Good': '#22d47b', 'Fair': '#f5a623', 'Needs Work': '#ff5757' };
    const sectionsHTML = parsed.sections.map(s => `
      <div style="background:var(--dark);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-family:'Syne';font-size:14px;font-weight:700;color:#fff;">${s.emoji} ${s.title}</span>
          <span style="font-size:12px;font-weight:700;color:${ratingColor[s.rating] || '#fff'};background:${ratingColor[s.rating] || '#fff'}18;border:1px solid ${ratingColor[s.rating] || '#fff'}33;padding:2px 10px;border-radius:100px;">${s.rating}</span>
        </div>
        <p style="font-size:13px;color:var(--muted);line-height:1.65;margin:0;">${s.insight}</p>
      </div>`).join('');
    document.getElementById('res-sections').innerHTML = sectionsHTML;

    document.getElementById('results-loading').style.display = 'none';
    document.getElementById('results-content').style.display = 'block';

    // Save to database if user is logged in
    if (currentUser) {
      await saveScan(url, parsed.score, parsed.headline, parsed.sections);
      // Reload history if dashboard was open
    }

  } catch (err) {
    document.getElementById('results-loading').style.display = 'none';
    document.getElementById('results-error-msg').textContent = `Error: ${err.message}`;
    document.getElementById('results-error').style.display = 'block';
    console.error('SiteLens API error:', err);
  }
}

document.getElementById('modal-submit-btn').addEventListener('click', () => {
  const url = document.getElementById('modal-input-url').value.trim();
  if (!url) { showToast('Please enter a website URL first.'); return; }
  modal.classList.remove('open');
  const email = document.querySelector('.modal-box input[type="email"]')?.value || '';
  analyzeWebsite(url, email);
});

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Checkout Stripe redirect handling
let pendingCheckoutLink = null; // holds a plan link if user needs to sign up/in first

function goToStripeCheckout(targetLink) {
  const url = new URL(targetLink);
  if (currentUser?.id) url.searchParams.set('client_reference_id', currentUser.id);
  if (currentUser?.email) url.searchParams.set('prefilled_email', currentUser.email);
  showToast2('Redirecting to secure checkout...');
  setTimeout(() => { window.location.href = url.toString(); }, 1000);
}

document.querySelectorAll('.btn-plan').forEach(btn => {
  btn.addEventListener('click', function() {
    const plan = this.getAttribute('data-plan');
    const targetLink = this.getAttribute('data-stripe');
    const prices = { 'Starter': 'Free', 'Growth': '$29.99/mo', 'Pro': '$49.99/mo' };
    const price = prices[plan] || '';

    // Free plan, or Stripe not connected yet (test link) — just open signup
    if (!targetLink || targetLink.includes('test_') || plan === 'Starter') {
      showToast2(`Sign up to get started with the ${plan} plan${price !== 'Free' ? ' — ' + price : ' for free'}!`);
      setTimeout(() => {
        document.getElementById('signup-modal').classList.add('open');
      }, 800);
      return;
    }

    // Paid plan with a live Stripe link — we need an account first so the
    // webhook can tie the payment back to this user via client_reference_id
    if (!currentUser) {
      pendingCheckoutLink = targetLink;
      showToast2('Create a free account first — then we\'ll take you to checkout.');
      setTimeout(() => {
        document.getElementById('signup-modal').classList.add('open');
      }, 800);
      return;
    }

    goToStripeCheckout(targetLink);
  });
});

// ── SUPABASE AUTH & DATABASE ──────────────────────────────────────────────
const SUPABASE_URL = 'https://sqpmgsruzkvxqkxawppw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxcG1nc3J1emt2eHFreGF3cHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTE1NDYsImV4cCI6MjA5NjQ4NzU0Nn0.kHfhWqAntAw9YxJ7qWKx_y7ENh-2JPH3_y7QXCIW-fY';

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

let currentUser = null;
let currentSession = null;

// ── Helper: show toast2
function showToast2(msg) {
  const t = document.getElementById('toast-notice2');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ── Check existing session on load
async function checkSession() {
  const saved = localStorage.getItem('sl_session');
  if (!saved) return;
  try {
    const s = JSON.parse(saved);
    // Refresh session with Supabase
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({ refresh_token: s.refresh_token })
    });
    if (res.ok) {
      const data = await res.json();
      currentSession = data;
      currentUser = data.user;
      localStorage.setItem('sl_session', JSON.stringify(data));
      showDashboard();
    } else {
      localStorage.removeItem('sl_session');
    }
  } catch(e) { localStorage.removeItem('sl_session'); }
}

// ── Sign Up
async function signUp(email, password) {
  const btn = document.getElementById('signup-submit');
  const err = document.getElementById('signup-err');
  btn.disabled = true; btn.textContent = 'Creating account...';
  err.style.display = 'none';
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.msg);
    if (data.access_token) {
      currentSession = data; currentUser = data.user;
      localStorage.setItem('sl_session', JSON.stringify(data));
      document.getElementById('signup-modal').classList.remove('open');
      if (pendingCheckoutLink) {
        const link = pendingCheckoutLink;
        pendingCheckoutLink = null;
        goToStripeCheckout(link);
      } else {
        showDashboard();
      }
    } else {
      err.textContent = 'Check your email to confirm your account, then sign in.';
      err.style.display = 'block';
    }
  } catch(e) {
    err.textContent = e.message; err.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = 'Create Account';
}

// ── Sign In
async function signIn(email, password) {
  const btn = document.getElementById('signin-submit');
  const err = document.getElementById('signin-err');
  btn.disabled = true; btn.textContent = 'Signing in...';
  err.style.display = 'none';
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.error_description || data.error) throw new Error(data.error_description || data.error);
    currentSession = data; currentUser = data.user;
    localStorage.setItem('sl_session', JSON.stringify(data));
    document.getElementById('signin-modal').classList.remove('open');
    if (pendingCheckoutLink) {
      const link = pendingCheckoutLink;
      pendingCheckoutLink = null;
      goToStripeCheckout(link);
    } else {
      showDashboard();
    }
  } catch(e) {
    err.textContent = e.message; err.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = 'Sign In';
}

// ── Sign Out
async function signOut() {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Authorization': `Bearer ${currentSession?.access_token}` }
    });
  } catch(e) {}
  currentUser = null; currentSession = null;
  localStorage.removeItem('sl_session');
  document.getElementById('dashboard-page').classList.remove('open');
  showToast2('Signed out successfully.');
}

// ── Save scan to Supabase
async function saveScan(url, score, headline, sections) {
  if (!currentUser || !currentSession) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scans`, {
      method: 'POST',
      headers: {
        ...sbHeaders,
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        url,
        score,
        headline,
        sections: JSON.stringify(sections),
        created_at: new Date().toISOString()
      })
    });
  } catch(e) { console.log('Save scan error:', e); }
}

// ── Load scan history
async function loadHistory() {
  const grid = document.getElementById('history-grid');
  if (!currentUser || !currentSession) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scans?user_id=eq.${currentUser.id}&order=created_at.desc&limit=20`,
      { headers: { ...sbHeaders, 'Authorization': `Bearer ${currentSession.access_token}` } }
    );
    const scans = await res.json();
    if (!scans.length) {
      grid.innerHTML = '<div class="history-empty">No scans yet — run your first analysis above! 🚀</div>';
      return;
    }
    grid.innerHTML = scans.map(s => `
      <div class="history-card">
        <div class="history-card-left">
          <div class="history-score">${s.score}</div>
          <div>
            <div class="history-url">${s.url}</div>
            <div class="history-date">${new Date(s.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--muted);max-width:300px;text-align:right;">${s.headline}</div>
      </div>`).join('');
  } catch(e) {
    grid.innerHTML = '<div class="history-empty">Could not load history. Please try again.</div>';
  }
}

// ── Show Dashboard
function showDashboard() {
  const dash = document.getElementById('dashboard-page');
  dash.classList.add('open');
  const email = currentUser?.email || '';
  document.getElementById('dash-email-display').textContent = `Logged in as ${email}`;
  const initial = email.charAt(0).toUpperCase();
  document.getElementById('user-avatar').textContent = initial;
  loadHistory();
}

// ── Dashboard scan button
document.getElementById('dash-scan-btn').addEventListener('click', () => {
  const url = document.getElementById('dash-url-input').value.trim();
  if (!url) { showToast2('Please enter a URL.'); return; }
  document.getElementById('dashboard-page').classList.remove('open');
  analyzeWebsite(url, currentUser?.email || '', true);
});

// ── Wire up nav buttons
document.getElementById('btn-signin').addEventListener('click', () => {
  document.getElementById('signin-modal').classList.add('open');
});
document.getElementById('btn-nav-start').addEventListener('click', () => {
  if (currentUser) { showDashboard(); } else { document.getElementById('signup-modal').classList.add('open'); }
});
document.getElementById('btn-hero-analyze').addEventListener('click', () => {
  if (currentUser) { showDashboard(); } else { openModalFunc(); }
});

// ── Modal close buttons
document.getElementById('signin-close').addEventListener('click', () => document.getElementById('signin-modal').classList.remove('open'));
document.getElementById('signup-close').addEventListener('click', () => document.getElementById('signup-modal').classList.remove('open'));
document.getElementById('switch-to-signup').addEventListener('click', () => {
  document.getElementById('signin-modal').classList.remove('open');
  document.getElementById('signup-modal').classList.add('open');
});
document.getElementById('switch-to-signin').addEventListener('click', () => {
  document.getElementById('signup-modal').classList.remove('open');
  document.getElementById('signin-modal').classList.add('open');
});
document.getElementById('signout-btn').addEventListener('click', signOut);
document.getElementById('dash-logo').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('dashboard-page').classList.remove('open');
});

// ── Form submissions
document.getElementById('signup-submit').addEventListener('click', () => {
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  if (!email || !pass) { document.getElementById('signup-err').textContent = 'Please fill in all fields.'; document.getElementById('signup-err').style.display='block'; return; }
  signUp(email, pass);
});
document.getElementById('signin-submit').addEventListener('click', () => {
  const email = document.getElementById('signin-email').value.trim();
  const pass = document.getElementById('signin-pass').value;
  if (!email || !pass) { document.getElementById('signin-err').textContent = 'Please fill in all fields.'; document.getElementById('signin-err').style.display='block'; return; }
  signIn(email, pass);
});

// Allow Enter key in auth forms
document.getElementById('signin-pass').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('signin-submit').click(); });
document.getElementById('signup-pass').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('signup-submit').click(); });

// ── Check session on page load
checkSession();

const observerOptions = { threshold: 0, rootMargin: '0px 0px -40px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

window.addEventListener('load', () => {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  // Safety net: reveal everything after 2s in case observer doesn't fire on mobile
  setTimeout(() => {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }, 2000);
});