/* ═══════════════════════════════════════════════════
   ARCWATCH — script.js
   ═══════════════════════════════════════════════════ */

'use strict';

// ── DATA ─────────────────────────────────────────────
const smartwatches = [
  { id: 1, name: "Apple Watch Series 9",     brand: "Apple",   price: 399, originalPrice: 429, image: "images/apple-watch.jpg",   rating: 4.8, color: "Midnight",  discount: 7,  stock: 15 },
  { id: 2, name: "Samsung Galaxy Watch 6",   brand: "Samsung", price: 299, originalPrice: 329, image: "images/samsung-watch.jpg", rating: 4.7, color: "Graphite",  discount: 9,  stock: 12 },
  { id: 3, name: "Garmin Venu 3",            brand: "Garmin",  price: 449, originalPrice: 499, image: "images/garmin-watch.jpg",  rating: 4.9, color: "Slate",     discount: 10, stock: 8  },
  { id: 4, name: "Google Pixel Watch 2",     brand: "Google",  price: 349, originalPrice: 379, image: "images/google-watch.jpg",  rating: 4.6, color: "Silver",    discount: 8,  stock: 10 },
  { id: 5, name: "Amazfit GTR 4",            brand: "Amazfit", price: 199, originalPrice: 229, image: "images/amazfit-watch.jpg", rating: 4.5, color: "Black",     discount: 13, stock: 20 },
  { id: 6, name: "Huawei Watch GT 4",        brand: "Huawei",  price: 249, originalPrice: 279, image: "images/huawei-watch.jpg",  rating: 4.7, color: "Green",     discount: 11, stock: 5  }
];
// ── GLOBALS ───────────────────────────────────────────
let cart      = [];
let wishlist  = [];
let filter    = 'all';
let search    = '';

