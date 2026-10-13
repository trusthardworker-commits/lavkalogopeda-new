/* Страница товара: /product/?id=1 */
(function () {
  "use strict";
  var LP = window.LP, Shop = window.Shop, $ = LP.$, E = LP.esc, I = LP.icons, fmt = LP.fmt;
  var box = $("pv"), id = new URLSearchParams(location.search).get("id"), P = null, qty = 1;

  function backHref() { try { return sessionStorage.getItem("lp-last-catalog") || ""; } catch (e) { return ""; } }
  function state(icon, h, t, btn) { box.innerHTML = '<div class="state"><div class="ic" aria-hidden="true">' + icon + '</div><h2>' + h + '</h2><p>' + t + '</p>' + (btn || "") + '</div>'; }
  function notFound() {
    LP.setMeta({ title: "Товар не найден — Лавка Логопеда", robots: "noindex, follow" });
    state("🔍", "Такого товара нет", "Возможно, он закончился, был скрыт или ссылка устарела.", '<a class="btn" href="' + LP.url.catalog() + '">Перейти в каталог</a>');
  }
  function crumbs(p) {
    $("crumbs").innerHTML = '<ol><li><a href="' + LP.url.home() + '">Главная</a></li><li><a href="' + LP.url.catalog() + '">Каталог</a></li><li><a href="' + LP.url.catalog({ c: p.cat }) + '">' + E(p.catName) + '</a></li><li><span aria-current="page">' + E(p.name) + '</span></li></ol>';
  }
  function inCartText() {
    var n = LP.cart ? LP.cart.qtyOf(P.id) : 0, el = $("incart"); if (!el) return;
    el.innerHTML = n ? 'В корзине: <b>' + n + ' шт.</b> <button type="button" class="linkbtn" data-a="cart-open">Открыть корзину</button>' : "";
  }
  function render(p) {
    P = p; var out = !(p.stock > 0), canon = CFGsite() + "/product/?id=" + encodeURIComponent(p.id);
    LP.setMeta({ title: p.name + " — Лавка Логопеда", desc: (p.desc || p.name).slice(0, 160), robots: p.demo ? "noindex, follow" : "index, follow" });
    var c = document.querySelector('link[rel="canonical"]'); if (c) c.href = canon;
    crumbs(p);
    var back = backHref(), pic = p.img ? '<img src="' + E(p.img) + '" alt="' + E(p.name) + '" width="800" height="600">' : '<span aria-hidden="true">' + E(p.icon || "📦") + '</span>';
    var buy = out
      ? '<a class="btn btn--ghost main" href="' + LP.url.home("").split("#")[0] + "?notify=" + encodeURIComponent(p.name) + '#contacts">Узнать о поступлении</a>'
      : '<div class="qty" role="group" aria-label="Количество"><button type="button" data-a="pv-dec" aria-label="Уменьшить количество">−</button><b id="pvq" aria-live="polite">1</b><button type="button" data-a="pv-inc" aria-label="Увеличить количество"' + (p.stock < 2 ? " disabled" : "") + '>+</button></div>' +
        '<button type="button" class="btn main" id="pv-add" data-a="pv-add">' + I.cart + 'В корзину</button>';
    box.innerHTML =
      '<a class="backlink" href="' + E(back || LP.url.catalog({ c: p.cat })) + '">' + I.left + (back ? "К результатам поиска" : "Назад в каталог") + '</a>' +
      '<div class="pv"><div class="pv-pic' + (p.img ? " has" : "") + (out ? " out" : "") + '">' + pic + '</div><div>' +
      '<a class="cat" href="' + LP.url.catalog({ c: p.cat }) + '">' + E(p.catName) + '</a><h1>' + E(p.name) + '</h1><div class="meta">Артикул: ' + E(p.sku) + '</div>' +
      '<div class="price">' + fmt(p.price) + '</div>' +
      '<div class="stock' + (out ? " no" : "") + '">' + (out ? "Нет в наличии" : "В наличии: " + p.stock + " шт.") + '</div>' +
      '<div class="buy">' + buy + '</div>' +
      '<div class="buy-extra"><span id="incart" aria-live="polite"></span><button type="button" class="linkbtn" data-a="share" style="display:inline-flex;gap:6px;align-items:center">' + I.share + 'Поделиться ссылкой</button></div>' +
      (p.demo ? '<div class="notice"><span>Демо-товар: название, цена и наличие — пример, не реальный ассортимент.</span></div>' : "") +
      '<div class="desc"><h2>Описание</h2><p>' + E(p.desc || "Описание пока не добавлено.") + '</p><dl class="specs"><dt>Артикул</dt><dd>' + E(p.sku) + '</dd><dt>Раздел</dt><dd>' + E(p.catName) + '</dd><dt>Наличие</dt><dd>' + (out ? "Нет в наличии" : p.stock + " шт.") + '</dd></dl></div></div></div>';
    inCartText();
    if (!p.demo) addJsonLd(p, canon);
    Shop.list({ c: p.cat, ps: 5, s: "stock" }).then(function (r) {
      var rel = r.items.filter(function (x) { return String(x.id) !== String(p.id); }).slice(0, 4);
      if (rel.length) { $("related").hidden = false; $("rel-grid").innerHTML = rel.map(LP.card).join(""); }
    }, function () {});
  }
  function CFGsite() { return (LP.cfg.siteUrl || "").replace(/\/$/, ""); }
  function addJsonLd(p, url) {
    var s = document.createElement("script"); s.type = "application/ld+json";
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, description: p.desc, category: p.catName, url: url,
      offers: { "@type": "Offer", priceCurrency: "RUB", price: String(p.price), availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: url } });
    document.head.appendChild(s);
  }

  LP.actions["pv-dec"] = function () { if (qty > 1) { qty--; $("pvq").textContent = qty; upd(); } };
  LP.actions["pv-inc"] = function () { if (qty < P.stock) { qty++; $("pvq").textContent = qty; upd(); } };
  function upd() { var inc = document.querySelector('[data-a="pv-inc"]'), dec = document.querySelector('[data-a="pv-dec"]'); if (inc) inc.disabled = qty >= P.stock; if (dec) dec.disabled = qty <= 1; }
  LP.actions["pv-add"] = function (el) { LP.cart.add(P.id, qty, el); };
  LP.actions.share = function () {
    var url = location.href.split("#")[0];
    if (navigator.share) navigator.share({ title: P.name, text: P.name + " — Лавка Логопеда", url: url }).catch(function () {});
    else LP.copyText(url, "Ссылка на товар скопирована");
  };
  document.addEventListener("cart:change", inCartText);

  if (!id) notFound();
  else Shop.get(id).then(function (p) { if (!p) notFound(); else render(p); },
    function () { state("⚠️", "Не удалось загрузить товар", "Проверьте соединение с интернетом и попробуйте ещё раз.", '<button type="button" class="btn" onclick="location.reload()">Обновить страницу</button>'); });
})();
