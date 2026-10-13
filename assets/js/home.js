/* Главная страница: блоки из данных, формы (закупки для организаций, обратная связь, отзыв). */
(function () {
  "use strict";
  var LP = window.LP, Shop = window.Shop, $ = LP.$, E = LP.esc, CFG = LP.cfg, S = LP.S;
  var live = CFG.mode === "live" && !!CFG.api;
  var tel = S.ph.replace(/[^\d+]/g, "");

  /* ---------- блоки ---------- */
  $("adv").innerHTML = [["🗣️", "Для логопедов и дефектологов", "Инструменты и пособия для занятий"], ["👨‍👩‍👧", "Для родителей", "Развитие ребёнка дома"], ["🏫", "Для детских садов", "Закупки для учреждений"], ["🧠", "Развивающие материалы", "Речь, мышление, моторика"]]
    .map(function (x, i) { return '<div class="card rv" style="--i:' + i + '"><div class="ic" aria-hidden="true">' + x[0] + '</div><b>' + x[1] + '</b><p class="muted" style="margin:4px 0 0;font-size:14.5px">' + x[2] + '</p></div>'; }).join("");
  $("cats").innerHTML = Shop.categories.map(function (c, i) {
    return '<a class="cat-tile rv" style="--i:' + (i % 6) + '" href="' + LP.url.catalog({ c: c.slug }) + '"><span class="ic" aria-hidden="true">' + c.icon + '</span><span>' + E(c.name) + '</span></a>';
  }).join("");
  Shop.list({ av: true, ps: 4 }).then(function (r) {
    if (!r.items.length) { $("featured-sec").hidden = true; return; }
    $("featured").innerHTML = r.items.map(LP.card).join("");
  }, function () { $("featured-sec").hidden = true; });
  LP.reveal();

  /* контакты */
  if (S.addr === "Уточняется") { $("route").hidden = true; }
  else { $("route").href = "https://yandex.ru/maps/?text=" + encodeURIComponent(S.city + " " + S.addr); }

  /* отзывы: показываются только прошедшие модерацию (pub === true) */
  Shop.reviews().then(function (R) {
    if (!R.length) return;
    $("rl").innerHTML = R.map(function (r) {
      return '<div class="card review"><b>' + E(r.name || r.n) + '</b> <span class="stars" aria-label="Оценка: ' + (+r.rating || +r.r || 0) + ' из 5">' + "★".repeat(Math.min(5, Math.max(0, +r.rating || +r.r || 0))) + '</span><p style="margin:6px 0 0">' + E(r.text || r.t) + '</p></div>';
    }).join(""); $("rl-empty").hidden = true;
  });

  /* ---------- формы ---------- */
  function bind(id, kind, collect, okText) {
    var form = $(id); if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault(); if (form.dataset.busy || !LP.checkForm(form)) return;
      var btn = form.querySelector('[type="submit"]'), label = btn.textContent;
      form.dataset.busy = "1"; btn.disabled = true; btn.textContent = "Отправляем…"; LP.formMsg(form, "", "");
      form.dataset.key = form.dataset.key || LP.uuid();
      Shop.submit(kind, collect(new FormData(form)), form.dataset.key).then(function (res) {
        delete form.dataset.key; form.reset();
        if (res.demo) LP.formMsg(form, "warn", "Сообщение <b>не отправлено</b> магазину: серверная часть сайта ещё не подключена, запись сохранена только в этом браузере. Свяжитесь с магазином по телефону <a href=\"tel:" + tel + "\">" + E(S.ph) + "</a>.");
        else LP.formMsg(form, "ok", okText);
      }).catch(function (err) {
        if (err && err.status === 422) LP.formMsg(form, "bad", "Проверьте заполнение полей и отправьте ещё раз.");
        else LP.formMsg(form, "bad", "Не удалось отправить — нет ответа от сервера. Введённые данные остались в форме: попробуйте ещё раз или позвоните " + E(S.ph) + ".");
      }).then(function () { delete form.dataset.busy; btn.disabled = false; btn.textContent = label; });
    });
  }
  function v(d, k) { return String(d.get(k) || "").trim(); }
  bind("kf", "kids", function (d) { return { org: v(d, "org"), person: v(d, "person"), phone: v(d, "phone"), email: v(d, "email"), items: v(d, "items"), website: v(d, "website") }; }, "Заявка принята.");
  bind("ff", "contact", function (d) { return { name: v(d, "name"), phone: v(d, "phone"), message: v(d, "message"), website: v(d, "website") }; }, "Сообщение отправлено.");
  bind("rf", "review", function (d) { return { name: v(d, "name"), rating: +v(d, "rating") || 5, text: v(d, "text"), website: v(d, "website") }; }, "Спасибо! Отзыв отправлен на модерацию и появится на сайте после проверки.");

  /* «Узнать о поступлении»: подставляем название товара в сообщение */
  var n = new URLSearchParams(location.search).get("notify");
  if (n && $("ff")) { $("ff").elements.message.value = "Сообщите, пожалуйста, о поступлении товара: " + n.slice(0, 200); }

  /* окно отзыва */
  var rd = $("rd");
  LP.actions["review-open"] = function () { LP.formMsg($("rf"), "", ""); rd.showModal(); };
  LP.actions["dialog-close"] = function () { rd.close(); };
  rd.addEventListener("click", function (e) { if (e.target === rd) rd.close(); });
})();
