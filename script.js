/***********************
 * TEXT NORMALIZATION
 ***********************/
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i");
}

/***********************
 * TRANSLATIONS
 ***********************/
const TRANSLATIONS = {
    tr: {
        "header.title": "🏪 Dükkan Mal Takip Sistemi",
        "subtitle": "Envanterinizi Kolayca Yönetin",
        "form.newProduct": "Yeni Ürün",
        "btn.add": "Ürün Ekle"
    },
    en: {
        "header.title": "🏪 Store Inventory System",
        "subtitle": "Manage Your Inventory Easily",
        "form.newProduct": "New Product",
        "btn.add": "Add Product"
    }
};

let currentLang = "tr";

function translatePage() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (TRANSLATIONS[currentLang][key]) {
            el.textContent = TRANSLATIONS[currentLang][key];
        }
    });
}
translatePage();

/***********************
 * STORAGE
 ***********************/
const STORAGE_KEY = "products";
let products = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

/***********************
 * RENDER
 ***********************/
function renderProducts(list) {
    const container = document.getElementById("productsList");
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = "<p>Ürün yok</p>";
        return;
    }

    list.forEach(p => {
        const div = document.createElement("div");
        div.className = "product";
        div.innerHTML = `
            <strong>${p.name}</strong><br>
            Kategori: ${p.category}<br>
            Miktar: ${p.quantity}<br>
            Fiyat: ₺${p.price}
        `;
        container.appendChild(div);
    });
}

/***********************
 * ADD PRODUCT
 ***********************/
document.getElementById("productForm").addEventListener("submit", e => {
    e.preventDefault();

    const product = {
        name: document.getElementById("productName").value.trim(),
        category: document.getElementById("productCategory").value,
        quantity: document.getElementById("productQuantity").value,
        price: document.getElementById("productPrice").value
    };

    products.push(product);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    renderProducts(products);
    e.target.reset();
});

/***********************
 * SEARCH + FILTER
 ***********************/
function filterProducts() {
    const search = normalizeText(document.getElementById("searchInput").value);
    const cat = document.getElementById("filterCategory").value;

    const filtered = products.filter(p => {
        const name = normalizeText(p.name);
        const matchText = name.includes(search);
        const matchCat = cat === "" || p.category === cat;
        return matchText && matchCat;
    });

    renderProducts(filtered);
}

document.getElementById("searchInput").addEventListener("input", filterProducts);
document.getElementById("filterCategory").addEventListener("change", filterProducts);

/***********************
 * INIT
 ***********************/
renderProducts(products);
