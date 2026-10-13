/* Ядро сайта: общие утилиты, шапка/подвал, мобильное меню, уведомления, проверка форм, карточка товара.
   Подключается на каждой странице сразу после config.js, data.js, shop.js. */
(function () {
  "use strict";
  var CFG = window.SHOP_CONFIG, S = CFG.settings, cs = document.currentScript;
  var ROOT = cs.src.replace(/assets\/js\/core\.js.*$/, "");
  var IDX = location.protocol === "file:" ? "index.html" : "";   // чтобы сайт открывался и двойным щелчком по файлу
  var LP = window.LP = { cfg: CFG, S: S, ROOT: ROOT, actions: {} };

  /* ---------- утилиты ---------- */
  LP.$ = function (id) { return document.getElementById(id); };
  LP.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  LP.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  LP.fmt = function (n) { return Number(n).toLocaleString("ru-RU") + "\u00a0₽"; };
  LP.ld = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  LP.sv = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  LP.reduced = function () { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; };
  LP.uuid = function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  LP.url = {
    home: function (hash) { return ROOT + IDX + (hash || ""); },
    catalog: function (p) { var q = new URLSearchParams(); Object.keys(p || {}).forEach(function (k) { if (p[k]) q.set(k, p[k]); }); var s = q.toString(); return ROOT + "catalog/" + IDX + (s ? "?" + s : ""); },
    product: function (id) { return ROOT + "product/" + IDX + "?id=" + encodeURIComponent(id); },
    asset: function (p) { return ROOT + "assets/" + p; }
  };
  var I = LP.icons = {
    search: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    close: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    cart: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2L20 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>',
    check: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    share: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/></svg>',
    left: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    phone: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19 14.5V18a1.5 1.5 0 0 1-1.6 1.5C10.4 19 5 13.6 4.5 6.6A1.5 1.5 0 0 1 5 4z"/></svg>',
    copy: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>'
  };

  /* ---------- уведомления ---------- */
  var tt;
  LP.toast = function (msg, ms) {
    var t = LP.$("toast"); if (!t) return;
    t.textContent = ""; void t.offsetWidth; t.textContent = msg; t.classList.add("on");
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("on"); }, ms || 3000);
  };

  /* ---------- шапка (вставляется на место скрипта, чтобы не мигала) ---------- */
  var page = document.body.getAttribute("data-page") || "";
  function cur(name, val) { return page === name ? ' aria-current="' + (val || "page") + '"' : ""; }
  var navLinks = [
    ['<a href="' + LP.url.catalog() + '"' + (page === "catalog" ? ' aria-current="page"' : page === "product" ? ' aria-current="true"' : "") + '>Каталог</a>', "Каталог"],
    ['<a href="' + LP.url.home("#kids") + '">Детским садам</a>'],
    ['<a href="' + LP.url.home("#about") + '">О магазине</a>'],
    ['<a href="' + LP.url.home("#contacts") + '">Контакты</a>']
  ];
  function searchForm(id) {
    return '<form class="hsearch" role="search" action="' + LP.url.catalog() + '" method="get"><label class="sr-only" for="' + id + '">Поиск по каталогу</label>' +
      '<input id="' + id + '" type="search" name="q" placeholder="Поиск товаров" autocomplete="off" enterkeyhint="search"><button type="submit" aria-label="Найти">' + I.search + '</button></form>';
  }
  var mlinks = navLinks.map(function (l) { return l[0].replace("<a ", '<a class="l" ').replace("</a>", I.right + "</a>"); }).join("");
  var header =
    '<a class="skip" href="#main">Перейти к содержимому</a>' +
    '<header class="site-header" id="site-header"><div class="w hrow">' +
    '<a class="logo" href="' + LP.url.home() + '" aria-label="Лавка Логопеда — на главную"><img src="' + LP.url.asset("logo-480.png") + '" alt="" width="51" height="46"><span><b>Лавка Логопеда</b><small>СПЕЦИАЛИЗИРОВАННЫЙ МАГАЗИН</small></span></a>' +
    '<nav class="nav" aria-label="Основное меню">' + navLinks.map(function (l) { return l[0]; }).join("") + '</nav>' +
    searchForm("hq") +
    '<button class="btn cart-btn" type="button" id="cb" data-a="cart-open" aria-haspopup="dialog" aria-label="Открыть корзину">' + I.cart + '<span class="cart-label">Корзина</span><span class="badge" id="cn">0</span></button>' +
    '<button class="burger" type="button" id="burger" data-a="menu" aria-expanded="false" aria-controls="mnav" aria-label="Открыть меню"><span></span></button>' +
    '</div><div class="mnav" id="mnav"><div><div class="w">' + mlinks + searchForm("mq") + '</div></div></div></header>';
  cs.insertAdjacentHTML("beforebegin", header);

  /* ---------- мобильное меню ---------- */
  var burger = LP.$("burger"), mnav = LP.$("mnav");
  LP.menu = function (open) {
    mnav.classList.toggle("open", open); burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    if (open) mnav.removeAttribute("inert"); else mnav.setAttribute("inert", "");
  };
  mnav.setAttribute("inert", "");
  LP.actions.menu = function () { LP.menu(!mnav.classList.contains("open")); };
  mnav.addEventListener("click", function (e) { if (e.target.closest("a.l")) LP.menu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && mnav.classList.contains("open")) { LP.menu(false); burger.focus(); } });
  window.addEventListener("resize", function () { if (window.innerWidth > 1080 && mnav.classList.contains("open")) LP.menu(false); });
  // заполнить строку поиска в шапке текущим запросом на странице каталога
  LP.syncHeaderSearch = function (q) { ["hq", "mq"].forEach(function (id) { var el = LP.$(id); if (el) el.value = q || ""; }); };

  /* ---------- делегирование кликов по [data-a] ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]"); if (!el) return;
    var fn = LP.actions[el.getAttribute("data-a")]; if (fn) fn(el, e);
  });

  /* ---------- подвал, уведомление, настройки ---------- */
  function build() {
    var f = LP.$("site-footer");
    if (f) {
      f.className = "site-footer";
      f.innerHTML = '<div class="w"><div class="fgrid"><div><div class="fbrand"><img src="' + LP.url.asset("logo-480.png") + '" alt="" width="64" height="58" loading="lazy"><b>Лавка Логопеда</b></div>' +
        '<p>Специализированный магазин в г. ' + LP.esc(S.city) + ' для логопедов, дефектологов, воспитателей, родителей и учреждений.</p></div>' +
        '<div><h2>Разделы</h2><ul><li><a href="' + LP.url.catalog() + '">Каталог</a></li><li><a href="' + LP.url.home("#kids") + '">Детским садам</a></li><li><a href="' + LP.url.home("#about") + '">О магазине</a></li><li><a href="' + LP.url.home("#contacts") + '">Контакты</a></li></ul></div>' +
        '<div><h2>Связаться</h2><ul><li><a href="tel:' + S.ph.replace(/[^\d+]/g, "") + '">' + LP.esc(S.ph) + '</a></li><li data-set="addr-line"></li></ul></div></div>' +
        '<div class="fbottom"><span>© ' + new Date().getFullYear() + ' Лавка Логопеда</span></div></div>';
    }
    if (!LP.$("toast")) {
      document.body.insertAdjacentHTML("beforeend", '<div class="toast" id="toast" role="status" aria-live="polite"></div>');
    }
    LP.$$("[data-set]").forEach(function (el) {
      var k = el.getAttribute("data-set");
      if (k === "addr-line") el.textContent = S.addr === "Уточняется" ? "Адрес уточняется" : S.addr;
      else if (k === "ph") { el.textContent = S.ph; if (el.tagName === "A") el.href = "tel:" + S.ph.replace(/[^\d+]/g, ""); }
      else if (S[k] != null) el.textContent = S[k];
    });
    LP.$$(".rv").forEach(function (el) { io.observe(el); });
  }
  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .12 }) : { observe: function (el) { el.classList.add("in"); }, unobserve: function () {} };
  LP.reveal = function (root) { LP.$$(".rv", root).forEach(function (el) { io.observe(el); }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();

  /* ---------- проверка форм ---------- */
  var MSG = { req: "Заполните это поле", tel: "Укажите телефон: не менее 10 цифр", email: "Проверьте адрес почты, например name@mail.ru" };
  function errEl(input) {
    var f = input.closest(".field"), e = f && f.querySelector(".err");
    if (e && !e.id) { e.id = "err-" + Math.random().toString(36).slice(2, 8); }
    return e;
  }
  function setErr(input, msg) {
    var e = errEl(input); if (!e) return;
    if (msg) { e.textContent = msg; input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", e.id); }
    else { e.textContent = ""; input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); }
  }
  LP.checkForm = function (form) {
    var first = null;
    LP.$$("[data-v]", form).forEach(function (inp) {
      if (inp.disabled || inp.closest("[hidden]")) { setErr(inp, ""); return; }
      var rules = inp.getAttribute("data-v").split(" "), v = (inp.value || "").trim(), msg = "";
      if (rules.indexOf("req") >= 0 && !v) msg = inp.getAttribute("data-msg") || MSG.req;
      else if (v && rules.indexOf("tel") >= 0 && (v.replace(/\D/g, "").length < 10 || v.replace(/\D/g, "").length > 15 || /[^\d\s()+\-.]/.test(v))) msg = MSG.tel;
      else if (v && rules.indexOf("email") >= 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = MSG.email;
      setErr(inp, msg); if (msg && !first) first = inp;
    });
    if (first) first.focus();
    return !first;
  };
  document.addEventListener("input", function (e) { if (e.target.hasAttribute && e.target.hasAttribute("aria-invalid")) setErr(e.target, ""); });
  LP.formMsg = function (form, kind, html) {
    var m = form.querySelector(".form-msg"); if (!m) return;
    m.className = "form-msg" + (kind ? " " + kind : ""); m.innerHTML = html || "";
  };

  /* ---------- карточка товара (каталог, главная, похожие) ---------- */
  LP.card = function (p) {
    var inStock = p.stock > 0, href = LP.url.product(p.id), E = LP.esc;
    var pic = p.img ? '<img src="' + E(p.img) + '" alt="" loading="lazy" decoding="async" width="400" height="300">' : '<span aria-hidden="true">' + E(p.icon || "📦") + '</span>';
    var buy = inStock
      ? '<button type="button" class="btn main" data-a="add" data-id="' + E(p.id) + '">' + I.cart + 'В корзину</button>'
      : '<a class="btn btn--ghost main" href="' + LP.url.home("").split("#")[0] + "?notify=" + encodeURIComponent(p.name) + '#contacts">Узнать о поступлении</a>';
    return '<article class="card pcard"><div class="pic' + (p.img ? " has" : "") + (inStock ? "" : " out") + '">' + (inStock ? "" : '<span class="chip-out">Нет в наличии</span>') + pic + '</div>' +
      '<a class="cat" href="' + LP.url.catalog({ c: p.cat }) + '" style="position:relative;z-index:1">' + E(p.catName) + '</a>' +
      '<h3><a href="' + href + '">' + E(p.name) + '</a></h3><div class="art">Арт. ' + E(p.sku) + '</div><div class="price">' + LP.fmt(p.price) + '</div>' +
      '<div class="acts">' + buy + '<a class="btn btn--quiet" href="' + href + '">Подробнее</a></div></article>';
  };
  LP.setMeta = function (o) {
    if (o.title) document.title = o.title;
    var d = document.querySelector('meta[name="description"]'); if (d && o.desc) d.setAttribute("content", o.desc);
    var r = document.querySelector('meta[name="robots"]'); if (r && o.robots) r.setAttribute("content", o.robots);
  };
})();
