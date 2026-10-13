/* Страница каталога. Состояние (поиск, раздел, наличие, сортировка, страница) хранится в адресе:
   /catalog/?q=зонд&c=zondy&av=1&s=price-asc&p=2 — страницу можно обновить, сохранить в закладки или отправить ссылкой. */
(function () {
  "use strict";
  var LP = window.LP, Shop = window.Shop, $ = LP.$, E = LP.esc, I = LP.icons;
  var DEF = { q: "", c: "", av: false, s: "name", p: 1 };
  var st = parse(), seq = 0, skTimer = 0, last = null, qTimer = 0;
  var grid = $("grid"), PS = Shop.perPage;

  function parse() {
    var u = new URLSearchParams(location.search), s = u.get("s");
    return { q: (u.get("q") || "").trim().slice(0, 100), c: Shop.catBySlug[u.get("c")] ? u.get("c") : "", av: u.get("av") === "1",
      s: Shop.SORTS.indexOf(s) >= 0 ? s : "name", p: Math.max(1, parseInt(u.get("p"), 10) || 1) };
  }
  function qs(o) {
    var q = new URLSearchParams();
    if (o.q) q.set("q", o.q); if (o.c) q.set("c", o.c); if (o.av) q.set("av", "1"); if (o.s !== "name") q.set("s", o.s); if (o.p > 1) q.set("p", o.p);
    var s = q.toString(); return s ? "?" + s : "";
  }
  function sync(mode) {
    var url = location.pathname + qs(st);
    if (url !== location.pathname + location.search) history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
    try { sessionStorage.setItem("lp-last-catalog", location.pathname + location.search); } catch (e) {}
  }
  function controls() {
    $("q").value = st.q; $("s").value = st.s; $("av").checked = st.av; $("qclear").hidden = !st.q; LP.syncHeaderSearch(st.q);
  }
  function active() { return !!(st.q || st.c || st.av); }

  /* ---------- отрисовка ---------- */
  function chips(r) {
    var tot = 0; Object.keys(r.facets || {}).forEach(function (k) { tot += r.facets[k]; });
    var h = '<a class="chip" href="' + LP.url.catalog(Object.assign({}, st, { c: "", p: 0, s: st.s === "name" ? "" : st.s, av: st.av ? 1 : "" })) + '" data-c=""' + (!st.c ? ' aria-current="true"' : "") + '>Все разделы <small>' + tot + '</small></a>';
    Shop.categories.forEach(function (c) {
      var n = (r.facets || {})[c.slug] || 0;
      h += '<a class="chip' + (n === 0 && st.c !== c.slug ? " zero" : "") + '" href="' + LP.url.catalog({ q: st.q, c: c.slug, av: st.av ? 1 : "", s: st.s === "name" ? "" : st.s }) + '" data-c="' + c.slug + '"' + (st.c === c.slug ? ' aria-current="true"' : "") + '>' + E(c.name) + ' <small>' + n + '</small></a>';
    });
    $("chips").innerHTML = h;
    var a = $("chips").querySelector('[aria-current="true"]'); if (a && a.scrollIntoView && $("chips").scrollWidth > $("chips").clientWidth) { var box = $("chips"); box.scrollLeft = Math.max(0, a.offsetLeft - 24); }
  }
  function pgList(c, n) {
    if (n <= 7) return Array.from({ length: n }, function (_, i) { return i + 1; });
    if (c <= 4) return [1, 2, 3, 4, 5, 0, n]; if (c >= n - 3) return [1, 0, n - 4, n - 3, n - 2, n - 1, n];
    return [1, 0, c - 1, c, c + 1, 0, n];
  }
  function pager(r) {
    if (r.pages < 2) return "";
    var b = function (p) { return '<button type="button" class="pb" data-a="pg" data-id="' + p + '" aria-label="Страница ' + p + '"' + (p === r.page ? ' aria-current="page"' : "") + '>' + p + '</button>'; };
    return '<button type="button" class="btn btn--ghost pp" data-a="prev"' + (r.page < 2 ? " disabled" : "") + '>' + I.left + 'Назад</button><div class="pn">' +
      pgList(r.page, r.pages).map(function (p) { return p ? b(p) : '<span class="pe" aria-hidden="true">…</span>'; }).join("") +
      '</div><button type="button" class="btn btn--ghost pp" data-a="next"' + (r.page >= r.pages ? " disabled" : "") + '>Далее' + I.right + '</button>';
  }
  function nf(n) { return Number(n).toLocaleString("ru-RU"); }
  function render(r, anim) {
    clearTimeout(skTimer); grid.classList.remove("busy"); grid.removeAttribute("aria-busy");
    chips(r);
    var catTotal = 0; Object.keys(r.facets || {}).forEach(function (k) { catTotal += r.facets[k]; });
    if (r.items.length) grid.innerHTML = r.items.map(LP.card).join("");
    else if (!active() && !r.total) grid.innerHTML = '<div class="state"><div class="ic" aria-hidden="true">📦</div><h2>Каталог пока пуст</h2><p>Товары скоро появятся.</p></div>';
    else grid.innerHTML = '<div class="state"><div class="ic" aria-hidden="true">🔍</div><h2>Ничего не найдено</h2><p>Измените запрос или выберите другой раздел. Можно сбросить все фильтры и посмотреть весь каталог.</p>' + (active() ? '<button type="button" class="btn btn--ghost" data-a="reset">Сбросить поиск и фильтры</button>' : "") + '</div>';
    grid.classList.remove("pgc"); if (anim) { void grid.offsetWidth; grid.classList.add("pgc"); }
    var a = (r.page - 1) * PS, info = "";
    if (r.total) info = r.total > PS ? (r.items.length === 1 ? "Показан товар <b>" + nf(a + 1) + "</b> из <b>" + nf(r.total) + "</b>" : "Показаны товары <b>" + nf(a + 1) + "–" + nf(a + r.items.length) + "</b> из <b>" + nf(r.total) + "</b>") : "Найдено товаров: <b>" + nf(r.total) + "</b>";
    $("resinfo").innerHTML = info; $("reset").hidden = !(active() && r.total);
    var pg = pager(r); $("pg").innerHTML = pg; $("pg").hidden = !pg; $("pgf").innerHTML = pg ? info : "";
    var cn = st.c && Shop.catBySlug[st.c] ? Shop.catBySlug[st.c].name : "";
    LP.setMeta({ title: (cn ? cn + " — " : "") + (st.q ? "поиск «" + st.q + "» — " : "") + "Каталог" + (r.page > 1 ? " — страница " + r.page : "") + " — Лавка Логопеда",
      robots: (st.q || r.page > 1) ? "noindex, follow" : "index, follow" });
    $("crumb-cat").textContent = "Каталог";
    last = r;
  }
  function showSkeleton() { grid.classList.add("busy"); grid.setAttribute("aria-busy", "true"); if (!last || !last.items.length) grid.innerHTML = new Array(8 + 1).join('<div class="sk" aria-hidden="true"></div>'); }
  function fail() {
    clearTimeout(skTimer); grid.classList.remove("busy"); grid.removeAttribute("aria-busy");
    grid.innerHTML = '<div class="state"><div class="ic" aria-hidden="true">⚠️</div><h2>Не удалось загрузить каталог</h2><p>Проверьте соединение с интернетом и попробуйте ещё раз.</p><button type="button" class="btn" data-a="retry">Повторить</button></div>';
    $("pg").hidden = true; $("resinfo").textContent = "";
  }
  function load(opts) {
    opts = opts || {}; var my = ++seq;
    clearTimeout(skTimer); skTimer = setTimeout(showSkeleton, 160);
    Shop.list(st).then(function (r) {
      if (my !== seq) return;
      if (r.page !== st.p) { st.p = r.page; sync("replace"); }
      render(r, opts.anim); if (opts.scroll) toTop(); if (opts.focus) opts.focus();
    }, function () { if (my === seq) fail(); });
  }
  function toTop() {
    var h = $("site-header").offsetHeight, t = $("tb").getBoundingClientRect().top + window.scrollY - h - 12;
    window.scrollTo({ top: Math.max(0, t) });
  }
  function go(o, mode, opts) { st = Object.assign({}, st, o); sync(mode || "push"); controls(); load(opts); }

  /* ---------- события ---------- */
  var tb = $("tb");
  tb.addEventListener("submit", function (e) { e.preventDefault(); clearTimeout(qTimer); go({ q: $("q").value.trim().slice(0, 100), p: 1 }, "replace"); });
  $("q").addEventListener("input", function () {
    $("qclear").hidden = !$("q").value; clearTimeout(qTimer);
    qTimer = setTimeout(function () { var v = $("q").value.trim().slice(0, 100); if (v !== st.q) go({ q: v, p: 1 }, "replace"); }, 260);
  });
  $("qclear").addEventListener("click", function () { $("q").value = ""; go({ q: "", p: 1 }, "replace"); $("q").focus(); });
  $("s").addEventListener("change", function () { go({ s: $("s").value, p: 1 }); });
  $("av").addEventListener("change", function () { go({ av: $("av").checked, p: 1 }); });
  $("chips").addEventListener("click", function (e) {
    var a = e.target.closest("a.chip"); if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault(); go({ c: a.getAttribute("data-c"), p: 1 });
  });
  function focusPager(kind) { return function () { var g = $("pg"), t = (kind && g.querySelector('[data-a="' + kind + '"]:not(:disabled)')) || g.querySelector('[aria-current="page"]'); if (t) t.focus({ preventScroll: true }); }; }
  function page(p, kind) { if (!last) return; p = Math.min(last.pages, Math.max(1, p | 0)); if (p === st.p) return; go({ p: p }, "push", { scroll: true, anim: true, focus: focusPager(kind) }); }
  LP.actions.pg = function (el) { page(+el.getAttribute("data-id")); };
  LP.actions.prev = function () { page(st.p - 1, "prev"); };
  LP.actions.next = function () { page(st.p + 1, "next"); };
  LP.actions.reset = function () { go({ q: "", c: "", av: false, p: 1 }); $("q").focus(); };
  LP.actions.retry = function () { load(); };
  window.addEventListener("popstate", function () { st = parse(); controls(); load(); });

  /* ---------- запуск ---------- */
  var names = Shop.names(); if (names.length && names.length <= 300) $("sg").innerHTML = names.map(function (n) { return '<option value="' + E(n) + '">'; }).join("");   // подсказки поиска (как в прежней версии)
  controls(); sync("replace"); load();
})();
