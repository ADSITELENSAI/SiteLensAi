/* ============================================================
   SITELENS — app.js
   Handles all button interactions across the site
   ============================================================ */

/* ── UTILITY: smooth scroll to any section by ID ── */
function scrollTo(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

/* ── UTILITY: show a toast notification ── */
function showToast(message, type) {
  var existing = document.getElementById('sl-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'sl-toast';
  toast.textContent = message;
  toast.style.cssText = [
    'position:fixed',
    'bottom:32px',
    'right:32px',
    'z-index:9999',
    'padding:14px 24px',
    'border-radius:12px',
    'font-family:DM Sans,sans-serif',
    'font-size:15px',
    'font-weight:500',
    'color:#fff',
    'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
    'opacity:0',
    'transform:translateY(12px)',
    'transition:opacity .3s ease,transform .3s ease',
    type === 'error'
      ? 'background:linear-gradient(135deg,#b91c1c,#ef4444)'
      : 'background:linear-gradient(135deg,#0077ff,#00c2ff)'
  ].join(';');

  document.body.appendChild(toast);
  requestAnimationFrame(function () {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(function () { toast.remove(); }, 400);
  }, 3500);
}

/* ── UTILITY: validate a URL ── */
function isValidUrl(str) {
  try {
    var url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/* ============================================================
   MODAL — reusable overlay for Sign In / Get Started / Plans
   ============================================================ */
function openModal(content) {
  var existing = document.getElementById('sl-modal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'sl-modal';
  overlay.style.cssText = [
    'position:fixed','inset:0','z-index:500',
    'background:rgba(5,7,9,0.85)',
    'backdrop-filter:blur(8px)',
    'display:flex','align-items:center','justify-content:center',
    'padding:24px',
    'opacity:0','transition:opacity .3s ease'
  ].join(';');

  overlay.innerHTML = '\
    <div id="sl-modal-box" style="\
      background:#0f1419;\
      border:1px solid rgba(0,194,255,0.2);\
      border-radius:24px;\
      padding:48px 44px;\
      max-width:480px;\
      width:100%;\
      position:relative;\
      box-shadow:0 40px 100px rgba(0,0,0,0.8),0 0 60px rgba(0,119,255,0.1);\
      transform:translateY(20px);\
      transition:transform .3s ease;\
    ">' + content + '\
      <button onclick="closeModal()" style="\
        position:absolute;top:18px;right:18px;\
        background:rgba(255,255,255,0.06);\
        border:1px solid rgba(255,255,255,0.1);\
        border-radius:8px;\
        color:#6b7a8d;\
        font-size:18px;\
        width:32px;height:32px;\
        cursor:pointer;\
        display:flex;align-items:center;justify-content:center;\
        line-height:1;\
      ">×</button>\
    </div>';

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(function () {
    overlay.style.opacity = '1';
    var box = document.getElementById('sl-modal-box');
    if (box) box.style.transform = 'translateY(0)';
  });
}

function closeModal() {
  var modal = document.getElementById('sl-modal');
  if (!modal) return;
  modal.style.opacity = '0';
  setTimeout(function () {
    modal.remove();
    document.body.style.overflow = '';
  }, 300);
}

/* ── ESC key closes modal ── */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

/* ============================================================
   SIGN IN MODAL
   ============================================================ */
function openSignIn() {
  openModal('\
    <div style="text-align:center;margin-bottom:28px">\
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:16px">\
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#0077ff,#00c2ff);border-radius:10px;display:flex;align-items:center;justify-content:center">\
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="white" stroke-width="2" fill="none"/><circle cx="13" cy="5" r="2" fill="white"/><path d="M5 9h8M5 12h5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>\
        </div>\
        <span style="font-family:Syne,sans-serif;font-weight:800;font-size:20px;color:#fff;letter-spacing:-0.03em">Site<span style="color:#00c2ff">Lens</span></span>\
      </div>\
      <h2 style="font-family:Syne,sans-serif;font-size:26px;color:#fff;margin-bottom:6px">Welcome back</h2>\
      <p style="font-size:14px;color:#6b7a8d">Sign in to your SiteLens account</p>\
    </div>\
    <div style="display:flex;flex-direction:column;gap:14px">\
      <div>\
        <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">Email</label>\
        <input id="signin-email" type="email" placeholder="you@yourbusiness.com" style="\
          width:100%;background:#0b0f14;\
          border:1px solid rgba(255,255,255,0.1);\
          border-radius:10px;padding:13px 16px;\
          font-size:15px;color:#fff;outline:none;\
          font-family:DM Sans,sans-serif;\
          transition:border-color .2s;\
        " onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">\
      </div>\
      <div>\
        <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">Password</label>\
        <input id="signin-pass" type="password" placeholder="••••••••" style="\
          width:100%;background:#0b0f14;\
          border:1px solid rgba(255,255,255,0.1);\
          border-radius:10px;padding:13px 16px;\
          font-size:15px;color:#fff;outline:none;\
          font-family:DM Sans,sans-serif;\
          transition:border-color .2s;\
        " onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">\
      </div>\
      <div style="text-align:right;margin-top:-6px">\
        <a href="#" style="font-size:13px;color:#00c2ff;text-decoration:none">Forgot password?</a>\
      </div>\
      <button onclick="handleSignIn()" style="\
        width:100%;padding:14px;\
        border-radius:10px;\
        background:linear-gradient(135deg,#0077ff,#00c2ff);\
        color:#fff;font-size:15px;font-weight:700;\
        cursor:pointer;border:none;\
        font-family:DM Sans,sans-serif;\
        box-shadow:0 8px 24px rgba(0,119,255,0.3);\
        transition:all .3s;\
        margin-top:4px;\
      " onmouseover="this.style.boxShadow=\'0 12px 32px rgba(0,119,255,0.45)\'" onmouseout="this.style.boxShadow=\'0 8px 24px rgba(0,119,255,0.3)\'">Sign In</button>\
    </div>\
    <p style="text-align:center;margin-top:20px;font-size:14px;color:#6b7a8d">\
      Don\'t have an account? <a href="#" onclick="closeModal();openGetStarted();" style="color:#00c2ff;text-decoration:none;font-weight:600">Get started free</a>\
    </p>\
  ');
}

function handleSignIn() {
  var email = document.getElementById('signin-email').value.trim();
  var pass = document.getElementById('signin-pass').value;
  if (!email || !pass) {
    showToast('Please fill in both fields.', 'error');
    return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }
  /* ----- Replace this block with your real auth logic ----- */
  closeModal();
  showToast('Welcome back! Redirecting to your dashboard...', 'success');
  /* --------------------------------------------------------- */
}

/* ============================================================
   GET STARTED / SIGN UP MODAL
   ============================================================ */
function openGetStarted(planName) {
  var plan = planName || 'Starter';
  openModal('\
    <div style="text-align:center;margin-bottom:28px">\
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:16px">\
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#0077ff,#00c2ff);border-radius:10px;display:flex;align-items:center;justify-content:center">\
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="white" stroke-width="2" fill="none"/><circle cx="13" cy="5" r="2" fill="white"/><path d="M5 9h8M5 12h5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>\
        </div>\
        <span style="font-family:Syne,sans-serif;font-weight:800;font-size:20px;color:#fff;letter-spacing:-0.03em">Site<span style="color:#00c2ff">Lens</span></span>\
      </div>\
      <h2 style="font-family:Syne,sans-serif;font-size:26px;color:#fff;margin-bottom:6px">Create your account</h2>\
      <p style="font-size:14px;color:#6b7a8d">Plan selected: <span style="color:#00c2ff;font-weight:600">' + plan + '</span></p>\
    </div>\
    <div style="display:flex;flex-direction:column;gap:14px">\
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">\
        <div>\
          <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">First Name</label>\
          <input id="reg-first" type="text" placeholder="John" style="width:100%;background:#0b0f14;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:15px;color:#fff;outline:none;font-family:DM Sans,sans-serif;transition:border-color .2s" onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">\
        </div>\
        <div>\
          <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">Last Name</label>\
          <input id="reg-last" type="text" placeholder="Smith" style="width:100%;background:#0b0f14;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:15px;color:#fff;outline:none;font-family:DM Sans,sans-serif;transition:border-color .2s" onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">\
        </div>\
      </div>\
      <div>\
        <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">Email</label>\
        <input id="reg-email" type="email" placeholder="you@yourbusiness.com" style="width:100%;background:#0b0f14;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:15px;color:#fff;outline:none;font-family:DM Sans,sans-serif;transition:border-color .2s" onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">\
      </div>\
      <div>\
        <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">Password</label>\
        <input id="reg-pass" type="password" placeholder="Min. 8 characters" style="width:100%;background:#0b0f14;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:15px;color:#fff;outline:none;font-family:DM Sans,sans-serif;transition:border-color .2s" onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">\
      </div>\
      <button onclick="handleRegister(\'' + plan + '\')" style="\
        width:100%;padding:14px;\
        border-radius:10px;\
        background:linear-gradient(135deg,#0077ff,#00c2ff);\
        color:#fff;font-size:15px;font-weight:700;\
        cursor:pointer;border:none;\
        font-family:DM Sans,sans-serif;\
        box-shadow:0 8px 24px rgba(0,119,255,0.3);\
        margin-top:4px;\
      ">Create Free Account</button>\
    </div>\
    <p style="text-align:center;margin-top:20px;font-size:13px;color:#6b7a8d">\
      Already have an account? <a href="#" onclick="closeModal();openSignIn();" style="color:#00c2ff;text-decoration:none;font-weight:600">Sign in</a>\
    </p>\
    <p style="text-align:center;margin-top:10px;font-size:12px;color:#4a5568">\
      By creating an account you agree to our <a href="#" style="color:#6b7a8d;text-decoration:underline">Terms</a> and <a href="#" style="color:#6b7a8d;text-decoration:underline">Privacy Policy</a>.\
    </p>\
  ');
}

function handleRegister(plan) {
  var first = document.getElementById('reg-first').value.trim();
  var last  = document.getElementById('reg-last').value.trim();
  var email = document.getElementById('reg-email').value.trim();
  var pass  = document.getElementById('reg-pass').value;

  if (!first || !last || !email || !pass) {
    showToast('Please fill in all fields.', 'error');
    return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }
  if (pass.length < 8) {
    showToast('Password must be at least 8 characters.', 'error');
    return;
  }
  /* ----- Replace this block with your real registration logic ----- */
  closeModal();
  showToast('Account created! Welcome to SiteLens 🚀', 'success');
  /* ---------------------------------------------------------------- */
}

/* ============================================================
   CTA SECTION — Analyze Free button
   ============================================================ */
function handleAnalyze() {
  var input = document.getElementById('cta-url-input');
  if (!input) return;
  var url = input.value.trim();

  if (!url) {
    showToast('Please enter your website URL first.', 'error');
    input.focus();
    return;
  }

  /* Auto-prepend https:// if missing */
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    input.value = url;
  }

  if (!isValidUrl(url)) {
    showToast('Please enter a valid URL (e.g. https://yourbusiness.com)', 'error');
    input.focus();
    return;
  }

  /* ----- Replace this block with your real analysis trigger ----- */
  showToast('Analyzing ' + url + ' — results coming shortly!', 'success');
  input.value = '';
  /* -------------------------------------------------------------- */
}

/* ============================================================
   FOOTER LINKS — placeholder pages
   ============================================================ */
var footerPages = {
  'Features':       function(){ scrollTo('features'); },
  'Pricing':        function(){ scrollTo('pricing'); },
  'Changelog':      function(){ showComingSoon('Changelog'); },
  'Roadmap':        function(){ showComingSoon('Roadmap'); },
  'About':          function(){ showComingSoon('About'); },
  'Blog':           function(){ showComingSoon('Blog'); },
  'Careers':        function(){ showComingSoon('Careers'); },
  'Contact':        function(){ openContact(); },
  'Privacy Policy': function(){ showComingSoon('Privacy Policy'); },
  'Terms of Service': function(){ showComingSoon('Terms of Service'); },
  'Cookie Policy':  function(){ showComingSoon('Cookie Policy'); },
  'Security':       function(){ showComingSoon('Security'); }
};

function showComingSoon(page) {
  openModal('\
    <div style="text-align:center;padding:20px 0">\
      <div style="font-size:48px;margin-bottom:16px">🚧</div>\
      <h2 style="font-family:Syne,sans-serif;font-size:26px;color:#fff;margin-bottom:10px">' + page + '</h2>\
      <p style="font-size:16px;color:#6b7a8d;margin-bottom:28px">This page is coming soon. We\'re building something great — check back shortly.</p>\
      <button onclick="closeModal()" style="\
        padding:12px 32px;border-radius:10px;\
        background:linear-gradient(135deg,#0077ff,#00c2ff);\
        color:#fff;font-size:15px;font-weight:600;\
        cursor:pointer;border:none;\
        font-family:DM Sans,sans-serif;\
      ">Got It</button>\
    </div>\
  ');
}

function openContact() {
  openModal('\
    <div style="text-align:center;margin-bottom:24px">\
      <h2 style="font-family:Syne,sans-serif;font-size:26px;color:#fff;margin-bottom:6px">Get in touch</h2>\
      <p style="font-size:14px;color:#6b7a8d">We\'ll get back to you within 24 hours.</p>\
    </div>\
    <div style="display:flex;flex-direction:column;gap:14px">\
      <div>\
        <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">Name</label>\
        <input id="contact-name" type="text" placeholder="Your name" style="width:100%;background:#0b0f14;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:15px;color:#fff;outline:none;font-family:DM Sans,sans-serif;transition:border-color .2s" onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">\
      </div>\
      <div>\
        <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">Email</label>\
        <input id="contact-email" type="email" placeholder="you@yourbusiness.com" style="width:100%;background:#0b0f14;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:15px;color:#fff;outline:none;font-family:DM Sans,sans-serif;transition:border-color .2s" onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'">\
      </div>\
      <div>\
        <label style="font-size:13px;font-weight:600;color:#e8edf2;display:block;margin-bottom:6px">Message</label>\
        <textarea id="contact-msg" placeholder="How can we help?" rows="4" style="width:100%;background:#0b0f14;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:15px;color:#fff;outline:none;font-family:DM Sans,sans-serif;resize:vertical;transition:border-color .2s" onfocus="this.style.borderColor=\'rgba(0,194,255,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.1)\'"></textarea>\
      </div>\
      <button onclick="handleContact()" style="\
        width:100%;padding:14px;border-radius:10px;\
        background:linear-gradient(135deg,#0077ff,#00c2ff);\
        color:#fff;font-size:15px;font-weight:700;\
        cursor:pointer;border:none;\
        font-family:DM Sans,sans-serif;\
        box-shadow:0 8px 24px rgba(0,119,255,0.3);\
      ">Send Message</button>\
    </div>\
  ');
}

function handleContact() {
  var name  = document.getElementById('contact-name').value.trim();
  var email = document.getElementById('contact-email').value.trim();
  var msg   = document.getElementById('contact-msg').value.trim();
  if (!name || !email || !msg) { showToast('Please fill in all fields.', 'error'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { showToast('Please enter a valid email.', 'error'); return; }
  /* ----- Replace with your real contact form submission ----- */
  closeModal();
  showToast("Message sent! We'll be in touch soon.", 'success');
  /* ---------------------------------------------------------- */
}

/* ============================================================
   WIRE EVERYTHING UP on page load
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {

  /* ── NAV: Sign In ── */
  var signInBtn = document.querySelector('.nav-btns .btn-ghost');
  if (signInBtn) {
    signInBtn.removeAttribute('onclick');
    signInBtn.addEventListener('click', openSignIn);
  }

  /* ── NAV: Get Started Free ── */
  var navGetStarted = document.querySelector('.nav-btns .btn-primary');
  if (navGetStarted) {
    navGetStarted.removeAttribute('onclick');
    navGetStarted.addEventListener('click', function () { openGetStarted('Starter'); });
  }

  /* ── HERO: Analyze My Website Free ── */
  var heroAnalyze = document.querySelector('.hero-btns .btn-primary');
  if (heroAnalyze) {
    heroAnalyze.removeAttribute('onclick');
    heroAnalyze.addEventListener('click', function () { scrollTo('cta'); });
  }

  /* ── HERO: See How It Works ── */
  var heroHow = document.querySelector('.hero-btns .btn-ghost');
  if (heroHow) {
    heroHow.removeAttribute('onclick');
    heroHow.addEventListener('click', function () { scrollTo('how'); });
  }

  /* ── PRICING: Starter — Get Started Free ── */
  var pricingBtns = document.querySelectorAll('.btn-plan');
  var planNames = ['Starter', 'Growth', 'Pro'];
  pricingBtns.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      openGetStarted(planNames[i] || 'Starter');
    });
  });

  /* ── CTA: Analyze Free button ── */
  var ctaSection = document.getElementById('cta');
  if (ctaSection) {
    /* Add ID to input for easy targeting */
    var ctaInput = ctaSection.querySelector('.cta-input');
    if (ctaInput) ctaInput.id = 'cta-url-input';

    /* Enter key triggers analysis */
    if (ctaInput) {
      ctaInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleAnalyze();
      });
    }

    var ctaBtn = ctaSection.querySelector('.btn-primary');
    if (ctaBtn) ctaBtn.addEventListener('click', handleAnalyze);
  }

  /* ── FOOTER LINKS ── */
  var footLinks = document.querySelectorAll('.foot-col a');
  footLinks.forEach(function (link) {
    var text = link.textContent.trim();
    if (footerPages[text]) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        footerPages[text]();
      });
    }
  });

  /* ── NAV scroll shadow ── */
  window.addEventListener('scroll', function () {
    var nav = document.getElementById('nav');
    if (nav) nav.style.borderBottomColor = window.scrollY > 60 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)';
  });

});
