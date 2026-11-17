/* Pearl Essence admin - UI controller.
   Talks to storage only through window.PearlAdminData (see admin-data.js). */
(function () {
  'use strict';

  var Data = window.PearlAdminData;
  var Auth = window.PearlAdminAuth;
  var SIDEBAR_KEY = 'pe_admin_sidebar';
  var DRAWER_QUERY = '(max-width: 900px)';

  var state = { products: [], agents: [], orders: [], settings: { storeName: '', whatsapp: '', address: '', hours: '', acceptingOrders: true } };
  var VIEWS = ['overview', 'products', 'agents', 'settings'];

  /* ---------- helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) { return n > 0 ? 'TZS ' + Math.round(n).toLocaleString('en-US') : 'On request'; }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function toast(message, isError) {
    var node = document.createElement('div');
    node.className = 'toast' + (isError ? ' is-error' : '');
    node.textContent = message;
    $('toastRegion').appendChild(node);
    setTimeout(function () { node.remove(); }, isError ? 5000 : 3000);
  }

  function reportError(err) {
    toast(err && err.message ? err.message : 'Something went wrong. Please try again.', true);
  }

  function phoneParts(phone) {
    return String(phone || '').split(/[,;\n]+/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function waLink(number) {
    var d = String(number || '').replace(/\D/g, '');
    if (d.length === 10 && d[0] === '0') d = '255' + d.slice(1);
    else if (d.length === 9) d = '255' + d;
    return d.length >= 11 ? 'https://wa.me/' + d : '';
  }

  function switchHtml(opts) {
    return '<label class="switch">' +
      '<input type="checkbox" role="switch" data-toggle="' + opts.field + '" data-id="' + esc(opts.id) + '"' +
      (opts.checked ? ' checked' : '') + ' aria-label="' + esc(opts.label) + '">' +
      '<span class="switch-track"></span>' +
      '<span class="switch-text">' + (opts.checked ? opts.on : opts.off) + '</span></label>';
  }

  /* ---------- modals (shared behaviour) ---------- */

  var modalStack = [];

  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('button, input, select, textarea, a[href]'),
      function (n) { return !n.disabled && !n.hidden && n.offsetParent !== null; }
    );
  }

  function openModal(el, focusTarget) {
    el._returnFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    modalStack.push(el);
    document.body.classList.add('no-scroll');
    var target = focusTarget || focusables(el)[0];
    if (target) setTimeout(function () { target.focus(); }, 30);
  }

  function closeModal(el) {
    var index = modalStack.indexOf(el);
    if (index === -1) return;
    modalStack.splice(index, 1);
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (!modalStack.length && !isDrawerOpen()) document.body.classList.remove('no-scroll');
    var back = el._returnFocus;
    if (back && document.contains(back)) back.focus();
    if (typeof el._onClose === 'function') {
      var cb = el._onClose;
      el._onClose = null;
      cb();
    }
  }

  function setupModals() {
    document.querySelectorAll('.modal-backdrop').forEach(function (el) {
      el.addEventListener('mousedown', function (e) { if (e.target === el) closeModal(el); });
      el.querySelectorAll('[data-close]').forEach(function (btn) {
        btn.addEventListener('click', function () { closeModal(el); });
      });
    });

    document.addEventListener('keydown', function (e) {
      var top = modalStack[modalStack.length - 1];
      if (e.key === 'Escape') {
        if (top) closeModal(top);
        else if (isDrawerOpen()) closeDrawer();
      } else if (e.key === 'Tab' && top) {
        var nodes = focusables(top);
        if (!nodes.length) return;
        var first = nodes[0];
        var last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !top.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // Resolves true only when the admin presses the confirm button
  function confirmAction(opts) {
    var modal = $('confirmModal');
    $('confirmTitle').textContent = opts.title;
    $('confirmMessage').textContent = opts.message;
    $('confirmOk').textContent = opts.confirmLabel || 'Delete';

    return new Promise(function (resolve) {
      var settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        $('confirmOk').onclick = null;
        $('confirmCancel').onclick = null;
        resolve(result);
      }
      $('confirmOk').onclick = function () { finish(true); closeModal(modal); };
      $('confirmCancel').onclick = function () { closeModal(modal); };
      modal._onClose = function () { finish(false); };
      openModal(modal, $('confirmCancel'));
    });
  }

  /* ---------- sidebar & navigation ---------- */

  var shell = $('adminShell');
  var menuToggle = $('menuToggle');
  var drawerQuery = window.matchMedia(DRAWER_QUERY);

  function isDrawerOpen() { return shell.classList.contains('drawer-open'); }

  function syncMenuToggle() {
    var expanded = drawerQuery.matches ? isDrawerOpen() : !shell.classList.contains('sidebar-collapsed');
    menuToggle.setAttribute('aria-expanded', String(expanded));
  }

  function openDrawer() {
    shell.classList.add('drawer-open');
    document.body.classList.add('no-scroll');
    syncMenuToggle();
    var first = document.querySelector('.sidebar .nav-item');
    if (first) first.focus();
  }

  function closeDrawer(skipFocus) {
    if (!isDrawerOpen()) return;
    shell.classList.remove('drawer-open');
    if (!modalStack.length) document.body.classList.remove('no-scroll');
    syncMenuToggle();
    if (!skipFocus) menuToggle.focus();
  }

  function setupSidebar() {
    var collapsed = false;
    try { collapsed = localStorage.getItem(SIDEBAR_KEY) === 'collapsed'; } catch (e) { /* ignore */ }
    shell.classList.toggle('sidebar-collapsed', collapsed);
    syncMenuToggle();

    menuToggle.addEventListener('click', function () {
      if (drawerQuery.matches) {
        if (isDrawerOpen()) closeDrawer(); else openDrawer();
      } else {
        var now = shell.classList.toggle('sidebar-collapsed');
        try { localStorage.setItem(SIDEBAR_KEY, now ? 'collapsed' : 'expanded'); } catch (e) { /* ignore */ }
        syncMenuToggle();
      }
    });

    $('sidebarClose').addEventListener('click', function () { closeDrawer(); });
    $('sidebarScrim').addEventListener('click', function () { closeDrawer(); });

    var onChange = function () { closeDrawer(true); syncMenuToggle(); };
    if (drawerQuery.addEventListener) drawerQuery.addEventListener('change', onChange);
    else drawerQuery.addListener(onChange);

    document.querySelectorAll('.sidebar .nav-item[data-view]').forEach(function (link) {
      link.addEventListener('click', function () { closeDrawer(true); });
    });

    $('logoutBtn').addEventListener('click', Auth.logout);
    $('logoutBtn2').addEventListener('click', Auth.logout);
  }

  function showView(name) {
    if (VIEWS.indexOf(name) === -1) name = 'overview';
    var title = '';
    VIEWS.forEach(function (v) {
      var section = $('view-' + v);
      var active = v === name;
      section.hidden = !active;
      if (active) title = section.getAttribute('data-title');
    });
    document.querySelectorAll('.sidebar .nav-item[data-view]').forEach(function (link) {
      var active = link.getAttribute('data-view') === name;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    $('pageTitle').textContent = title;
    document.title = title + ' | Pearl Essence Admin';
    window.scrollTo(0, 0);
  }

  function route() { showView((window.location.hash || '').replace('#', '')); }

  /* ---------- overview ---------- */

  function today() { return new Date().toISOString().split('T')[0]; }

  function renderStats() {
    var todays = state.orders.filter(function (o) { return o.date === today(); });
    var approved = state.agents.filter(function (a) { return a.status === 'approved'; }).length;
    var pending = state.agents.length - approved;
    var visible = state.products.filter(function (p) { return p.status === 'active'; }).length;
    var outOfStock = state.products.filter(function (p) { return !p.inStock; }).length;

    $('ordersCount').textContent = todays.length;
    $('salesTotal').textContent = 'TZS ' + Math.round(todays.reduce(function (s, o) { return s + o.amount; }, 0)).toLocaleString('en-US');
    $('agentsCount').textContent = approved;
    $('agentsNote').textContent = pending ? plural(pending, 'application pending', 'applications pending') : 'No pending applications';
    $('productsCount').textContent = visible;
    $('productsNote').textContent = (state.products.length - visible) + ' hidden \u00B7 ' + outOfStock + ' out of stock';

    setBadge('navAgentsBadge', pending, pending + ' pending agents');
    setBadge('navProductsBadge', outOfStock, outOfStock + ' products out of stock');
  }

  function setBadge(id, count, label) {
    var badge = $(id);
    badge.hidden = !count;
    badge.textContent = count;
    badge.setAttribute('aria-label', label);
    badge.title = label;
  }

  function renderOrders() {
    var body = document.querySelector('#ordersTable tbody');
    var todays = state.orders.filter(function (o) { return o.date === today(); });
    if (!todays.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="6">No orders today.</td></tr>';
      return;
    }
    body.innerHTML = todays.map(function (o) {
      return '<tr>' +
        '<td data-label="Order ID" class="cell-main"><strong>' + esc(o.id) + '</strong></td>' +
        '<td data-label="Customer">' + esc(o.customer) + '</td>' +
        '<td data-label="Amount">TZS ' + Math.round(o.amount).toLocaleString('en-US') + '</td>' +
        '<td data-label="Status"><span class="badge badge-' + o.status + '">' + o.status + '</span></td>' +
        '<td data-label="Date">' + esc(o.date) + '</td>' +
        '<td class="col-actions"><div class="row-actions">' +
          (o.status === 'pending'
            ? '<button type="button" class="btn btn-secondary" data-action="complete" data-id="' + esc(o.id) + '"><i class="fas fa-check"></i> Mark completed</button>'
            : '') +
        '</div></td></tr>';
    }).join('');
  }

  /* ---------- products ---------- */

  function renderCategories() {
    var select = $('productCategory');
    var selected = select.value;
    var cats = Array.from(new Set(state.products.map(function (p) { return p.category; }))).sort();
    select.innerHTML = '<option value="">All categories</option>' +
      cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    select.value = cats.indexOf(selected) === -1 ? '' : selected;
    $('categoryList').innerHTML = cats.map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join('');
  }

  function filteredProducts() {
    var q = $('productSearch').value.trim().toLowerCase();
    var cat = $('productCategory').value;
    return state.products.filter(function (p) {
      return (!cat || p.category === cat) &&
        (!q || p.name.toLowerCase().indexOf(q) !== -1 || p.category.toLowerCase().indexOf(q) !== -1);
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function renderProducts() {
    var list = filteredProducts();
    var body = document.querySelector('#productsTable tbody');
    $('productCount').textContent = 'Showing ' + list.length + ' of ' + plural(state.products.length, 'product', 'products');

    if (!list.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="6">' +
        (state.products.length ? 'No products match your search.' : 'No products yet. Use \u201CAdd Product\u201D to create one.') + '</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (p) {
      return '<tr>' +
        '<td data-label="Product" class="cell-main"><strong>' + esc(p.name) + '</strong><span class="sub">' + esc(p.category) + '</span></td>' +
        '<td data-label="Price">' + money(p.price) + '</td>' +
        '<td data-label="Qty">' + p.stock + '</td>' +
        '<td data-label="Visibility">' + switchHtml({ id: p.id, field: 'visibility', checked: p.status === 'active', on: 'Active', off: 'Hidden', label: 'Visible in store: ' + p.name }) + '</td>' +
        '<td data-label="Stock">' + switchHtml({ id: p.id, field: 'stock', checked: p.inStock, on: 'In stock', off: 'Out of stock', label: 'In stock: ' + p.name }) + '</td>' +
        '<td class="col-actions"><div class="row-actions">' +
          '<button type="button" class="btn btn-icon" data-action="edit" data-id="' + esc(p.id) + '" aria-label="Edit ' + esc(p.name) + '" title="Edit"><i class="fas fa-pen"></i></button>' +
          '<button type="button" class="btn btn-icon is-danger" data-action="delete" data-id="' + esc(p.id) + '" aria-label="Delete ' + esc(p.name) + '" title="Delete"><i class="fas fa-trash"></i></button>' +
        '</div></td></tr>';
    }).join('');
  }

  function findById(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

  async function reload(which) {
    if (which === 'products') state.products = await Data.getProducts();
    else if (which === 'agents') state.agents = await Data.getAgents();
    else if (which === 'orders') state.orders = await Data.getOrders();
  }

  async function toggleProduct(input) {
    var product = findById(state.products, input.getAttribute('data-id'));
    if (!product) return;
    var field = input.getAttribute('data-toggle');
    var next = Object.assign({}, product);
    var message;
    if (field === 'visibility') {
      next.status = input.checked ? 'active' : 'hidden';
      message = product.name + (input.checked ? ' is now visible in the store' : ' is now hidden from the store');
    } else {
      next.inStock = input.checked;
      message = product.name + (input.checked ? ' marked in stock' : ' marked out of stock');
    }
    try {
      await Data.saveProduct(next);
      toast(message);
    } catch (err) {
      reportError(err);
    }
    await reload('products');
    renderProducts();
    renderStats();
    var again = document.querySelector('#productsTable [data-toggle="' + field + '"][data-id="' + product.id + '"]');
    if (again) again.focus();
  }

  function openProductModal(id) {
    var product = id ? findById(state.products, id) : null;
    $('productModalTitle').textContent = product ? 'Edit Product' : 'Add Product';
    $('productId').value = product ? product.id : '';
    $('productName').value = product ? product.name : '';
    $('productCategoryInput').value = product ? product.category : '';
    $('productPrice').value = product ? product.price : 0;
    $('productStock').value = product ? product.stock : 0;
    $('productActive').checked = product ? product.status === 'active' : true;
    $('productInStock').checked = product ? product.inStock : true;
    $('productError').hidden = true;
    openModal($('productModal'), $('productName'));
  }

  async function submitProduct(e) {
    e.preventDefault();
    var error = $('productError');
    var price = Number($('productPrice').value || 0);
    var stock = Number($('productStock').value || 0);
    var problem = '';
    if (!$('productName').value.trim()) problem = 'Product name is required.';
    else if (!$('productCategoryInput').value.trim()) problem = 'Category is required.';
    else if (!isFinite(price) || price < 0) problem = 'Price must be 0 or more.';
    else if (!isFinite(stock) || stock < 0 || Math.floor(stock) !== stock) problem = 'Stock must be a whole number, 0 or more.';
    if (problem) { error.textContent = problem; error.hidden = false; return; }

    var isEdit = !!$('productId').value;
    try {
      await Data.saveProduct({
        id: $('productId').value || undefined,
        name: $('productName').value,
        category: $('productCategoryInput').value,
        price: price,
        stock: stock,
        status: $('productActive').checked ? 'active' : 'hidden',
        inStock: $('productInStock').checked
      });
      closeModal($('productModal'));
      await reload('products');
      renderCategories();
      renderProducts();
      renderStats();
      toast(isEdit ? 'Product updated' : 'Product added');
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    }
  }

  async function deleteProduct(id) {
    var product = findById(state.products, id);
    if (!product) return;
    var ok = await confirmAction({
      title: 'Delete product?',
      message: '\u201C' + product.name + '\u201D will be permanently removed. This cannot be undone.'
    });
    if (!ok) return;
    try {
      await Data.deleteProduct(id);
      await reload('products');
      renderCategories();
      renderProducts();
      renderStats();
      toast('Product deleted');
    } catch (err) {
      reportError(err);
    }
  }

  /* ---------- agents ---------- */

  function filteredAgents() {
    var q = $('agentSearch').value.trim().toLowerCase();
    var qDigits = q.replace(/\D/g, '').replace(/^(255|0)/, '');
    var status = $('agentStatusFilter').value;
    return state.agents.filter(function (a) {
      if (status && a.status !== status) return false;
      if (!q) return true;
      return a.name.toLowerCase().indexOf(q) !== -1 ||
        a.region.toLowerCase().indexOf(q) !== -1 ||
        (qDigits.length > 2 && a.phone.replace(/\D/g, '').indexOf(qDigits) !== -1);
    }).sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  function phoneHtml(phone) {
    var parts = phoneParts(phone);
    if (!parts.length) return '\u2014';
    var link = waLink(parts[0]);
    var first = link
      ? '<a class="phone-link" href="' + link + '" target="_blank" rel="noopener" title="Open WhatsApp chat">' + esc(parts[0]) + '</a>'
      : esc(parts[0]);
    return first + (parts.length > 1 ? '<span class="phone-extra">+' + (parts.length - 1) + ' more</span>' : '');
  }

  function renderAgents() {
    var list = filteredAgents();
    var body = document.querySelector('#agentsTable tbody');
    $('agentCount').textContent = 'Showing ' + list.length + ' of ' + plural(state.agents.length, 'agent', 'agents');

    if (!list.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="5">' +
        (state.agents.length ? 'No agents match your search.' : 'No agents yet. Use \u201CAdd New Agent\u201D to create one.') + '</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (a) {
      return '<tr>' +
        '<td data-label="Name" class="cell-main"><strong>' + esc(a.name) + '</strong></td>' +
        '<td data-label="Region / City">' + esc(a.region) + '</td>' +
        '<td data-label="Phone / WhatsApp">' + phoneHtml(a.phone) + '</td>' +
        '<td data-label="Visibility">' + switchHtml({ id: a.id, field: 'agent-status', checked: a.status === 'approved', on: 'Approved', off: 'Pending', label: 'Approved: ' + a.name }) + '</td>' +
        '<td class="col-actions"><div class="row-actions">' +
          '<button type="button" class="btn btn-icon" data-action="edit" data-id="' + esc(a.id) + '" aria-label="Edit ' + esc(a.name) + '" title="Edit"><i class="fas fa-pen"></i></button>' +
          '<button type="button" class="btn btn-icon is-danger" data-action="delete" data-id="' + esc(a.id) + '" aria-label="Delete ' + esc(a.name) + '" title="Delete"><i class="fas fa-trash"></i></button>' +
        '</div></td></tr>';
    }).join('');
  }

  async function toggleAgent(input) {
    var agent = findById(state.agents, input.getAttribute('data-id'));
    if (!agent) return;
    var next = Object.assign({}, agent, { status: input.checked ? 'approved' : 'pending' });
    try {
      await Data.saveAgent(next);
      toast(agent.name + (input.checked ? ' approved' : ' set to pending'));
    } catch (err) {
      reportError(err);
    }
    await reload('agents');
    renderAgents();
    renderStats();
    var again = document.querySelector('#agentsTable [data-toggle="agent-status"][data-id="' + agent.id + '"]');
    if (again) again.focus();
  }

  function openAgentModal(id) {
    var agent = id ? findById(state.agents, id) : null;
    $('agentModalTitle').textContent = agent ? 'Edit Agent' : 'Add New Agent';
    $('agentId').value = agent ? agent.id : '';
    $('agentName').value = agent ? agent.name : '';
    $('agentRegion').value = agent ? agent.region : '';
    $('agentPhone').value = agent ? agent.phone : '';
    $('agentStatus').value = agent ? agent.status : 'approved';
    $('agentError').hidden = true;
    openModal($('agentModal'), $('agentName'));
  }

  async function submitAgent(e) {
    e.preventDefault();
    var isEdit = !!$('agentId').value;
    try {
      await Data.saveAgent({
        id: $('agentId').value || undefined,
        name: $('agentName').value,
        region: $('agentRegion').value,
        phone: $('agentPhone').value,
        status: $('agentStatus').value
      });
      closeModal($('agentModal'));
      await reload('agents');
      renderAgents();
      renderStats();
      toast(isEdit ? 'Agent updated' : 'Agent added');
    } catch (err) {
      $('agentError').textContent = err.message;
      $('agentError').hidden = false;
    }
  }

  async function deleteAgent(id) {
    var agent = findById(state.agents, id);
    if (!agent) return;
    var ok = await confirmAction({
      title: 'Delete agent?',
      message: '\u201C' + agent.name + '\u201D (' + agent.region + ') will be permanently removed. This cannot be undone.'
    });
    if (!ok) return;
    try {
      await Data.deleteAgent(id);
      await reload('agents');
      renderAgents();
      renderStats();
      toast('Agent deleted');
    } catch (err) {
      reportError(err);
    }
  }

  /* ---------- settings ---------- */

  function renderSettings() {
    var s = state.settings;
    $('setStoreName').value = s.storeName;
    $('setWhatsapp').value = s.whatsapp;
    $('setAddress').value = s.address;
    $('setHours').value = s.hours;
    $('setAccepting').checked = s.acceptingOrders;
    syncAcceptingText();

    var session = Auth.getSession();
    $('sessionInfo').textContent = session
      ? 'Signed in since ' + new Date(session.startedAt).toLocaleString() + '. Session expires ' + new Date(session.expiresAt).toLocaleString() + '.'
      : '';
  }

  function syncAcceptingText() {
    $('setAcceptingText').textContent = $('setAccepting').checked ? 'Accepting orders' : 'Orders paused';
  }

  async function submitSettings(e) {
    e.preventDefault();
    try {
      state.settings = await Data.saveSettings({
        storeName: $('setStoreName').value,
        whatsapp: $('setWhatsapp').value,
        address: $('setAddress').value,
        hours: $('setHours').value,
        acceptingOrders: $('setAccepting').checked
      });
      renderSettings();
      toast('Settings saved');
    } catch (err) {
      reportError(err);
    }
  }

  async function exportData() {
    try {
      var payload = await Data.exportAll();
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'pearl-essence-backup-' + today() + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (err) {
      reportError(err);
    }
  }

  /* ---------- wiring ---------- */

  function wire() {
    setupModals();
    setupSidebar();

    $('addProductBtn').addEventListener('click', function () { openProductModal(); });
    $('addAgentBtn').addEventListener('click', function () { openAgentModal(); });
    $('productSearch').addEventListener('input', renderProducts);
    $('productCategory').addEventListener('change', renderProducts);
    $('agentSearch').addEventListener('input', renderAgents);
    $('agentStatusFilter').addEventListener('change', renderAgents);
    $('productForm').addEventListener('submit', submitProduct);
    $('agentForm').addEventListener('submit', submitAgent);
    $('settingsForm').addEventListener('submit', submitSettings);
    $('setAccepting').addEventListener('change', syncAcceptingText);
    $('exportBtn').addEventListener('click', exportData);

    $('refreshOrdersBtn').addEventListener('click', async function () {
      try {
        await reload('orders');
        renderOrders();
        renderStats();
        toast('Orders refreshed');
      } catch (err) {
        reportError(err);
      }
    });

    $('ordersTable').addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-action="complete"]');
      if (!btn) return;
      var order = findById(state.orders, btn.getAttribute('data-id'));
      if (!order) return;
      try {
        await Data.saveOrder(Object.assign({}, order, { status: 'completed' }));
        await reload('orders');
        renderOrders();
        renderStats();
        toast('Order marked as completed');
      } catch (err) {
        reportError(err);
      }
    });

    $('productsTable').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      if (btn.getAttribute('data-action') === 'edit') openProductModal(id);
      else if (btn.getAttribute('data-action') === 'delete') deleteProduct(id);
    });
    $('productsTable').addEventListener('change', function (e) {
      if (e.target.matches('[data-toggle]')) toggleProduct(e.target);
    });

    $('agentsTable').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      if (btn.getAttribute('data-action') === 'edit') openAgentModal(id);
      else if (btn.getAttribute('data-action') === 'delete') deleteAgent(id);
    });
    $('agentsTable').addEventListener('change', function (e) {
      if (e.target.matches('[data-toggle]')) toggleAgent(e.target);
    });

    window.addEventListener('hashchange', route);
  }

  async function init() {
    if (!Auth.isAuthenticated()) return; // admin-auth.js is already redirecting
    wire();
    try {
      var results = await Promise.all([Data.getProducts(), Data.getAgents(), Data.getOrders(), Data.getSettings()]);
      state.products = results[0];
      state.agents = results[1];
      state.orders = results[2];
      state.settings = results[3];
    } catch (err) {
      reportError(err);
    }
    renderCategories();
    renderStats();
    renderOrders();
    renderProducts();
    renderAgents();
    renderSettings();
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
