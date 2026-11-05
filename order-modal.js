/* Pearl Essence - frosted glass, two-step order modal (region -> products -> WhatsApp). */
(function () {
  'use strict';

  var FALLBACK_WA = '255754757065'; // Pearl Essence main line, used when no agent matches the region
  var AGENTS_KEY = 'pe_agents_v1';  // seeded by the inline agents script on the home page
  var MAX_QTY = 99;
  var CURRENCY = 'TZS';

  var REGIONS = [
    'Kinondoni', 'Ilala', 'Temeke', 'Ubungo', 'Kigamboni',
    'Arusha Region', 'Dar es Salaam Region', 'Dodoma Region', 'Geita Region', 'Iringa Region',
    'Kagera Region', 'Katavi Region', 'Kigoma Region', 'Kilimanjaro Region', 'Lindi Region',
    'Manyara Region', 'Mara Region', 'Mbeya Region', 'Mjini Magharibi Region (Zanzibar)',
    'Morogoro Region', 'Mtwara Region', 'Mwanza Region', 'Njombe Region', 'Pemba North Region',
    'Pemba South Region', 'Pwani (Coast) Region', 'Rukwa Region', 'Ruvuma Region',
    'Shinyanga Region', 'Simiyu Region', 'Singida Region', 'Songwe Region', 'Tabora Region',
    'Tanga Region', 'Unguja North Region (Zanzibar)', 'Unguja South Region (Zanzibar)'
  ];

  // Region name -> agent areas that belong to it
  var REGION_AREAS = {
    'dar es salaam': ['dar es salaam', 'kariakoo', 'sinza', 'mwenge', 'kimara', 'kigamboni', 'tabata', 'tegeta', 'bunju', 'kawe', 'ukonga', 'temeke', 'makumbusho', 'banana', 'posta', 'mbweni', 'kinondoni', 'ilala', 'ubungo', 'upanga', 'goba', 'kijichi'],
    'kinondoni': ['kinondoni', 'sinza', 'mwenge', 'kawe', 'tegeta', 'bunju', 'makumbusho', 'mbweni'],
    'ilala': ['ilala', 'kariakoo', 'ukonga', 'banana', 'tabata', 'posta'],
    'temeke': ['temeke', 'kijichi'],
    'ubungo': ['ubungo', 'kimara', 'goba'],
    'kigamboni': ['kigamboni'],
    'mjini magharibi': ['zanzibar'],
    'unguja north': ['zanzibar'],
    'unguja south': ['zanzibar'],
    'pwani': ['kibaha'],
    'kagera': ['bukoba'],
    'kilimanjaro': ['moshi'],
    'mara': ['musoma', 'tarime'],
    'ruvuma': ['songea'],
    'songwe': ['tunduma'],
    'shinyanga': ['shinyanga', 'kahama'],
    'iringa': ['iringa', 'mafinga', 'mufindi'],
    'morogoro': ['morogoro', 'mvomero'],
    'mtwara': ['mtwara', 'masasi'],
    'mwanza': ['mwanza']
  };

  var state = { catalog: [], qty: {}, primaryId: null, agents: [], rows: {}, trigger: null };
  var ui = {};

  /* ---------- helpers ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function parsePrice(raw) {
    if (raw == null) return null;
    var n = Number(String(raw).replace(/[^\d.]/g, ''));
    return isFinite(n) && n > 0 ? n : null;
  }

  function formatMoney(n) {
    return CURRENCY + ' ' + Math.round(n).toLocaleString('en-US');
  }

  function normalizeArea(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function normSpace(s) {
    return String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/\bregion\b/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function toWaNumber(number) {
    var s = String(number || '').replace(/[^0-9]/g, '');
    if (s.length === 10 && s[0] === '0') s = '255' + s.slice(1);
    if (s.length === 9) s = '255' + s;
    return s.length >= 11 ? s : '';
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return 1 - prev[b.length] / Math.max(a.length, b.length);
  }

  /* ---------- agents ---------- */

  function loadAgents() {
    try {
      var list = JSON.parse(localStorage.getItem(AGENTS_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function findAgents(text) {
    var q = normSpace(text);
    var token = q.replace(/ /g, '');
    if (!token) return [];
    var agents = loadAgents();
    var wanted = [];
    Object.keys(REGION_AREAS).forEach(function (region) {
      if (region === q || (q.length >= 3 && region.indexOf(q) === 0)) {
        REGION_AREAS[region].forEach(function (a) { wanted.push(a.replace(/ /g, '')); });
      }
    });

    var hits = agents.filter(function (a) {
      var area = normalizeArea(a.area || a.location);
      var name = normalizeArea(a.name);
      if (area.indexOf(token) !== -1 || name.indexOf(token) !== -1) return true;
      return wanted.some(function (w) { return area === w || area.indexOf(w) !== -1 || name.indexOf(w) !== -1; });
    });
    if (hits.length) return hits;

    // Typo tolerance: only the single closest agent, never unrelated areas
    var best = null, bestScore = 0.7;
    agents.forEach(function (a) {
      var score = Math.max(similarity(normalizeArea(a.area || a.location), token), similarity(normalizeArea(a.name), token));
      if (score >= bestScore) { best = a; bestScore = score; }
    });
    return best ? [best] : [];
  }

  function firstPhone(agent) {
    var phones = Array.isArray(agent.phone) ? agent.phone : [agent.phone];
    for (var i = 0; i < phones.length; i++) {
      if (toWaNumber(phones[i])) return phones[i];
    }
    return '';
  }

  /* ---------- catalog ---------- */

  function collectCatalog() {
    var seen = {};
    var list = [];
    document.querySelectorAll('.product-card').forEach(function (card, i) {
      var nameEl = card.querySelector('.product-name');
      var name = nameEl ? nameEl.textContent.trim() : '';
      if (!name || seen[name]) return;
      seen[name] = true;
      var img = card.querySelector('.product-image img') || card.querySelector('img');
      var priceEl = card.querySelector('.product-price');
      list.push({
        id: card.getAttribute('data-product-id') || 'p' + i,
        name: name,
        img: img ? img.getAttribute('src') : '',
        price: parsePrice(card.getAttribute('data-price') || (priceEl && priceEl.textContent))
      });
    });
    return list;
  }

  /* ---------- markup ---------- */

  function buildModal() {
    var overlay = el('div', 'pe-om-overlay');
    overlay.id = 'peOrderModal';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="pe-om" role="dialog" aria-modal="true" aria-labelledby="peOmTitle">' +
        '<div class="pe-om-header">' +
          '<h3 class="pe-om-title" id="peOmTitle">Delivery Location</h3>' +
          '<button type="button" class="pe-om-close" aria-label="Close order form">&times;</button>' +
        '</div>' +
        '<ol class="pe-om-steps" aria-label="Order progress">' +
          '<li data-dot="1" class="is-active"><span>1</span>Location</li>' +
          '<li class="pe-om-line" aria-hidden="true"></li>' +
          '<li data-dot="2"><span>2</span>Your order</li>' +
        '</ol>' +
        '<section class="pe-om-panel" data-panel="1">' +
          '<div class="pe-om-body" tabindex="-1">' +
            '<label class="pe-om-label" for="peOmRegion">Where are you ordering from?</label>' +
            '<select id="peOmRegion" class="pe-om-select"><option value="">Select your area</option></select>' +
            '<input id="peOmArea" class="pe-om-input" type="text" maxlength="80" autocomplete="off" aria-label="Type your area" placeholder="Or type your area (e.g. Tabora, Sinza)">' +
            '<div id="peOmAgentWrap" hidden>' +
              '<label class="pe-om-label" for="peOmAgent">Delivery partner</label>' +
              '<select id="peOmAgent" class="pe-om-select"></select>' +
            '</div>' +
            '<p class="pe-om-note" id="peOmNote" role="status" aria-live="polite"></p>' +
          '</div>' +
          '<div class="pe-om-footer">' +
            '<button type="button" class="pe-om-btn pe-om-btn--primary" id="peOmNext" disabled>Next</button>' +
          '</div>' +
        '</section>' +
        '<section class="pe-om-panel" data-panel="2" hidden>' +
          '<div class="pe-om-body" tabindex="-1">' +
            '<h4 class="pe-om-section-title">Your selected product</h4>' +
            '<ul class="pe-om-list" id="peOmPrimary"></ul>' +
            '<h4 class="pe-om-section-title">Add More Products to Your Order</h4>' +
            '<ul class="pe-om-list" id="peOmMore"></ul>' +
            '<h4 class="pe-om-section-title">Your details (optional)</h4>' +
            '<div class="pe-om-details">' +
              '<input id="peOmName" class="pe-om-input" type="text" maxlength="60" autocomplete="name" aria-label="Your name" placeholder="Your name">' +
              '<input id="peOmPhone" class="pe-om-input" type="tel" maxlength="20" autocomplete="tel" aria-label="Your phone" placeholder="Phone (e.g. 0712345678)">' +
            '</div>' +
            '<div class="pe-om-summary"><span id="peOmCount"></span><span class="pe-om-total" id="peOmTotal"></span></div>' +
          '</div>' +
          '<div class="pe-om-footer pe-om-footer--split">' +
            '<button type="button" class="pe-om-btn pe-om-btn--ghost" id="peOmBack">Back</button>' +
            '<button type="button" class="pe-om-btn pe-om-btn--primary pe-om-btn--whatsapp" id="peOmSend">' +
              '<i class="fab fa-whatsapp" aria-hidden="true"></i> Confirm &amp; Order via WhatsApp' +
            '</button>' +
          '</div>' +
        '</section>' +
      '</div>';
    document.body.appendChild(overlay);

    ui.overlay = overlay;
    ui.title = overlay.querySelector('#peOmTitle');
    ui.close = overlay.querySelector('.pe-om-close');
    ui.panels = overlay.querySelectorAll('.pe-om-panel');
    ui.dots = overlay.querySelectorAll('[data-dot]');
    ui.line = overlay.querySelector('.pe-om-line');
    ui.region = overlay.querySelector('#peOmRegion');
    ui.area = overlay.querySelector('#peOmArea');
    ui.agentWrap = overlay.querySelector('#peOmAgentWrap');
    ui.agent = overlay.querySelector('#peOmAgent');
    ui.note = overlay.querySelector('#peOmNote');
    ui.next = overlay.querySelector('#peOmNext');
    ui.back = overlay.querySelector('#peOmBack');
    ui.send = overlay.querySelector('#peOmSend');
    ui.primary = overlay.querySelector('#peOmPrimary');
    ui.more = overlay.querySelector('#peOmMore');
    ui.name = overlay.querySelector('#peOmName');
    ui.phone = overlay.querySelector('#peOmPhone');
    ui.count = overlay.querySelector('#peOmCount');
    ui.total = overlay.querySelector('#peOmTotal');

    REGIONS.forEach(function (label) {
      var opt = el('option', null, label);
      opt.value = label;
      ui.region.appendChild(opt);
    });
  }

  /* ---------- step 1: region ---------- */

  function getRegion() {
    return ui.area.value.trim() || ui.region.value;
  }

  function selectedAgent() {
    return state.agents[Number(ui.agent.value) || 0] || null;
  }

  function setNote(text, isError) {
    ui.note.textContent = text;
    ui.note.classList.toggle('is-error', !!isError);
  }

  function refreshRegion() {
    var region = getRegion();
    ui.next.disabled = !region;
    state.agents = region ? findAgents(region) : [];

    ui.agent.innerHTML = '';
    state.agents.forEach(function (a, i) {
      var phone = firstPhone(a);
      var opt = el('option', null, a.name + (phone ? ' (' + phone + ')' : ''));
      opt.value = String(i);
      ui.agent.appendChild(opt);
    });
    ui.agentWrap.hidden = state.agents.length < 2;

    if (!region) setNote('');
    else if (state.agents.length === 1) setNote('Your order will be sent to our ' + state.agents[0].name + ' delivery partner.');
    else if (state.agents.length > 1) setNote('Choose the delivery partner nearest to you.');
    else setNote('No delivery partner is listed for this area yet. Your order will go to the Pearl Essence main line.');
  }

  function goNext() {
    if (!getRegion()) {
      setNote('Please select or type your area to continue.', true);
      ui.region.focus();
      return;
    }
    setStep(2, 'next');
  }

  /* ---------- step 2: products ---------- */

  function getQty(id) { return state.qty[id] || 0; }

  function setQty(id, qty) {
    var min = id === state.primaryId ? 1 : 0;
    state.qty[id] = Math.max(min, Math.min(MAX_QTY, qty));
    refreshRow(id);
    refreshSummary();
  }

  function buildRow(product) {
    var isPrimary = product.id === state.primaryId;
    var li = el('li', 'pe-om-item');
    var thumb = el('img', 'pe-om-thumb');
    thumb.alt = product.name;
    thumb.loading = 'lazy';
    if (product.img) thumb.src = product.img;

    var meta = el('div', 'pe-om-meta');
    meta.appendChild(el('p', 'pe-om-name', product.name));
    meta.appendChild(el('p', 'pe-om-price', product.price ? formatMoney(product.price) : 'Price confirmed on order'));

    var stepper = el('div', 'pe-om-stepper');
    var minus = el('button', 'pe-om-step-btn', '\u2212');
    var qtyEl = el('span', 'pe-om-qty', '1');
    var plus = el('button', 'pe-om-step-btn', '+');
    minus.type = plus.type = 'button';
    minus.setAttribute('aria-label', 'Decrease quantity of ' + product.name);
    plus.setAttribute('aria-label', 'Increase quantity of ' + product.name);
    qtyEl.setAttribute('aria-live', 'polite');
    stepper.appendChild(minus);
    stepper.appendChild(qtyEl);
    stepper.appendChild(plus);

    var row = { li: li, qty: qtyEl, minus: minus, plus: plus, stepper: stepper, add: null };
    minus.addEventListener('click', function () {
      setQty(product.id, getQty(product.id) - 1);
      if (!getQty(product.id) && row.add) row.add.focus();
    });
    plus.addEventListener('click', function () { setQty(product.id, getQty(product.id) + 1); });

    li.appendChild(thumb);
    li.appendChild(meta);
    if (!isPrimary) {
      var add = el('button', 'pe-om-add', '+ Add');
      add.type = 'button';
      add.setAttribute('aria-label', 'Add ' + product.name + ' to your order');
      add.addEventListener('click', function () { setQty(product.id, 1); plus.focus(); });
      li.appendChild(add);
      row.add = add;
    }
    li.appendChild(stepper);
    state.rows[product.id] = row;
    return li;
  }

  function refreshRow(id) {
    var row = state.rows[id];
    if (!row) return;
    var qty = getQty(id);
    var isPrimary = id === state.primaryId;
    row.qty.textContent = qty;
    row.li.classList.toggle('is-selected', qty > 0);
    row.minus.disabled = isPrimary && qty <= 1;
    row.plus.disabled = qty >= MAX_QTY;
    row.stepper.hidden = qty === 0;
    if (row.add) row.add.hidden = qty > 0;
  }

  function renderProducts() {
    state.rows = {};
    ui.primary.innerHTML = '';
    ui.more.innerHTML = '';
    state.catalog.forEach(function (p) {
      (p.id === state.primaryId ? ui.primary : ui.more).appendChild(buildRow(p));
    });
    state.catalog.forEach(function (p) { refreshRow(p.id); });
    refreshSummary();
  }

  function selectedItems() {
    return state.catalog
      .filter(function (p) { return getQty(p.id) > 0; })
      .map(function (p) { return { product: p, qty: getQty(p.id) }; });
  }

  // Total is only exact when every selected product has a known price
  function totalText(items) {
    var sum = 0;
    var complete = items.length > 0;
    items.forEach(function (it) {
      if (it.product.price) sum += it.product.price * it.qty;
      else complete = false;
    });
    return complete ? formatMoney(sum) : 'To be confirmed';
  }

  function refreshSummary() {
    var items = selectedItems();
    var count = items.reduce(function (n, it) { return n + it.qty; }, 0);
    ui.count.textContent = count + (count === 1 ? ' item' : ' items');
    ui.total.textContent = 'Total: ' + totalText(items);
  }

  /* ---------- WhatsApp ---------- */

  function buildMessage() {
    var items = selectedItems();
    var lines = [
      'Hello,',
      'A new order has been placed on PearlEssence.com:',
      'Customer: ' + (ui.name.value.trim() || 'N/A')
    ];
    var phone = ui.phone.value.trim();
    if (phone) lines.push('Phone: ' + phone);
    lines.push('Address: ' + getRegion(), '', 'Items:');
    items.forEach(function (it) { lines.push('- ' + it.product.name + ' x ' + it.qty); });
    lines.push('', 'Total: ' + totalText(items), '', 'Please confirm delivery.');
    return lines.join('\n');
  }

  function sendOrder() {
    if (!selectedItems().length || !getRegion()) return;
    var agent = selectedAgent();
    var target = (agent && toWaNumber(firstPhone(agent))) || FALLBACK_WA;
    var url = 'https://wa.me/' + target + '?text=' + encodeURIComponent(buildMessage());
    window.open(url, '_blank', 'noopener');
    closeModal();
  }

  /* ---------- open / close / steps ---------- */

  function setStep(step, direction) {
    ui.panels.forEach(function (panel) {
      var active = Number(panel.getAttribute('data-panel')) === step;
      panel.hidden = !active;
      panel.classList.remove('slide-next', 'slide-prev');
      if (active && direction) panel.classList.add(direction === 'next' ? 'slide-next' : 'slide-prev');
    });
    ui.dots.forEach(function (dot) {
      var n = Number(dot.getAttribute('data-dot'));
      dot.classList.toggle('is-active', n === step);
      dot.classList.toggle('is-done', n < step);
      if (n === step) dot.setAttribute('aria-current', 'step'); else dot.removeAttribute('aria-current');
    });
    ui.line.classList.toggle('is-done', step > 1);
    ui.title.textContent = step === 1 ? 'Delivery Location' : 'Your Order';

    var body = ui.overlay.querySelector('[data-panel="' + step + '"] .pe-om-body');
    body.scrollTop = 0;
    if (direction) body.focus({ preventScroll: true });
  }

  function openModal(card, trigger) {
    var nameEl = card.querySelector('.product-name');
    var name = nameEl ? nameEl.textContent.trim() : '';
    state.catalog = collectCatalog();
    var primary = state.catalog.filter(function (p) { return p.name === name; })[0];
    if (!primary) return;

    state.primaryId = primary.id;
    state.qty = {};
    state.qty[primary.id] = 1;
    state.trigger = trigger;
    renderProducts();

    // Region and optional details from a previous order stay prefilled
    refreshRegion();
    setStep(1, null);

    ui.overlay.classList.add('is-open');
    ui.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    ui.region.focus({ preventScroll: true });
  }

  function closeModal() {
    ui.overlay.classList.remove('is-open');
    ui.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (state.trigger && document.contains(state.trigger)) state.trigger.focus({ preventScroll: true });
  }

  function isOpen() { return ui.overlay.classList.contains('is-open'); }

  function trapFocus(e) {
    var nodes = Array.prototype.filter.call(
      ui.overlay.querySelectorAll('button, select, input'),
      function (n) { return !n.disabled && n.offsetParent !== null; }
    );
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    var active = document.activeElement;
    var outside = nodes.indexOf(active) === -1;
    if (e.shiftKey && (active === first || outside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || outside)) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- init ---------- */

  function init() {
    if (document.getElementById('peOrderModal')) return;
    buildModal();

    ui.region.addEventListener('change', function () { ui.area.value = ''; refreshRegion(); });
    ui.area.addEventListener('input', function () {
      if (ui.area.value.trim()) ui.region.value = '';
      refreshRegion();
    });
    ui.agent.addEventListener('change', function () {
      var a = selectedAgent();
      if (a) setNote('Your order will be sent to our ' + a.name + ' delivery partner.');
    });
    ui.area.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); goNext(); }
    });
    ui.next.addEventListener('click', goNext);
    ui.back.addEventListener('click', function () { setStep(1, 'prev'); ui.region.focus({ preventScroll: true }); });
    ui.send.addEventListener('click', sendOrder);
    ui.close.addEventListener('click', closeModal);
    ui.overlay.addEventListener('mousedown', function (e) { if (e.target === ui.overlay) closeModal(); });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'Tab') trapFocus(e);
    });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.add-to-cart');
      var card = btn && btn.closest('.product-card');
      if (!card) return;
      e.preventDefault();
      openModal(card, btn);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
