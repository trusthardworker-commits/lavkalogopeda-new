/* Слой данных магазина. Страницы работают только через window.Shop и не знают,
   откуда берутся товары: из data.js (сейчас) или с сервера (config.js → api).
   Формат ответа list(): { items, total, page, pages, perPage, facets:{slug:count} } */
(function () {
  "use strict";
  var CFG = window.SHOP_CONFIG, D = window.SHOP_DATA || { categories: [], products: [] };
  var cache = new Map();
  var catBySlug = {}; D.categories.forEach(function (c) { catBySlug[c.slug] = c; });
  var SORTS = ["name", "price-asc", "price-desc", "stock"];
  var remote = !!CFG.api;

  function norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/ё/g, "е"); }
  function shape(p) { p.catName = (catBySlug[p.cat] || {}).name || ""; cache.set(String(p.id), p); return p; }
  function cmpName(a, b) { return a.name.localeCompare(b.name, "ru"); }
  function sorter(s) {
    if (s === "price-asc") return function (a, b) { return a.price - b.price || cmpName(a, b); };
    if (s === "price-desc") return function (a, b) { return b.price - a.price || cmpName(a, b); };
    if (s === "stock") return function (a, b) { return (b.stock > 0) - (a.stock > 0) || cmpName(a, b); };
    return cmpName;
  }

  /* ---------- локальный режим ---------- */
  var L = D.products.map(shape);
  function localList(o) {
    var words = norm(o.q).split(/\s+/).filter(Boolean);
    var base = L.filter(function (p) {
      if (o.av && !(p.stock > 0)) return false;
      if (!words.length) return true;
      var hay = norm(p.name + " " + p.sku + " " + p.catName + " " + p.desc);
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
    var facets = {}; D.categories.forEach(function (c) { facets[c.slug] = 0; });
    base.forEach(function (p) { facets[p.cat] = (facets[p.cat] || 0) + 1; });
    var items = (o.c ? base.filter(function (p) { return p.cat === o.c; }) : base.slice()).sort(sorter(o.s));
    var total = items.length, ps = o.ps, pages = Math.max(1, Math.ceil(total / ps));
    var page = Math.min(Math.max(1, o.p), pages), st = (page - 1) * ps;
    return { items: items.slice(st, st + ps), total: total, page: page, pages: pages, perPage: ps, facets: facets };
  }

  /* ---------- удалённый режим (API) ---------- */
  function http(path, opt) {
    opt = opt || {};
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, opt.timeout || 15000);
    opt.signal = ctl.signal; opt.headers = Object.assign({ Accept: "application/json" }, opt.headers || {});
    return fetch(CFG.api + path, opt).then(function (r) {
      clearTimeout(t);
      return r.text().then(function (txt) {
        var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!r.ok) { var err = new Error("HTTP " + r.status); err.status = r.status; err.body = j; throw err; }
        return j;
      });
    }, function (e) { clearTimeout(t); throw e; });
  }
  function remoteList(o) {
    var q = new URLSearchParams();
    if (o.q) q.set("q", o.q); if (o.c) q.set("category", o.c); if (o.av) q.set("available", "1");
    q.set("sort", o.s); q.set("page", o.p); q.set("per_page", o.ps);
    return http("/products?" + q.toString()).then(function (j) {
      j.items = (j.items || []).map(shape); j.perPage = j.per_page || o.ps; return j;
    });
  }

  /* ---------- общий интерфейс ---------- */
  var Shop = {
    mode: CFG.mode, remote: remote, categories: D.categories, catBySlug: catBySlug, SORTS: SORTS, perPage: CFG.perPage || 36,
    list: function (o) {
      o = Object.assign({ q: "", c: "", av: false, s: "name", p: 1, ps: Shop.perPage }, o || {});
      if (SORTS.indexOf(o.s) < 0) o.s = "name"; if (o.c && !catBySlug[o.c]) o.c = "";
      o.p = Math.max(1, parseInt(o.p, 10) || 1);
      return remote ? remoteList(o) : Promise.resolve(localList(o));
    },
    get: function (id) {
      id = String(id);
      if (cache.has(id)) return Promise.resolve(cache.get(id));
      if (!remote) return Promise.resolve(null);
      return http("/products/" + encodeURIComponent(id)).then(shape, function (e) { if (e.status === 404) return null; throw e; });
    },
    byIds: function (ids) {
      var miss = ids.filter(function (i) { return !cache.has(String(i)); });
      var pre = (remote && miss.length) ? http("/products?ids=" + miss.map(encodeURIComponent).join(",")).then(function (j) { (j.items || []).forEach(shape); }) : Promise.resolve();
      return pre.then(function () { return ids.map(function (i) { return cache.get(String(i)) || null; }); });
    },
    names: function () { return remote ? [] : L.map(function (p) { return p.name; }); },
    peek: function (id) { return cache.get(String(id)) || null; },

    /* Отправка форм. demo: сохраняется только в браузере (как в прежней версии). live: POST на API,
       успех возвращается ТОЛЬКО после подтверждения сервером. */
    submit: function (kind, data, idemKey) {
      if (!remote || CFG.mode !== "live") {
        var key = { order: "orders", kids: "kreq", contact: "fb", review: "revs" }[kind];
        var A = []; try { A = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
        var rec = Object.assign({ no: A.length + 1, date: new Date().toLocaleString("ru") }, data);
        if (kind === "review") rec.pub = false;
        A.push(rec); try { localStorage.setItem(key, JSON.stringify(A)); } catch (e) {}
        return Promise.resolve({ demo: true, number: rec.no });
      }
      var path = { order: "/orders", kids: "/requests", contact: "/requests", review: "/reviews" }[kind];
      var body = Object.assign({}, data); if (kind === "kids" || kind === "contact") body.type = kind;
      return http(path, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey || "" }, body: JSON.stringify(body) })
        .then(function (j) { if (!j || j.ok !== true) throw new Error("bad response"); return { demo: false, number: j.number || j.id, id: j.id }; });
    },
    reviews: function () {
      if (remote && CFG.mode === "live") return http("/reviews").then(function (j) { return j.items || []; }, function () { return []; });
      var R = []; try { R = JSON.parse(localStorage.getItem("revs")) || []; } catch (e) {}
      return Promise.resolve(R.filter(function (r) { return r.pub === true; }));
    }
  };
  window.Shop = Shop;
})();
