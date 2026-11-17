/* Pearl Essence admin - data layer.
   The UI only calls the functions on window.PearlAdminData (all return Promises):
     getProducts() / saveProduct(p) / deleteProduct(id)
     getAgents()   / saveAgent(a)   / deleteAgent(id)
     getOrders()   / saveOrder(o)
     getSettings() / saveSettings(s)
     exportAll()
   Storage is delegated to an adapter, localStorage by default. To move to Firebase or
   Supabase, implement the same adapter and call PearlAdminData.useAdapter(myAdapter):
     list(collection)            -> Promise<array | null>   (null = never initialised)
     replaceAll(collection, arr) -> Promise<void>
     upsert(collection, item)    -> Promise<void>           (item.id is always set)
     remove(collection, id)      -> Promise<void>
     getDoc(name)                -> Promise<object | null>
     setDoc(name, obj)           -> Promise<void>
   Records are normalised here, so every adapter returns the same shapes. */
(function () {
  'use strict';

  var KEYS = {
    products: 'pe_products',
    agents: 'pe_agents',
    orders: 'pe_orders',
    settings: 'pe_settings'
  };
  var STOREFRONT_AGENTS_KEY = 'pe_agents_v1'; // agent directory the storefront builds

  /* ---------- default adapter: localStorage ---------- */

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  var localAdapter = {
    list: function (collection) {
      var data = readJSON(KEYS[collection]);
      return Promise.resolve(Array.isArray(data) ? data : null);
    },
    replaceAll: function (collection, items) {
      writeJSON(KEYS[collection], items);
      return Promise.resolve();
    },
    upsert: function (collection, item) {
      var items = readJSON(KEYS[collection]);
      items = Array.isArray(items) ? items : [];
      var index = items.findIndex(function (it) { return it.id === item.id; });
      if (index === -1) items.push(item); else items[index] = item;
      writeJSON(KEYS[collection], items);
      return Promise.resolve();
    },
    remove: function (collection, id) {
      var items = readJSON(KEYS[collection]);
      items = (Array.isArray(items) ? items : []).filter(function (it) { return it.id !== id; });
      writeJSON(KEYS[collection], items);
      return Promise.resolve();
    },
    getDoc: function (name) {
      var data = readJSON(KEYS[name]);
      return Promise.resolve(data && typeof data === 'object' && !Array.isArray(data) ? data : null);
    },
    setDoc: function (name, obj) {
      writeJSON(KEYS[name], obj);
      return Promise.resolve();
    }
  };

  var adapter = localAdapter;

  /* ---------- helpers ---------- */

  function newId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function str(value) { return value == null ? '' : String(value).trim(); }

  function toNumber(value, fallback) {
    var n = Number(value);
    return isFinite(n) && n >= 0 ? n : fallback;
  }

  /* ---------- normalisers (also migrate records saved by the old dashboard) ---------- */

  function normalizeProduct(raw) {
    raw = raw || {};
    var stock = Math.floor(toNumber(raw.stock, 0));
    var hidden = raw.status === 'hidden' || raw.status === 'inactive';
    return {
      id: str(raw.id) || newId('p_'),
      name: str(raw.name),
      category: str(raw.category) || 'General',
      price: toNumber(raw.price, 0),
      stock: stock,
      status: hidden ? 'hidden' : 'active',
      inStock: typeof raw.inStock === 'boolean' ? raw.inStock : stock > 0
    };
  }

  function normalizeAgent(raw) {
    raw = raw || {};
    var phone = Array.isArray(raw.phone) ? raw.phone.join(', ') : str(raw.phone);
    var approved = raw.status === 'approved' || raw.status === 'active' || raw.status === undefined;
    return {
      id: str(raw.id) || newId('a_'),
      name: str(raw.name),
      region: str(raw.region || raw.area || raw.location),
      phone: phone,
      status: approved ? 'approved' : 'pending'
    };
  }

  function normalizeOrder(raw) {
    raw = raw || {};
    return {
      id: str(raw.id) || newId('ORD-'),
      customer: str(raw.customer),
      amount: toNumber(raw.amount, 0),
      status: raw.status === 'completed' ? 'completed' : 'pending',
      date: str(raw.date),
      items: Array.isArray(raw.items) ? raw.items : []
    };
  }

  var DEFAULT_SETTINGS = {
    storeName: 'Pearl Essence',
    whatsapp: '255754757065',
    address: 'Universal Hotel Sinza mori, Dar es Salaam, Tanzania',
    hours: 'Mon-Fri: 9AM - 6PM, Sat: 10AM - 4PM',
    acceptingOrders: true
  };

  function normalizeSettings(raw) {
    raw = raw || {};
    return {
      storeName: str(raw.storeName) || DEFAULT_SETTINGS.storeName,
      whatsapp: str(raw.whatsapp).replace(/\D/g, '') || DEFAULT_SETTINGS.whatsapp,
      address: str(raw.address),
      hours: str(raw.hours),
      acceptingOrders: raw.acceptingOrders !== false
    };
  }

  /* ---------- first-run seeds ---------- */

  function seedProducts() {
    // Price 0 = "confirmed on order", matching the storefront
    return [
      ['Pearl Essence Cream', 'Creams'], ['Pearl Essence Soap', 'Cleansers'],
      ['Pearl Shower Gel', 'Cleansers'], ['Glowic Essence Cream', 'Creams'],
      ['CBD Serum', 'Serums'], ['Vitamin C Serum', 'Serums'],
      ['Pearl Essence Sunscreen', 'Sun Care'], ['Pearl Essence Face & Body Cream', 'Creams']
    ].map(function (p, i) {
      return normalizeProduct({ id: 'seed-p' + (i + 1), name: p[0], category: p[1], price: 0, stock: 50, status: 'active', inStock: true });
    });
  }

  function seedAgents() {
    // Start from the real agent directory the storefront already maintains, if present
    var shared = readJSON(STOREFRONT_AGENTS_KEY);
    if (!Array.isArray(shared)) return [];
    return shared.map(function (a, i) {
      return normalizeAgent({ id: a.id || 'seed-a' + (i + 1), name: a.name, region: a.area || a.location, phone: a.phone, status: 'approved' });
    });
  }

  function seedOrders() {
    var today = new Date().toISOString().split('T')[0];
    return [
      { id: 'ORD-1001', customer: 'Emily Wilson', amount: 276000, status: 'pending', date: today, items: ['Pearl Serum'] },
      { id: 'ORD-1002', customer: 'David Lee', amount: 391000, status: 'completed', date: today, items: ['Silk Moisturizer', 'Pearl Essence Soap'] }
    ].map(normalizeOrder);
  }

  /* ---------- collection helpers ---------- */

  function loadCollection(name, normalize, seed) {
    return adapter.list(name).then(function (items) {
      if (items === null) {
        var seeded = seed();
        return adapter.replaceAll(name, seeded).then(function () { return seeded; });
      }
      return items.map(normalize);
    });
  }

  function saveItem(name, normalize, item, validate) {
    var clean = normalize(item);
    var problem = validate(clean);
    if (problem) return Promise.reject(new Error(problem));
    return adapter.upsert(name, clean).then(function () { return clean; });
  }

  /* ---------- public API ---------- */

  window.PearlAdminData = {
    useAdapter: function (next) { adapter = next || localAdapter; },

    getProducts: function () { return loadCollection('products', normalizeProduct, seedProducts); },
    saveProduct: function (product) {
      return saveItem('products', normalizeProduct, product, function (p) {
        return p.name ? '' : 'Product name is required.';
      });
    },
    deleteProduct: function (id) { return adapter.remove('products', id); },

    getAgents: function () { return loadCollection('agents', normalizeAgent, seedAgents); },
    saveAgent: function (agent) {
      return saveItem('agents', normalizeAgent, agent, function (a) {
        if (!a.name) return 'Agent name is required.';
        if (!a.region) return 'Region / city is required.';
        if (a.phone.replace(/\D/g, '').length < 9) return 'Enter a valid phone / WhatsApp number.';
        return '';
      });
    },
    deleteAgent: function (id) { return adapter.remove('agents', id); },

    getOrders: function () { return loadCollection('orders', normalizeOrder, seedOrders); },
    saveOrder: function (order) { return saveItem('orders', normalizeOrder, order, function () { return ''; }); },

    getSettings: function () {
      return adapter.getDoc('settings').then(function (doc) { return normalizeSettings(doc || DEFAULT_SETTINGS); });
    },
    saveSettings: function (settings) {
      var clean = normalizeSettings(settings);
      if (clean.whatsapp.length < 9 || clean.whatsapp.length > 15) {
        return Promise.reject(new Error('Enter a valid WhatsApp number with country code.'));
      }
      return adapter.setDoc('settings', clean).then(function () { return clean; });
    },

    exportAll: function () {
      var api = window.PearlAdminData;
      return Promise.all([api.getProducts(), api.getAgents(), api.getOrders(), api.getSettings()]).then(function (r) {
        return { exportedAt: new Date().toISOString(), products: r[0], agents: r[1], orders: r[2], settings: r[3] };
      });
    }
  };
})();
