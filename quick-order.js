/* Pearl Essence - product quick-order modal.
   Any element with data-quick-order="<product-id>" opens it; "Order via WhatsApp"
   sends a pre-filled message to the main Pearl Essence line. */
(function () {
  'use strict';

  var WA_NUMBER = '255754757065';
  var MIN_QTY = 1;
  var MAX_QTY = 99;
  var COLLECTION = 'all';
  var COLLECTION_DEFAULT = 'face-body-cream';

  // Add `variants: ['Finish A', 'Finish B']` to a product to show the variant selector for it.
  var PRODUCTS = {
    'sunscreen': {
      name: 'Pearl Essence Sunscreen',
      img: 'images/pearl-sunscreen.png',
      benefits: ['SPF 50+ broad-spectrum protection', 'Lightweight, non-greasy formula', 'Suitable for all skin types', 'Water-resistant with natural extracts'],
            variants: []
    },
    'vitamin-c': {
      name: 'Vitamin C Serum',
      img: 'images/vitamin-c-serum.png',
      benefits: ['Enhances glow & radiance in 7 days', 'Reduces dark spots', 'Leaves skin softer & brighter'],
      variants: []
    },
    'face-body-cream': {
      name: 'Pearl Essence Face & Body Cream',
      img: 'images/image A (6).jpg',
      benefits: ['Our best-selling face and body cream', 'Brightens and calms your skin'],
      variants: []
    },
    'pearl-cream': {
      name: 'Pearl Essence Cream',
      img: 'images/image A (5).jpg',
      benefits: ['24K Gold Infused Formula', 'Pearl Protein Extract', 'Deep Hydration Complex', 'Anti-Aging Properties'],
      variants: []
    },
    'pearl-soap': {
      name: 'Pearl Essence Soap',
      img: 'images/glowic1.png.jpg',
      benefits: ['Micro-Pearl Exfoliation', 'pH Balanced Formula', 'Vegan Ingredients', 'Silky Smooth Lather'],
      variants: []
    },
    'shower-gel': {
      name: 'Pearl Shower Gel',
      img: 'images/showergel.png.jpg',
      benefits: ['Luxurious Pearl Extract', 'Moisture Lock Technology', 'Refreshing Floral Scent', 'Silicon-Free Formula'],
      variants: []
    },
    'glowic-cream': {
      name: 'Glowic Essence Cream',
      img: 'images/glowic1.png.jpg',
      benefits: ['Overnight Cell Renewal', 'Pearl Collagen Boost', 'Ultra-Nourishing', 'Non-Greasy Finish'],
      variants: []
    },
    'cbd-serum': {
      name: 'CBD Serum',
      img: 'images/oil (1).jpg',
      benefits: ['Pearl + CBD Fusion', 'Anti-Inflammatory', 'Brightening Effect', 'Fast-Absorbing'],
      variants: []
    }
  };

  var state = { id: null, trigger: null };
  var ui = {};

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clampQty(value) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) return MIN_QTY;
    return Math.min(MAX_QTY, Math.max(MIN_QTY, n));
  }

  function getQty() { return clampQty(ui.qty.value); }

  function buildModal() {
    var overlay = el('div', 'pe-qo-overlay');
    overlay.id = 'peQuickOrder';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="pe-qo" role="dialog" aria-modal="true" aria-labelledby="peQoTitle">' +
        '<button type="button" class="pe-qo-close" aria-label="Close order window">&times;</button>' +
        '<div class="pe-qo-media"><img alt="" decoding="async"></div>' +
        '<div class="pe-qo-body">' +
          '<div class="pe-qo-kicker">Quick order</div>' +
          '<div class="pe-qo-field pe-qo-picker" hidden>' +
            '<label class="pe-qo-label" for="peQoProduct">Choose a product</label>' +
            '<select id="peQoProduct" class="pe-qo-select"></select>' +
          '</div>' +
          '<h3 class="pe-qo-title" id="peQoTitle"></h3>' +
          '<ul class="pe-qo-benefits" aria-label="Key benefits"></ul>' +
          '<div class="pe-qo-field pe-qo-variant" hidden>' +
            '<label class="pe-qo-label" for="peQoVariant">Finish / variant</label>' +
            '<select id="peQoVariant" class="pe-qo-select"></select>' +
          '</div>' +
          '<div class="pe-qo-field">' +
            '<label class="pe-qo-label" for="peQoQty">Quantity</label>' +
            '<div class="pe-qo-qty">' +
              '<button type="button" class="pe-qo-qty-btn" data-step="-1" aria-label="Decrease quantity">&minus;</button>' +
              '<input id="peQoQty" class="pe-qo-qty-input" type="number" inputmode="numeric" min="' + MIN_QTY + '" max="' + MAX_QTY + '" value="1">' +
              '<button type="button" class="pe-qo-qty-btn" data-step="1" aria-label="Increase quantity">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="pe-qo-actions">' +
            '<button type="button" class="pe-qo-whatsapp"><i class="fab fa-whatsapp" aria-hidden="true"></i> Order via WhatsApp</button>' +
            '<button type="button" class="pe-qo-partner" hidden>Prefer a delivery partner in your area?</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    ui.overlay = overlay;
    ui.close = overlay.querySelector('.pe-qo-close');
    ui.img = overlay.querySelector('.pe-qo-media img');
    ui.pickerWrap = overlay.querySelector('.pe-qo-picker');
    ui.picker = overlay.querySelector('#peQoProduct');
    ui.title = overlay.querySelector('#peQoTitle');
    ui.benefits = overlay.querySelector('.pe-qo-benefits');
    ui.variantWrap = overlay.querySelector('.pe-qo-variant');
    ui.variant = overlay.querySelector('#peQoVariant');
    ui.qty = overlay.querySelector('#peQoQty');
    ui.minus = overlay.querySelector('[data-step="-1"]');
    ui.plus = overlay.querySelector('[data-step="1"]');
    ui.send = overlay.querySelector('.pe-qo-whatsapp');
    ui.partner = overlay.querySelector('.pe-qo-partner');

    Object.keys(PRODUCTS).forEach(function (id) {
      var opt = el('option', null, PRODUCTS[id].name);
      opt.value = id;
      ui.picker.appendChild(opt);
    });
  }

  function renderProduct(id) {
    var product = PRODUCTS[id];
    if (!product) return;
    state.id = id;

    ui.img.src = product.img;
    ui.img.alt = product.name;
    ui.title.textContent = product.name;

    ui.benefits.innerHTML = '';
    product.benefits.forEach(function (text) { ui.benefits.appendChild(el('li', null, text)); });

    var variants = product.variants || [];
    ui.variant.innerHTML = '';
    variants.forEach(function (label) {
      var opt = el('option', null, label);
      opt.value = label;
      ui.variant.appendChild(opt);
    });
    ui.variantWrap.hidden = variants.length === 0;

    ui.partner.hidden = !window.PearlRegionalOrder;
    ui.qty.value = 1;
    refreshQty();
  }

  function refreshQty() {
    var qty = getQty();
    ui.qty.value = qty;
    ui.minus.disabled = qty <= MIN_QTY;
    ui.plus.disabled = qty >= MAX_QTY;
  }

  function buildMessage() {
    var product = PRODUCTS[state.id];
    var lines = [
      'Hello Pearl Essence, I would like to place an order:',
      '',
      'Product: ' + product.name
    ];
    if (!ui.variantWrap.hidden && ui.variant.value) lines.push('Variant: ' + ui.variant.value);
    lines.push('Quantity: ' + getQty(), '', 'Please confirm availability and delivery details. Thank you!');
    return lines.join('\n');
  }

  function sendOrder() {
    if (!PRODUCTS[state.id]) return;
    var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(buildMessage());
    window.open(url, '_blank', 'noopener');
  }

  function isOpen() { return ui.overlay.classList.contains('is-open'); }

  function openModal(id, trigger) {
    var collection = id === COLLECTION;
    var target = collection ? COLLECTION_DEFAULT : id;
    if (!PRODUCTS[target]) return;

    state.trigger = trigger || null;
    ui.pickerWrap.hidden = !collection;
    ui.picker.value = target;
    renderProduct(target);

    ui.overlay.classList.add('is-open');
    ui.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    ui.send.focus({ preventScroll: true });
  }

  function closeModal(restoreFocus) {
    ui.overlay.classList.remove('is-open');
    ui.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (restoreFocus !== false && state.trigger && document.contains(state.trigger)) {
      state.trigger.focus({ preventScroll: true });
    }
  }

  function trapFocus(e) {
    var nodes = Array.prototype.filter.call(
      ui.overlay.querySelectorAll('button, select, input'),
      function (n) { return !n.disabled && !n.hidden && n.offsetParent !== null; }
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

  function init() {
    if (document.getElementById('peQuickOrder')) return;
    buildModal();

    ui.close.addEventListener('click', function () { closeModal(); });
    ui.overlay.addEventListener('mousedown', function (e) { if (e.target === ui.overlay) closeModal(); });
    ui.picker.addEventListener('change', function () { renderProduct(ui.picker.value); });
    ui.send.addEventListener('click', sendOrder);

    [ui.minus, ui.plus].forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.qty.value = getQty() + Number(btn.getAttribute('data-step'));
        refreshQty();
      });
    });
    ui.qty.addEventListener('change', refreshQty);
    ui.qty.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); refreshQty(); sendOrder(); }
    });

    ui.partner.addEventListener('click', function () {
      var product = PRODUCTS[state.id];
      var trigger = state.trigger;
      closeModal(false);
      if (window.PearlRegionalOrder && product) window.PearlRegionalOrder.open(product.name, trigger, product.img);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'Tab') trapFocus(e);
    });

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-quick-order]');
      if (!trigger) return;
      e.preventDefault();
      openModal(trigger.getAttribute('data-quick-order'), trigger);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