const MAX_QTY   = 99;
const MAX_ITEMS = 20;

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ─────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────
function toast(msg, type = 'success', dur = 3200) {
  const container = qs('#toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
    <span>${msg}</span>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;

  container.appendChild(el);
  el.querySelector('.toast-close').onclick = () => el.remove();

  const t = setTimeout(() => el.remove(), dur);
  el.addEventListener('mouseenter', () => clearTimeout(t));
  el.addEventListener('mouseleave', () => setTimeout(() => el.remove(), 800));
}

// ─────────────────────────────────────────────────────
// WISHLIST
// ─────────────────────────────────────────────────────
function toggleWishlist(id) {
  const p = smartwatches.find(w => w.id === id);
  if (!p) return;

  const idx = wishlist.findIndex(w => w.id === id);
  if (idx !== -1) {
    wishlist.splice(idx, 1);
    toast(`Removed from wishlist`, 'success');
  } else {
    wishlist.push(p);
    toast(`Added to wishlist`, 'success');
  }
  localStorage.setItem('arcwatch_wishlist', JSON.stringify(wishlist));
  renderProducts();
}

function loadWishlist() {
  try { wishlist = JSON.parse(localStorage.getItem('arcwatch_wishlist') || '[]'); } catch { wishlist = []; }
}

// ─────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────
function addToCart(id, buttonEl) {
  const p = smartwatches.find(w => w.id === id);
  if (!p) return;

  if (p.stock <= 0) { toast(`Out of stock`, 'error'); return; }

  const existing = cart.find(i => i.id === id);
  const currentQty = existing ? existing.quantity : 0;

  if (currentQty + 1 > p.stock) { toast(`Only ${p.stock} available`, 'error'); return; }
  if (!existing && cartCount() >= MAX_ITEMS) { toast(`Cart limit reached`, 'error'); return; }

  if (existing) {
    if (existing.quantity >= MAX_QTY) { toast(`Max quantity reached`, 'error'); return; }
    existing.quantity++;
    toast(`Quantity updated`, 'success');
  } else {
    cart.push({ ...p, quantity: 1 });
    toast(`${p.name} added to cart`, 'success');
  }

  if (buttonEl) {
    buttonEl.classList.add('added');
    buttonEl.innerHTML = `<i class="fas fa-check"></i> Added`;
    setTimeout(() => {
      buttonEl.classList.remove('added');
      buttonEl.innerHTML = `<i class="fas fa-bag-shopping"></i> Add to Cart`;
    }, 1600);
  }

  saveCart();
  updateCartUI();

  const cnt = qs('#cartCount');
  if (cnt) { cnt.classList.add('bump'); setTimeout(() => cnt.classList.remove('bump'), 300); }
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  toast('Removed from cart', 'success');
  saveCart();
  updateCartUI();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  const p = smartwatches.find(w => w.id === id);
  const next = item.quantity + delta;
  if (next > (p?.stock ?? MAX_QTY)) { toast(`Only ${p.stock} available`, 'error'); return; }
  if (next > MAX_QTY) { toast('Max quantity reached', 'error'); return; }
  if (next <= 0) { removeFromCart(id); return; }
  item.quantity = next;
  saveCart();
  updateCartUI();
}

function cartCount() { return cart.reduce((s, i) => s + i.quantity, 0); }
function cartSubtotal() { return cart.reduce((s, i) => s + i.price * i.quantity, 0); }

function saveCart() { localStorage.setItem('arcwatch_cart', JSON.stringify(cart)); }
function loadCart() {
  try { cart = JSON.parse(localStorage.getItem('arcwatch_cart') || '[]'); } catch { cart = []; }
  updateCartUI();
}

function updateCartUI() {
  const count    = cartCount();
  const subtotal = cartSubtotal();

  setEl('#cartCount',    count);
  setEl('#cartItemCount',count);
  setEl('#cartSubtotal', `$${subtotal}`);
  setEl('#cartTotal',    `$${subtotal}`);

  const container = qs('#cartItems');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">◌</div>
        <p>Your cart is empty</p>
        <a href="#products">Browse Collection</a>
      </div>`;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-title">${esc(item.name)}</div>
        <div class="cart-item-color">${esc(item.color)}</div>
        <div class="cart-item-price">$${item.price}</div>
        <div class="cart-item-qty">
          <button onclick="changeQty(${item.id}, -1)" aria-label="Decrease">−</button>
          <span>${item.quantity}</span>
          <button onclick="changeQty(${item.id}, 1)" aria-label="Increase">+</button>
        </div>
      </div>
      <button class="cart-item-del" onclick="removeFromCart(${item.id})" aria-label="Remove">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function setEl(sel, val) {
  const el = qs(sel);
  if (el) el.textContent = val;
}

// ─────────────────────────────────────────────────────
// STARS
// ─────────────────────────────────────────────────────
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '';
  for (let i = 0; i < full; i++) s += '<i class="fas fa-star"></i>';
  if (half) s += '<i class="fas fa-star-half-stroke"></i>';
  for (let i = full + (half ? 1 : 0); i < 5; i++) s += '<i class="far fa-star"></i>';
  return s;
}

// ─────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────
function renderProducts() {
  let items = [...smartwatches];
  if (filter !== 'all') items = items.filter(p => p.brand === filter);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }

  const container = qs('#productsContainer');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="no-results">No watches found — try a different search.</div>`;
    return;
  }

  container.innerHTML = items.map(w => {
    const inWL = wishlist.some(x => x.id === w.id);

    const stockTag = w.stock > 10
      ? `<span class="product-stock in-stock"><i class="fas fa-circle-check"></i> In Stock</span>`
      : w.stock > 0
      ? `<span class="product-stock low-stock"><i class="fas fa-triangle-exclamation"></i> Only ${w.stock} left</span>`
      : `<span class="product-stock out-of-stock"><i class="fas fa-circle-xmark"></i> Out of Stock</span>`;

    return `
      <article class="product-card" data-id="${w.id}" onclick="openModal(${w.id})">
        <div class="product-badge">−${w.discount}%</div>
        <button class="product-wishlist" onclick="event.stopPropagation(); toggleWishlist(${w.id})"
          aria-label="${inWL ? 'Remove from wishlist' : 'Add to wishlist'}">
          <i class="${inWL ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <div class="product-img-wrap">
          <img
            class="product-image"
            src="${w.image}"
            alt="${esc(w.name)}"
            loading="lazy"
            decoding="async"
            onerror="this.onerror=null; this.src='https://placehold.co/400x400/0a0a0f/6ee7f7?text=${encodeURIComponent(w.name)}'">
        </div>
        <div class="product-body">
          <div class="product-brand">${esc(w.brand)}</div>
          <h3 class="product-name">${esc(w.name)}</h3>
          <div class="product-rating">
            <span class="stars-wrap">${renderStars(w.rating)}</span>
            <span>${w.rating}</span>
          </div>
          <div class="product-price">
            <span class="price-now">$${w.price}</span>
            <span class="price-was">$${w.originalPrice}</span>
            <span class="price-save">Save $${w.originalPrice - w.price}</span>
          </div>
          ${stockTag}
          <button class="product-add" onclick="event.stopPropagation(); addToCart(${w.id}, this)" ${w.stock <= 0 ? 'disabled' : ''}>
            <i class="fas fa-bag-shopping"></i>
            ${w.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </article>
    `;
  }).join('');

  // Animate in
  requestAnimationFrame(() => {
    qsa('.product-card').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * 60);
    });
  });
}

