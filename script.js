/***********************
 * TEXT NORMALIZATION
 ***********************/
function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i");
}

/***********************
 * STORAGE
 ***********************/
const STORAGE_KEY = "products";
const USERS_KEY = "dukkan_users";
const CURRENT_USER_KEY = "dukkan_current_user";
let products = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let selectedProductId = null;

// Migrate old products (add id if missing)
function migrateProducts() {
    let changed = false;
    products = products.map(p => {
        if (!p.id) {
            p.id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
            changed = true;
        }
        return p;
    });
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}
migrateProducts();

function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

/***********************
 * RENDER
 ***********************/
function renderProducts(list) {
    const container = document.getElementById("productsList");
    container.innerHTML = "";

    if (!list || list.length === 0) {
        container.innerHTML = "<p>Ürün yok</p>";
        updateStats();
        return;
    }

    list.forEach((p) => {
        const div = document.createElement("div");
        div.className = "product" + (selectedProductId === p.id ? " selected" : "");
        div.dataset.id = p.id;
        div.innerHTML = `
            <strong>${p.name}</strong><br>
            Kategori: ${p.category}<br>
            Miktar: ${p.quantity}<br>
            Fiyat: ₺${p.price}<br><br>
            <button class="btn btn-danger" data-id="${p.id}">❌ Sil</button>
        `;
        // select on click (but avoid clicks on the delete button)
        div.addEventListener('click', (ev) => {
            if (ev.target && ev.target.tagName.toLowerCase() === 'button') return;
            selectProduct(p.id);
        });
        // delete button handler
        div.querySelector('button').addEventListener('click', (ev) => {
            ev.stopPropagation();
            deleteProductById(p.id);
        });
        container.appendChild(div);
    });

    updateStats();
}

/***********************
 * STATS
 ***********************/
function updateStats() {
    const totalProductsEl = document.getElementById('totalProducts');
    const totalStockEl = document.getElementById('totalStock');
    const totalValueEl = document.getElementById('totalValue');

    if (totalProductsEl) totalProductsEl.textContent = products.length;
    const totalStock = products.reduce((s, p) => s + Number(p.quantity || 0), 0);
    if (totalStockEl) totalStockEl.textContent = totalStock;
    const totalValue = products.reduce((s, p) => s + (Number(p.quantity || 0) * Number(p.price || 0)), 0);
    if (totalValueEl) totalValueEl.textContent = '₺' + totalValue.toFixed(2);
}

/***********************
 * SELECTION
 ***********************/
function selectProduct(id) {
    if (selectedProductId === id) {
        selectedProductId = null;
    } else {
        selectedProductId = id;
    }
    // re-render current filtered view (respect search/filter inputs)
    filterProducts();
}

/***********************
 * ADD PRODUCT
 ***********************/
const productForm = document.getElementById("productForm");
if (productForm) {
    productForm.addEventListener("submit", e => {
        e.preventDefault();

        const product = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
            name: document.getElementById("productName").value.trim(),
            category: document.getElementById("productCategory").value,
            quantity: Number(document.getElementById("productQuantity").value) || 0,
            price: Number(document.getElementById("productPrice").value) || 0
        };

        products.push(product);
        saveProducts();
        renderProducts(products);
        e.target.reset();
    });
}

/***********************
 * DELETE / DELETE BY ID
 ***********************/
function deleteProductById(id) {
    if (!confirm("Bu ürünü silmek istiyor musun?")) return;
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return;
    products.splice(idx, 1);
    if (selectedProductId === id) selectedProductId = null;
    saveProducts();
    filterProducts();
}

/***********************
 * DELETE ALL
 ***********************/
const deleteAllBtn = document.getElementById("deleteAllBtn");
if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", () => {
        if (!confirm("TÜM ürünler silinsin mi?")) return;
        products = [];
        selectedProductId = null;
        localStorage.removeItem(STORAGE_KEY);
        renderProducts(products);
    });
}

/***********************
 * CLEAR removed per request
 ***********************/

/***********************
 * SEARCH + FILTER
 ***********************/
