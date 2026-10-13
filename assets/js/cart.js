/* Корзина и оформление заказа. Общая для всех страниц: корзина хранится в localStorage (ключ "cart": {id: количество}).
   Цены в корзине — только для показа покупателю. В режиме live сервер сам пересчитывает цену, количество и остатки. */
(function () {
  "use strict";
  var LP = window.LP, Shop = window.Shop, $ = LP.$, E = LP.esc, fmt = LP.fmt, CFG = LP.cfg, I = LP.icons;
  var C = {}, drawer, backdrop, lastFocus = null, busy = false, token = 0;

  function readStore() { var r = LP.ld("cart", {}), o = {}; Object.keys(r).forEach(function (k) { var q = Math.floor(+r[k]); if (q > 0) o[k] = q; }); return o; }
  function count() { return Object.keys(C).reduce(function (s, k) { return s + C[k]; }, 0); }
  function total() { return Object.keys(C).reduce(function (s, k) { var p = Shop.peek(k); return s + (p ? p.price * C[k] : 0); }, 0); }
  function isOpen() { return drawer && drawer.classList.contains("open"); }
  function badge() {
    var n = count(), b = $("cn"), btn = $("cb"); if (!b) return;
    b.textContent = n > 99 ? "99+" : n; btn.classList.toggle("has-items", n > 0);
    btn.setAttribute("aria-label", n ? "Открыть корзину, товаров: " + n : "Открыть корзину");
  }
  function save() { LP.sv("cart", C); changed(); }
  function changed() { badge(); document.dispatchEvent(new CustomEvent("cart:change")); if (isOpen()) renderList(); }

  /* приводим корзину в порядок: неизвестные товары, нулевой остаток, количество больше остатка */
  function sanitize() {
    var ids = Object.keys(C);
    return Shop.byIds(ids).then(function (ps) {
      var dirty = false;
      ids.forEach(function (id, i) {
        var p = ps[i];
        if (!p || !(p.stock > 0)) { delete C[id]; dirty = true; }
        else if (C[id] > p.stock) { C[id] = p.stock; dirty = true; }
      });
      if (dirty) save(); else badge();
    }, function () { badge(); });
  }

  var api = LP.cart = {
    count: count,
    qtyOf: function (id) { return C[id] || 0; },
    add: function (id, qty, btn) {
      id = String(id); qty = qty || 1;
      var p = Shop.peek(id); if (!p || !(p.stock > 0)) return false;
      var cur = C[id] || 0;
      if (cur >= p.stock) { LP.toast("В наличии только " + p.stock + " шт."); return false; }
      var next = Math.min(cur + qty, p.stock);
      C[id] = next; save();
      if (cur + qty > p.stock) LP.toast("В наличии только " + p.stock + " шт. Добавлено максимум."); else LP.toast("Добавлено в корзину");
      var n = $("cn"); n.classList.remove("bump"); void n.offsetWidth; n.classList.add("bump");
      if (btn && !btn.dataset.busy) {   // кнопка на секунду показывает «Добавлено»
        var old = btn.innerHTML; btn.dataset.busy = "1"; btn.classList.add("is-done"); btn.innerHTML = I.check + "Добавлено";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); delete btn.dataset.busy; }, 1300);
      }
      return true;
    }
  };

  /* ---------- разметка корзины ---------- */
  function build() {
    document.body.insertAdjacentHTML("beforeend",
      '<div class="backdrop" id="bk"></div>' +
      '<aside class="drawer" id="dr" role="dialog" aria-modal="true" aria-labelledby="dr-title" aria-hidden="true">' +
      '<div class="dr-head"><h2 id="dr-title">Корзина</h2><button type="button" class="icon-btn" data-a="cart-close" aria-label="Закрыть корзину">' + I.close + '</button></div>' +
      '<div class="dr-body" id="dr-body"><div id="dr-list" aria-live="polite"></div>' +
      '<div id="dr-checkout" hidden>' +
      '<div class="notice" id="dr-demo" hidden><span>Сайт в режиме подготовки: через эту форму заказ пока <b>не доходит</b> до магазина. Оформить заказ можно по телефону — <a href="tel:' + LP.S.ph.replace(/[^\d+]/g, "") + '">' + E(LP.S.ph) + '</a>.</span></div>' +
      '<h3 class="dr-sub">Оформление заказа</h3>' +
      '<form id="of" novalidate>' +
      '<div class="seg" role="radiogroup" aria-label="Тип покупателя"><label><input type="radio" name="buyer" value="person" checked><span>Физическое лицо</span></label><label><input type="radio" name="buyer" value="org"><span>Организация, детский сад</span></label></div>' +
      '<label class="field" id="f-org" hidden><span>Название организации</span><input name="org" data-v="req" autocomplete="organization" maxlength="200"><span class="err"></span></label>' +
      '<label class="field"><span>Имя</span><input name="name" data-v="req" autocomplete="name" maxlength="100"><span class="err"></span></label>' +
      '<label class="field"><span>Телефон</span><input name="phone" type="tel" inputmode="tel" data-v="req tel" autocomplete="tel" maxlength="30" placeholder="8 900 000-00-00"><span class="err"></span></label>' +
      '<label class="field"><span>Email <i>(необязательно)</i></span><input name="email" type="email" data-v="email" autocomplete="email" maxlength="120"><span class="err"></span></label>' +
      '<label class="field"><span>Получение</span><select name="delivery"><option value="Самовывоз">Самовывоз</option><option value="Доставка (по договорённости)">Доставка (по договорённости)</option></select></label>' +
      '<label class="field"><span>Комментарий <i>(необязательно)</i></span><textarea name="comment" maxlength="1000"></textarea></label>' +
      '<div class="hp" aria-hidden="true"><label>Не заполняйте это поле <input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<button class="btn btn--block" type="submit" id="of-btn">Оформить заказ</button><div class="form-msg" role="status"></div></form></div>' +
      '<div id="dr-result" hidden></div></div></aside>');
    drawer = $("dr"); backdrop = $("bk");
    $("dr-demo").hidden = !(CFG.mode !== "live" || !CFG.api);
    backdrop.addEventListener("click", function () { close(); });
    $("of").addEventListener("submit", submit);
    $("of").addEventListener("change", function (e) {
      if (e.target.name === "buyer") { var org = e.target.value === "org"; $("f-org").hidden = !org; if (org) $("f-org").querySelector("input").focus(); }
    });
    drawer.addEventListener("keydown", trap);
    badge();
  }

  /* ---------- список товаров ---------- */
  function renderList() {
    var my = ++token, ids = Object.keys(C), list = $("dr-list");
    Shop.byIds(ids).then(function (ps) {
      if (my !== token) return;
      if (!ids.length) {
        list.innerHTML = '<div class="dr-empty"><span class="big" aria-hidden="true">🛒</span><b>Корзина пуста</b><p>Добавьте товары из каталога.</p><a class="btn btn--ghost" href="' + LP.url.catalog() + '">Перейти в каталог</a></div>';
        $("dr-checkout").hidden = true; return;
      }
      var sum = 0;
      var rows = ids.map(function (id, i) {
        var p = ps[i]; if (!p) return "";
        var q = C[id], line = p.price * q; sum += line;
        var pic = p.img ? '<img src="' + E(p.img) + '" alt="" width="56" height="56">' : '<span aria-hidden="true">' + E(p.icon || "📦") + '</span>';
        return '<div class="ci"><div class="ci-pic">' + pic + '</div><div><a class="ci-name" href="' + LP.url.product(p.id) + '">' + E(p.name) + '</a>' +
          '<div class="muted" style="font-size:13px">' + fmt(p.price) + ' за шт.</div>' +
          '<div class="ci-meta"><div class="qty" role="group" aria-label="Количество: ' + E(p.name) + '"><button type="button" data-a="dec" data-id="' + E(id) + '" aria-label="Уменьшить количество">−</button><b aria-live="polite">' + q + '</b><button type="button" data-a="inc" data-id="' + E(id) + '" aria-label="Увеличить количество"' + (q >= p.stock ? " disabled" : "") + '>+</button></div>' +
          '<span class="ci-sum">' + fmt(line) + '</span></div><button type="button" class="ci-rm" data-a="del" data-id="' + E(id) + '" aria-label="Удалить из корзины: ' + E(p.name) + '">Удалить</button></div></div>';
      }).join("");
      list.innerHTML = rows + '<div class="dr-total"><span>Итого</span><b id="ct">' + fmt(sum) + '</b></div><button type="button" class="linkbtn dr-clear" data-a="clear">Очистить корзину</button>';
      $("dr-checkout").hidden = false;
    });
  }

  /* ---------- открытие и закрытие ---------- */
  var shell = function () { return LP.$$(".site-header, main, .site-footer, .skip"); };
  function open() {
    if (isOpen()) return;
    lastFocus = document.activeElement; $("dr-result").hidden = true; $("dr-list").hidden = false;
    renderList(); drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); backdrop.classList.add("on");
    document.body.classList.add("lock"); shell().forEach(function (el) { el.setAttribute("inert", ""); });
    LP.menu && LP.menu(false);
    focusClose(6);
  }
  function focusClose(tries) {   // фокус в корзину: сначала пересчёт стилей, при неудаче — повтор
    var c = drawer.querySelector('[data-a="cart-close"]'); if (!c) return;
    void drawer.offsetWidth; c.focus();
    if (document.activeElement !== c && tries > 0 && isOpen()) setTimeout(function () { focusClose(tries - 1); }, 40);
  }
  function close() {
    if (!isOpen()) return;
    drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); backdrop.classList.remove("on");
    document.body.classList.remove("lock"); shell().forEach(function (el) { el.removeAttribute("inert"); });
    (lastFocus && document.contains(lastFocus) ? lastFocus : $("cb")).focus();
  }
  function trap(e) {
    if (e.key !== "Tab") return;
    var f = LP.$$('a[href],button:not(:disabled),input:not(:disabled):not([tabindex="-1"]),select,textarea', drawer).filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) close(); });

  /* ---------- действия ---------- */
  LP.actions["cart-open"] = open; LP.actions["cart-close"] = close;
  LP.actions.add = function (el) { api.add(el.getAttribute("data-id"), 1, el); };
  LP.actions.inc = function (el) {
    var id = el.getAttribute("data-id"), p = Shop.peek(id); if (!p) return;
    if ((C[id] || 0) >= p.stock) return LP.toast("В наличии только " + p.stock + " шт.");
    C[id] = (C[id] || 0) + 1; save();
  };
  LP.actions.dec = function (el) { var id = el.getAttribute("data-id"); C[id] = (C[id] || 0) - 1; if (C[id] <= 0) delete C[id]; save(); };
  LP.actions.del = function (el) { delete C[el.getAttribute("data-id")]; save(); LP.toast("Товар удалён из корзины"); };
  LP.actions.clear = function () { C = {}; save(); };
  LP.actions["back-to-cart"] = function () { $("dr-result").hidden = true; $("dr-list").hidden = false; renderList(); };
  LP.actions["copy-order"] = function () { copyText(orderText(), "Список заказа скопирован"); };

  function orderText() {
    var lines = ["Заказ с сайта «" + LP.S.name + "»"], sum = 0;
    Object.keys(C).forEach(function (id, i) { var p = Shop.peek(id); if (!p) return; var l = p.price * C[id]; sum += l; lines.push((i + 1) + ". " + p.name + " (арт. " + p.sku + ") — " + C[id] + " × " + fmt(p.price) + " = " + fmt(l)); });
    lines.push("Итого: " + fmt(sum)); return lines.join("\n");
  }
  function copyText(t, okMsg) {
    function fallback() { var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} ta.remove(); LP.toast(ok ? okMsg : "Не удалось скопировать. Выделите текст вручную."); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { LP.toast(okMsg); }, fallback); else fallback();
  }
  LP.copyText = copyText;

  /* ---------- отправка заказа ---------- */
  function showResult(html) { $("dr-list").hidden = true; $("dr-checkout").hidden = true; var r = $("dr-result"); r.innerHTML = html; r.hidden = false; $("dr-body").scrollTop = 0; var h = r.querySelector("h3"); if (h) { h.tabIndex = -1; h.focus(); } }
  function submit(ev) {
    ev.preventDefault(); if (busy || !count()) return;
    var form = ev.target, btn = $("of-btn");
    if (!LP.checkForm(form)) { drawer.classList.remove("shake"); void drawer.offsetWidth; drawer.classList.add("shake"); return; }
    busy = true; btn.disabled = true; btn.textContent = "Отправляем…"; LP.formMsg(form, "", "");
    var d = new FormData(form), live = CFG.mode === "live" && !!CFG.api;
    var payload = {
      buyer_type: d.get("buyer"), org: d.get("buyer") === "org" ? (d.get("org") || "").trim() : "", name: (d.get("name") || "").trim(), phone: (d.get("phone") || "").trim(),
      email: (d.get("email") || "").trim(), delivery: d.get("delivery"), comment: (d.get("comment") || "").trim(), website: d.get("website") || "",
      items: Object.keys(C).map(function (id) { return { id: isNaN(+id) ? id : +id, qty: C[id] }; })   // цену браузер НЕ отправляет
    };
    if (!live) { payload.total = total(); payload.items_text = Object.keys(C).map(function (id) { var p = Shop.peek(id); return [p ? p.name : id, C[id]]; }); }
    form.dataset.key = form.dataset.key || LP.uuid();          // один и тот же ключ при повторной отправке — сервер не создаст дубль
    Shop.submit("order", payload, form.dataset.key).then(function (res) {
      delete form.dataset.key;
      if (res.demo) {
        showResult('<div class="dr-note"><h3 class="dr-sub" style="margin-top:8px">Заказ магазину не отправлен</h3>' +
          '<div class="form-msg warn">Серверная часть сайта ещё не подключена, поэтому заказ сохранён только в этом браузере, а магазин его не получил. Чтобы оформить заказ, позвоните или отправьте список товаров магазину сами. Корзина сохранена.</div>' +
          '<div class="actions"><a class="btn" href="tel:' + LP.S.ph.replace(/[^\d+]/g, "") + '">' + I.phone + 'Позвонить ' + E(LP.S.ph) + '</a><button type="button" class="btn btn--ghost" data-a="copy-order">' + I.copy + 'Скопировать список заказа</button><button type="button" class="btn btn--quiet" data-a="back-to-cart">Вернуться в корзину</button></div></div>');
      } else {
        C = {}; save(); form.reset(); $("f-org").hidden = true;
        showResult('<div class="dr-note"><h3 class="dr-sub" style="margin-top:8px">Заказ №' + E(res.number) + ' принят</h3><div class="form-msg ok">Заказ сохранён на сервере магазина.</div><div class="actions"><button type="button" class="btn btn--ghost" data-a="cart-close">Продолжить покупки</button></div></div>');
      }
    }).catch(function (err) {
      var body = err && err.body, fields = body && body.errors;
      if (err && err.status === 422 && fields) {
        Object.keys(fields).forEach(function (k) { var inp = form.elements[k === "buyer_type" ? "buyer" : k]; if (inp && inp.setAttribute) { var e = inp.closest(".field"); if (e) { var s = e.querySelector(".err"); if (s) { s.textContent = fields[k]; inp.setAttribute("aria-invalid", "true"); } } } });
        LP.formMsg(form, "bad", "Проверьте выделенные поля.");
      } else if (err && err.status === 409) {
        delete form.dataset.key;
        LP.formMsg(form, "bad", E((body && body.message) || "Наличие или цены изменились. Обновите страницу и проверьте корзину."));
      } else {
        LP.formMsg(form, "bad", "Не удалось отправить заказ — нет ответа от сервера. Данные сохранены в форме: проверьте соединение и нажмите кнопку ещё раз или позвоните: " + E(LP.S.ph) + ".");
      }
    }).then(function () { busy = false; btn.disabled = false; btn.textContent = "Оформить заказ"; });
  }

  /* ---------- запуск ---------- */
  function init() {
    C = readStore(); build(); sanitize();
    window.addEventListener("storage", function (e) { if (e.key === "cart" || e.key === null) { C = readStore(); sanitize().then(changed); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