// ─────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────
function openModal(id) {
  const w = smartwatches.find(p => p.id === id);
  if (!w) return;

  const modal = qs('#quickViewModal');
  const body  = qs('#modalBody');
  if (!modal || !body) return;

  const inWL     = wishlist.some(x => x.id === w.id);
  const stockTag = w.stock > 0
    ? `<span class="in-stock"><i class="fas fa-circle-check"></i> In stock (${w.stock} available)</span>`
    : `<span class="out-of-stock"><i class="fas fa-circle-xmark"></i> Out of Stock</span>`;

  body.innerHTML = `
    <img src="${w.image}" alt="${esc(w.name)}"
      style="width:100%; height:260px; object-fit:contain; background:var(--ink-muted); border-radius:var(--r-lg);"
      onerror="this.src='https://placehold.co/520x260/0a0a0f/6ee7f7?text=${encodeURIComponent(w.name)}'">
    <div class="product-brand" style="margin-top:var(--sp-5)">${esc(w.brand)}</div>
    <h2>${esc(w.name)}</h2>
    <div class="product-rating" style="margin:var(--sp-2) 0">
      <span class="stars-wrap">${renderStars(w.rating)}</span>
      <span style="font-size:.8rem;color:var(--text-dim)">${w.rating} out of 5</span>
    </div>
    <div class="product-price" style="margin:var(--sp-3) 0">
      <span class="price-now">$${w.price}</span>
      <span class="price-was">$${w.originalPrice}</span>
      <span class="price-save">−${w.discount}%</span>
    </div>
    <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:var(--sp-2)"><strong style="color:var(--text)">Color:</strong> ${esc(w.color)}</p>
    <div style="margin-bottom:var(--sp-5)">${stockTag}</div>
    <div class="modal-actions">
      <button class="btn-primary" onclick="addToCart(${w.id}, this); if(${w.stock} > 0) document.getElementById('quickViewModal').classList.remove('open')" ${w.stock <= 0 ? 'disabled' : ''}>
        <i class="fas fa-bag-shopping"></i> Add to Cart
      </button>
      <button class="btn-ghost" onclick="toggleWishlist(${w.id}); openModal(${w.id})">
        <i class="${inWL ? 'fas' : 'far'} fa-heart"></i>
        ${inWL ? 'Wishlisted' : 'Wishlist'}
      </button>
    </div>
  `;

  modal.classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeModal() {
  const modal = qs('#quickViewModal');
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('no-scroll');
}

// ─────────────────────────────────────────────────────
// LIVE WATCH DISPLAY
// ─────────────────────────────────────────────────────
function updateWatch() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

  setEl('#liveTime', `${hh}:${mm}`);
  setEl('#liveDate', `${days[now.getDay()]} ${now.getDate()}`);
  setEl('#stepCount', Math.floor(7000 + Math.random() * 2000).toLocaleString());
  setEl('#heartRate', Math.floor(64 + Math.random() * 22));
}