function filterProducts() {
    const si = document.getElementById("searchInput");
    const fc = document.getElementById("filterCategory");
    const search = si ? normalizeText(si.value) : "";
    const cat = fc ? fc.value : "";

    const filtered = products.filter(p => {
        const name = normalizeText(p.name);
        return name.includes(search) && (cat === "" || p.category === cat);
    });

    renderProducts(filtered);
}

const searchInputEl = document.getElementById("searchInput");
if (searchInputEl) searchInputEl.addEventListener("input", filterProducts);
const filterCategoryEl = document.getElementById("filterCategory");
if (filterCategoryEl) filterCategoryEl.addEventListener("change", filterProducts);

/***********************
 * AUTH (SIGNUP / LOGIN)
 ***********************/
function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}
function saveUsers(u) {
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

// Signup handler (if page has signup form)
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('suUsername').value.trim();
        const password = document.getElementById('suPassword').value;
        const display = document.getElementById('suDisplay').value.trim() || username;
        if (!username || !password) {
            alert('Kullanıcı adı ve şifre gerekli');
            return;
        }
        const users = getUsers();
        if (users.some(u => u.username === username)) {
            alert('Bu kullanıcı adı zaten alınmış');
            return;
        }
        users.push({username, password, display});
        saveUsers(users);
        localStorage.setItem(CURRENT_USER_KEY, username);
        // set default package
        if (!localStorage.getItem('dukkan_package')) {
            localStorage.setItem('dukkan_package', JSON.stringify({name: 'Ücretsiz', limit: 100}));
        }
        window.location.href = 'index.html';
    });
}

// Login handler (if page has login form)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('liUsername').value.trim();
        const password = document.getElementById('liPassword').value;
        const remember = document.getElementById('liRemember') && document.getElementById('liRemember').checked;
        const users = getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            alert('Kullanıcı adı veya şifre yanlış');
            return;
        }
        // set current user (if remember, we keep it; otherwise still store — simple app)
        localStorage.setItem(CURRENT_USER_KEY, username);
        const temp = localStorage.getItem('dukkan_temp_action');
        if (temp === 'buy') {
            localStorage.removeItem('dukkan_temp_action');
            window.location.href = 'subscription.html';
        } else {
            window.location.href = 'index.html';
        }
    });
}

function getCurrentUser() {
    const u = localStorage.getItem(CURRENT_USER_KEY);
    if (!u) return null;
    const users = getUsers();
    return users.find(x => x.username === u) || {username: u, display: u};
}

function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'index.html';
}

function updateAuthUI() {
    const authActions = document.querySelector('.auth-actions');
    if (!authActions) return;
    const user = getCurrentUser();
    if (user) {
        authActions.innerHTML = `
            <span>Hoşgeldiniz, <strong>${user.display || user.username}</strong></span>
            <button id="logoutBtn" class="btn btn-clear">Çıkış</button>
            <a href="subscription.html" class="btn btn-clear">Abonelikler</a>
            <a href="settings.html" class="btn btn-clear">Ayarlar</a>
        `;
        const lb = document.getElementById('logoutBtn');
        if (lb) lb.addEventListener('click', logout);
    }
}

// SETTINGS handler
const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const display = document.getElementById('setDisplay').value.trim();
        const newPass = document.getElementById('setPassword').value;
        const user = getCurrentUser();
        if (!user) {
            alert('Giriş yapmalısınız');
            window.location.href = 'login.html';
            return;
        }
        const users = getUsers();
        const idx = users.findIndex(u => u.username === user.username);
        if (idx === -1) return;
        if (display) users[idx].display = display;
        if (newPass) users[idx].password = newPass;
        saveUsers(users);
        alert('Ayarlar kaydedildi');
        updateAuthUI();
    });
}

// load package info on index header if present
function loadPackageHeader() {
    const pkg = localStorage.getItem('dukkan_package');
    if (!pkg) return;
    try {
        const p = JSON.parse(pkg);
        const el = document.getElementById('currentPackage');
        const rem = document.getElementById('weeklyRemaining');
        if (el) el.textContent = p.name || 'Ücretsiz';
        if (rem) {
            if (p.limit === 'unlimited') rem.textContent = '∞';
            else rem.textContent = p.limit || '100';
        }
    } catch (e) {}
}

/***********************
 * INIT
 ***********************/
updateAuthUI();
loadPackageHeader();
renderProducts(products);
