/* Каталог (временное хранилище до появления серверной базы данных).
   Содержит те же 4 демонстрационные карточки, что и прежняя версия сайта, — они помечены demo:true.
   Когда будет подключён API (config.js → api), этот файл больше не используется. */
window.SHOP_DATA = {
  categories: [
    { slug: "zondy",              name: "Логопедические зонды",    icon: "🥄" },
    { slug: "massazh",            name: "Логопедический массаж",   icon: "🤲" },
    { slug: "postanovka-zvukov",  name: "Постановка звуков",       icon: "🗣️" },
    { slug: "razvitie-rechi",     name: "Развитие речи",           icon: "💬" },
    { slug: "motorika",           name: "Развитие моторики",       icon: "✋" },
    { slug: "fonematika",         name: "Фонематический слух",     icon: "👂" },
    { slug: "rechevoe-dyhanie",   name: "Речевое дыхание",         icon: "🎈" },
    { slug: "logoritmika",        name: "Логоритмика",             icon: "🎵" },
    { slug: "didaktika",          name: "Дидактические материалы", icon: "🗂️" },
    { slug: "igry",               name: "Развивающие игры",        icon: "🎲" },
    { slug: "igrushki",           name: "Игрушки",                 icon: "🧸" },
    { slug: "dlya-sadov",         name: "Товары для детских садов",icon: "🏫" }
  ],
  products: [
    { id: 1, name: "Набор логопедических зондов (демо)", sku: "DEMO-001", cat: "zondy",            price: 1000, stock: 5,  desc: "Демо-карточка.", icon: "🥄", demo: true },
    { id: 2, name: "Карточки для постановки звуков (демо)", sku: "DEMO-002", cat: "postanovka-zvukov", price: 500,  stock: 12, desc: "Демо-карточка.", icon: "🗂️", demo: true },
    { id: 3, name: "Игра на речевое дыхание (демо)",    sku: "DEMO-003", cat: "rechevoe-dyhanie", price: 300,  stock: 0,  desc: "Демо-карточка, нет в наличии.", icon: "🎈", demo: true },
    { id: 4, name: "Набор для мелкой моторики (демо)",  sku: "DEMO-004", cat: "motorika",         price: 700,  stock: 8,  desc: "Демо-карточка.", icon: "🧩", demo: true }
  ]
};