// ─────────────────────────────────────────────────────
// COUNT-UP
// ─────────────────────────────────────────────────────
function countUp(el, target, dur = 1800) {
  if (!el) return;
  const start   = Date.now();
  const step = () => {
    const progress = Math.min((Date.now() - start) / dur, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────────────
// SCROLL REVEAL
// ─────────────────────────────────────────────────────
function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  qsa('[data-reveal]').forEach(el => observer.observe(el));
}

// Stats count-up on hero enter
function initHeroStats() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        countUp(qs('#userCount'), 50000);
        countUp(qs('#ratingCount'), 49);
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  const hero = qs('.hero');
  if (hero) observer.observe(hero);
}

// ─────────────────────────────────────────────────────
// CURSOR
// ─────────────────────────────────────────────────────
function initCursor() {
  const cursor    = qs('#cursor');
  const cursorDot = qs('#cursorDot');
  if (!cursor || !cursorDot || window.matchMedia('(pointer: coarse)').matches) return;

  let mx = 0, my = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  const moveDot = () => {
    cursorDot.style.left = mx + 'px';
    cursorDot.style.top  = my + 'px';
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
    requestAnimationFrame(moveDot);
  };
  requestAnimationFrame(moveDot);

  qsa('button, a, .product-card, .filter-btn, input').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}

// ─────────────────────────────────────────────────────
// NAVBAR SCROLL
// ─────────────────────────────────────────────────────
function initNavbar() {
  const nav = qs('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

// ─────────────────────────────────────────────────────
// ACTIVE NAV LINK
// ─────────────────────────────────────────────────────
function initActiveNav() {
  const sections = qsa('section[id]');
  const links    = qsa('.nav-link');
  if (!sections.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = links.find(l => l.getAttribute('href') === `#${e.target.id}`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));
}

// ─────────────────────────────────────────────────────
// MOBILE MENU
// ─────────────────────────────────────────────────────
function initMobileMenu() {
  const hamburger = qs('#hamburger');
  const menu      = qs('#mobileMenu');
  const overlay   = qs('#mobileOverlay');
  const closeBtn  = qs('#mobileClose');

  if (!hamburger || !menu) return;

  const open = () => {
    menu.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
    hamburger.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    menu.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
    hamburger.setAttribute('aria-expanded', 'false');
  };

  hamburger.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  qsa('.mobile-menu a').forEach(a => a.addEventListener('click', close));
}

// ─────────────────────────────────────────────────────
// CART SIDEBAR
// ─────────────────────────────────────────────────────
function initCart() {
  const trigger  = qs('#cartTrigger');
  const sidebar  = qs('#cartSidebar');
  const overlay  = qs('#cartOverlay');
  const closeBtn = qs('#cartClose');
  const checkout = qs('#checkoutBtn');

  if (!trigger || !sidebar) return;

  const open = () => {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
  };
  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
  };

  trigger.addEventListener('click', open);
  trigger.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && open());
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);

  checkout?.addEventListener('click', () => {
    if (cart.length === 0) { toast('Your cart is empty', 'error'); return; }
    toast('Order placed — thank you! ', 'success', 4000);
    cart = [];
    saveCart();
    updateCartUI();
    close();
  });
}

