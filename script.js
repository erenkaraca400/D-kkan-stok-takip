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

    list.forEach((p, index) => {
        const div = document.createElement("div");
        div.className = "product";
        div.innerHTML = `
            <strong>${p.name}</strong><br>
            Kategori: ${p.category}<br>
            Miktar: ${p.quantity}<br>
            Fiyat: ₺${p.price}<br><br>
            <button onclick="deleteProduct(${index})">❌ Sil</button>
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
 * DELETE ONE
 ***********************/
function deleteProduct(index) {
    if (!confirm("Bu ürünü silmek istiyor musun?")) return;
    products.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    renderProducts(products);
}

/***********************
 * DELETE ALL
 ***********************/
document.getElementById("deleteAllBtn").addEventListener("click", () => {
    if (!confirm("TÜM ürünler silinsin mi?")) return;
    products = [];
    localStorage.removeItem(STORAGE_KEY);
    renderProducts(products);
});

/***********************
 * CLEAR (FORM + SEARCH)
 ***********************/
document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("filterCategory").value = "";
    renderProducts(products);
});

/***********************
 * SEARCH + FILTER
 ***********************/
function filterProducts() {
    const search = normalizeText(document.getElementById("searchInput").value);
    const cat = document.getElementById("filterCategory").value;

    const filtered = products.filter(p => {
        const name = normalizeText(p.name);
        return name.includes(search) && (cat === "" || p.category === cat);
    });

    renderProducts(filtered);
}

document.getElementById("searchInput").addEventListener("input", filterProducts);
document.getElementById("filterCategory").addEventListener("change", filterProducts);

/***********************
 * INIT
 ***********************/
renderProducts(products);