// ─────────────────────────────────────────────────────
// FILTERS & SEARCH
// ─────────────────────────────────────────────────────
function initFilters() {
  qsa('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderProducts();
    });
  });
}

function initSearch() {
  const input = qs('#searchInput');
  if (!input) return;
  input.addEventListener('input', debounce(e => {
    search = e.target.value.trim();
    renderProducts();
  }, 260));
}

// ─────────────────────────────────────────────────────
// NEWSLETTER
// ─────────────────────────────────────────────────────
function initNewsletter() {
  const form = qs('#subscribeForm');
  if (!form) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name  = qs('#subName')?.value.trim();
    const email = qs('#subEmail')?.value.trim();
    if (!name || name.length < 2)         { toast('Please enter your name', 'error');          return; }
    if (!email || !EMAIL_RE.test(email))  { toast('Please enter a valid email', 'error');       return; }
    toast(`Welcome, ${esc(name)}! Check your inbox.`, 'success', 4000);
    form.reset();
  });
}

// ─────────────────────────────────────────────────────
// PRICING BUTTONS
// ─────────────────────────────────────────────────────
function initPricing() {
  qsa('.btn-plan').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan  = btn.dataset.plan;
      const price = btn.dataset.price;
      toast(`${plan} plan selected — ${formatMoney(+price)}`, 'success');
    });
  });
}

// ─────────────────────────────────────────────────────
// MODAL INIT
// ─────────────────────────────────────────────────────
function initModal() {
  const closeBtn  = qs('#modalClose');
  const backdrop  = qs('#modalBackdrop');

  closeBtn?.addEventListener('click',  closeModal);
  backdrop?.addEventListener('click',  closeModal);
}

// ─────────────────────────────────────────────────────
// SMOOTH SCROLL
// ─────────────────────────────────────────────────────
function initSmoothScroll() {
  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}

// ─────────────────────────────────────────────────────
// SCROLL TOP
// ─────────────────────────────────────────────────────
function initScrollTop() {
  const btn = qs('#scrollTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ─────────────────────────────────────────────────────
// THEME TOGGLE
// ─────────────────────────────────────────────────────
function initTheme() {
  const btn = qs('#themeToggle');
  if (!btn) return;

  const stored = localStorage.getItem('arcwatch_theme');
  if (stored === 'light') applyLight();

  btn.addEventListener('click', () => {
    if (document.body.classList.contains('light')) {
      document.body.classList.remove('light');
      btn.innerHTML = '<i class="fas fa-sun"></i>';
      localStorage.setItem('arcwatch_theme', 'dark');
    } else {
      applyLight();
    }
  });

  function applyLight() {
    document.body.classList.add('light');
    btn.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem('arcwatch_theme', 'light');
  }
}

// ─────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      qs('#cartSidebar')?.classList.remove('open');
      qs('#cartOverlay')?.classList.remove('open');
      qs('#mobileMenu')?.classList.remove('open');
      qs('#mobileOverlay')?.classList.remove('open');
      document.body.classList.remove('no-scroll');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      qs('#searchInput')?.focus();
    }
  });
}

// ─────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Remove preload class after first paint
  requestAnimationFrame(() => document.body.classList.remove('preload'));

  // Data
  loadCart();
  loadWishlist();

  // Render
  renderProducts();

  // Live watch
  updateWatch();
  setInterval(updateWatch, 3000);

  // All features
  initTheme();
  initNavbar();
  initActiveNav();
  initMobileMenu();
  initCart();
  initFilters();
  initSearch();
  initNewsletter();
  initPricing();
  initModal();
  initSmoothScroll();
  initScrollTop();
  initReveal();
  initHeroStats();
  initCursor();
  initKeyboard();
});

// Expose globals needed by inline handlers
window.addToCart     = addToCart;
window.removeFromCart = removeFromCart;
window.changeQty     = changeQty;
window.toggleWishlist = toggleWishlist;
window.openModal     = openModal;