// Veri depolama
let products = [];
const STORAGE_KEY = 'dukkan_products';
const PACKAGE_KEY = 'dukkan_package';
const WEEKLY_KEY = 'dukkan_weekly';
const CURRENT_USER_KEY = 'dukkan_current_user';
const USERS_KEY = 'dukkan_users';

let userPackage = null;
let weeklyData = { start: null, count: 0 };

function getWeekStart(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Monday = 0 (Monday-based week start)
    d.setDate(d.getDate() - day);
    d.setHours(0,0,0,0);
    return d.toISOString().split('T')[0];
}

// User helpers
function getCurrentUser() {
    return localStorage.getItem(CURRENT_USER_KEY);
}

function setCurrentUser(username) {
    if (username) localStorage.setItem(CURRENT_USER_KEY, username);
    else localStorage.removeItem(CURRENT_USER_KEY);
}

function usersList() {
    const s = localStorage.getItem(USERS_KEY);
    return s ? JSON.parse(s) : [];
}

function saveUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

// Password hashing (SHA-256) helper
async function hashPassword(password) {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Session check (remember-me)
function checkSession() {
    const s = localStorage.getItem('dukkan_session');
    if (!s) return;
    try {
        const obj = JSON.parse(s);
        if (obj && obj.user && obj.expires && Date.now() < obj.expires) {
            setCurrentUser(obj.user);
        } else {
            localStorage.removeItem('dukkan_session');
        }
    } catch (e) {
        localStorage.removeItem('dukkan_session');
    }
}

function productsKeyFor(user) {
    return STORAGE_KEY + (user ? '_' + user : '');
}

function packageKeyFor(user) {
    return PACKAGE_KEY + (user ? '_' + user : '');
}

function weeklyKeyFor(user) {
    return WEEKLY_KEY + (user ? '_' + user : '');
}

// Package load/save per user
function loadPackage() {
    const user = getCurrentUser();
    const key = packageKeyFor(user);
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            userPackage = JSON.parse(saved);
        } catch (e) {
            userPackage = { name: 'Ücretsiz', limit: 100 };
        }
    } else {
        userPackage = { name: 'Ücretsiz', limit: 100 };
    }
}

function savePackage() {
    const user = getCurrentUser();
    const key = packageKeyFor(user);
    localStorage.setItem(key, JSON.stringify(userPackage));
}

// Weekly load/save per user
function loadWeekly() {
    const user = getCurrentUser();
    const key = weeklyKeyFor(user);
    const saved = localStorage.getItem(key);
    const currentStart = getWeekStart(new Date());
    if (saved) {
        try {
            weeklyData = JSON.parse(saved);
            if (weeklyData.start !== currentStart) {
                weeklyData = { start: currentStart, count: 0 };
                saveWeekly();
            }
        } catch (e) {
            weeklyData = { start: currentStart, count: 0 };
            saveWeekly();
        }
    } else {
        weeklyData = { start: currentStart, count: 0 };
        saveWeekly();
    }
}

function saveWeekly() {
    const user = getCurrentUser();
    const key = weeklyKeyFor(user);
    localStorage.setItem(key, JSON.stringify(weeklyData));
}
function getPackageLimit() {
    if (!userPackage) return 100;
    if (userPackage.limit === 'unlimited' || userPackage.limit === Infinity) return Infinity;
    return userPackage.limit;
}

function updateSubscriptionUI() {
    const pkgEl = document.getElementById('currentPackage');
    const remEl = document.getElementById('weeklyRemaining');
    if (pkgEl) pkgEl.textContent = userPackage ? userPackage.name : 'Ücretsiz';
    const limit = getPackageLimit();
    if (remEl) {
        if (limit === Infinity) remEl.textContent = 'Sınırsız';
        else remEl.textContent = Math.max(0, limit - (weeklyData.count || 0));
    }

    // refresh translated subscription info if present
    const subInfo = document.getElementById('subscriptionInfo');
    if (subInfo) {
        const t = translate('subscription.info');
        if (t) {
            const html = t.replace('{{package}}', pkgEl ? pkgEl.textContent : '').replace('{{remaining}}', remEl ? remEl.textContent : '');
            subInfo.innerHTML = html;
        }
    }

    // update other translated labels
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const t = translate(key);
        if (t) el.innerHTML = t.replace('{{package}}', pkgEl ? pkgEl.textContent : '').replace('{{remaining}}', remEl ? remEl.textContent : '');
    });

    // placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const t = translate(key);
        if (t) el.placeholder = t;
    });
}

// DOM Elementleri
const productForm = document.getElementById('productForm');
const productName = document.getElementById('productName');
const productCategory = document.getElementById('productCategory');
const productQuantity = document.getElementById('productQuantity');
const productPrice = document.getElementById('productPrice');
const productDescription = document.getElementById('productDescription');
const productsList = document.getElementById('productsList');
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const clearBtn = document.getElementById('clearBtn');

// İstatistik Elementleri
const totalProductsEl = document.getElementById('totalProducts');
const totalStockEl = document.getElementById('totalStock');
const totalValueEl = document.getElementById('totalValue');

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function () {
    // Auto-login if a valid session exists
    checkSession();

    // set language from storage or browser
    const savedLang = localStorage.getItem('dukkan_lang');
    const browserLang = (navigator.language || navigator.userLanguage || 'tr').slice(0,2);
    const initialLang = savedLang || (TRANSLATIONS[browserLang] ? browserLang : 'tr');
    localStorage.setItem('dukkan_lang', initialLang);

    loadProducts();
    loadPackage();
    loadWeekly();
    renderProducts();
    updateStats();
    updateSubscriptionUI();
    translatePage();
    updateAuthUI();

    // populate language selector
    const sel = document.getElementById('langSelect');
    if (sel) {
        sel.value = localStorage.getItem('dukkan_lang') || initialLang;
        sel.addEventListener('change', function() {
            localStorage.setItem('dukkan_lang', sel.value);
            translatePage();
            updateSubscriptionUI();
        });
    }

    // Event Listeners
    productForm.addEventListener('submit', addProduct);
    searchInput.addEventListener('input', filterProducts);
    filterCategory.addEventListener('change', filterProducts);
    clearBtn.addEventListener('click', clearFilters);

    // Hepsini sil butonu
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAllProducts);

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', function () {
        setCurrentUser(null);
        // remove persistent session
        localStorage.removeItem('dukkan_session');
        // reload per-user state (back to guest)
        loadProducts();
        loadPackage();
        loadWeekly();
        renderProducts();
        updateStats();
        updateSubscriptionUI();
        updateAuthUI();
        showSuccess('Oturum kapatıldı.');
    });
});

function deleteAllProducts() {
    if (!isLoggedIn()) return showLoginPrompt('Tüm ürünleri silmek için lütfen giriş yapın veya kayıt olun.');
    if (!products.length) return showAlert('Silinecek ürün yok.');
    const confirmed = confirm('Tüm ürünleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmed) return;
    products = [];
    saveProducts();
    renderProducts();
    updateStats();
    showSuccess('Tüm ürünler başarıyla silindi.');
}



// Ürün Ekleme
function addProduct(e) {
    e.preventDefault();

    if (!isLoggedIn()) return showLoginPrompt('Ürün eklemek için giriş yapmalısınız.');

    if (!productName.value || !productCategory.value || !productQuantity.value || !productPrice.value) {
        showAlert('Lütfen tüm zorunlu alanları doldurun!');
        return;
    }

    const limit = getPackageLimit();
    if (limit !== Infinity && weeklyData.count >= limit) {
        showSubscriptionPrompt('Haftalık ürün ekleme limitinizi aştınız. Lütfen <a href="subscription.html">abonelik satın alın</a> veya mevcut paketi yükseltin.');
        return;
    }

    const newProduct = {
        id: Date.now(),
        name: productName.value.trim(),
        category: productCategory.value,
        quantity: parseInt(productQuantity.value),
        price: parseFloat(productPrice.value),
        description: productDescription.value.trim(),
        dateAdded: new Date().toLocaleDateString('tr-TR')
    };

    products.push(newProduct);
    saveProducts();

    // Update weekly count
    weeklyData.count = (weeklyData.count || 0) + 1;
    saveWeekly();

    renderProducts();
    updateStats();
    updateSubscriptionUI();

    // Formu temizle
    productForm.reset();
    productName.focus();

    showSuccess('Ürün başarıyla eklendi! ✓');
}

// Ürünleri Render Et
function renderProducts() {
    if (products.length === 0) {
        productsList.innerHTML = `<p class="empty-message">${translate('empty.message')}</p>`;
        return;
    }

    productsList.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-header">
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <span class="product-category">${product.category}</span>
            </div>
            
            ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ''}
            
            <div class="product-details">
                <div class="detail-item">
                    <span class="detail-label">Miktar</span>
                    <span class="detail-value quantity">${product.quantity} adet</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fiyat</span>
                    <span class="detail-value price">₺${product.price.toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Toplam</span>
                    <span class="detail-value" style="color: #FF6B35;">₺${(product.quantity * product.price).toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Eklenme</span>
                    <span class="detail-value" style="font-size: 0.9rem; color: #999;">${product.dateAdded}</span>
                </div>
            </div>
            
            ${isLoggedIn() ? `
            <div class="product-actions">
                <button class="btn btn-decrease" onclick="changeQuantity(${product.id}, -1)">➖ Azalt</button>
                <button class="btn btn-increase" onclick="changeQuantity(${product.id}, 1)">➕ Arttır</button>
                <button class="btn btn-edit" onclick="editProduct(${product.id})">✏️ Düzenle</button>
                <button class="btn btn-delete" onclick="deleteProduct(${product.id})">🗑️ Sil</button>
            </div>` : `
            <div class="product-actions">
                <a class="btn btn-clear" href="login.html">Giriş Yap</a>
                <a class="btn btn-add" href="signup.html">Katıl</a>
            </div>`}
        </div>
    `).join('');
}

// Miktar Değiştir
function changeQuantity(productId, change) {
    if (!isLoggedIn()) return showLoginPrompt('Miktarı değiştirmek için giriş yapın.');
    const product = products.find(p => p.id === productId);
    if (product) {
        product.quantity += change;
        if (product.quantity < 0) product.quantity = 0;
        saveProducts();
        renderProducts();
        updateStats();
    }
}

// Ürün Sil
function deleteProduct(productId) {
    if (!isLoggedIn()) return showLoginPrompt('Ürünü silmek için giriş yapın.');
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        products = products.filter(p => p.id !== productId);
        saveProducts();
        renderProducts();
        updateStats();
        showSuccess('Ürün silindi ✓');
    }
}

// Ürün Düzenle
function editProduct(productId) {
    if (!isLoggedIn()) return showLoginPrompt('Ürünü düzenlemek için giriş yapın.');
    const product = products.find(p => p.id === productId);
    if (product) {
        productName.value = product.name;
        productCategory.value = product.category;
        productQuantity.value = product.quantity;
        productPrice.value = product.price;
        productDescription.value = product.description;

        deleteProduct(productId);
        productName.focus();
    }
}

// Ürünleri Filtrele
function filterProducts() {
    const searchTerm = (searchInput.value || '').toLowerCase();
    const selectedCategory = filterCategory.value;

    const filtered = products.filter(product => {
        const matchSearch = product.name.toLowerCase().includes(searchTerm) ||
            (product.description || '').toLowerCase().includes(searchTerm);
        const matchCategory = selectedCategory === '' || product.category === selectedCategory;
        return matchSearch && matchCategory;
    });

    if (filtered.length === 0) {
        productsList.innerHTML = '<p class="empty-message">Arama sonucunda ürün bulunamadı.</p>';
        return;
    }

    productsList.innerHTML = filtered.map(product => `
        <div class="product-card">
            <div class="product-header">
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <span class="product-category">${product.category}</span>
            </div>
            
            ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ''}
            
            <div class="product-details">
                <div class="detail-item">
                    <span class="detail-label">Miktar</span>
                    <span class="detail-value quantity">${product.quantity} adet</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fiyat</span>
                    <span class="detail-value price">₺${product.price.toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Toplam</span>
                    <span class="detail-value" style="color: #FF6B35;">₺${(product.quantity * product.price).toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Eklenme</span>
                    <span class="detail-value" style="font-size: 0.9rem; color: #999;">${product.dateAdded}</span>
                </div>
            </div>
            
            ${isLoggedIn() ? `
            <div class="product-actions">
                <button class="btn btn-decrease" onclick="changeQuantity(${product.id}, -1)">➖ Azalt</button>
                <button class="btn btn-increase" onclick="changeQuantity(${product.id}, 1)">➕ Arttır</button>
                <button class="btn btn-edit" onclick="editProduct(${product.id})">✏️ Düzenle</button>
                <button class="btn btn-delete" onclick="deleteProduct(${product.id})">🗑️ Sil</button>
            </div>` : `
            <div class="product-actions">
                <a class="btn btn-clear" href="login.html">Giriş Yap</a>
                <a class="btn btn-add" href="signup.html">Katıl</a>
            </div>`}
        </div>
    `).join('');
}

// Filtreleri Temizle
function clearFilters() {
    searchInput.value = '';
    filterCategory.value = '';
    renderProducts();
}

// İstatistikleri Güncelle
function updateStats() {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

    totalProductsEl.textContent = totalProducts;
    totalStockEl.textContent = totalStock;
    totalValueEl.textContent = '₺' + totalValue.toFixed(2);
}

// LocalStorage İşlemleri
function saveProducts() {
    const user = getCurrentUser();
    const key = productsKeyFor(user);
    localStorage.setItem(key, JSON.stringify(products));
}

function loadProducts() {
    const user = getCurrentUser();
    const key = productsKeyFor(user);
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            products = JSON.parse(saved);
        } catch (e) {
            products = [];
        }
    } else {
        products = [];
    }
}

// Translation helper and messages
const TRANSLATIONS = {
    tr: {
        'header.title': '🏪 Dükkan Mal Takip Sistemi',
        'subtitle': 'Envanterinizi Kolayca Yönetin',
        'form.newProduct': 'Yeni Ürün Ekle',
        'label.productName': 'Ürün Adı:',
        'placeholder.productName': 'Ürün adını girin',
        'label.category': 'Kategori:',
        'label.quantity': 'Miktar:',
        'placeholder.quantity': '0',
        'label.price': 'Fiyat (₺):',
        'placeholder.price': '0.00',
        'label.description': 'Açıklama:',
        'placeholder.description': 'Ürün açıklaması (opsiyonel)',
        'btn.add': '➕ Ürün Ekle',
        'btn.clear': '🗑️ Temizle',
        'btn.deleteAll': '🧹 Hepsini Sil',
        'products.title': 'Ürünler',
        'search.placeholder': 'Ürün ara...',
        'stats.totalProducts': 'Toplam Ürün',
        'stats.totalStock': 'Toplam Stok',
        'stats.totalValue': 'Toplam Değer',
        'subscription.info': 'Abonelik: <strong id="currentPackage">{{package}}</strong> | Haftalık Kalan: <strong id="weeklyRemaining">{{remaining}}</strong>',
        'nav.login': 'Giriş Yap',
        'nav.signup': 'Katıl',
        'nav.logout': 'Çıkış',
        'nav.subs': 'Abonelikler',
        'empty.message': 'Henüz ürün eklenmemiş. İlk ürünü ekleyerek başlayın!',
        'loginPrompt': 'Lütfen giriş yapın veya kayıt olun.',
        'needLoginAdd': 'Ürün eklemek için giriş yapmalısınız.',
        'subscriptionExpired': 'Aboneliğiniz bitti. Ürün eklemek için aboneliğinizi yenileyin.',
        'productAddedMessage': 'Ürün başarıyla eklendi! ✓'
    },
    en: {
        'header.title': '🏪 Store Inventory Manager',
        'subtitle': 'Manage your inventory easily',
        'form.newProduct': 'Add New Product',
        'label.productName': 'Product Name:',
        'placeholder.productName': 'Enter product name',
        'label.category': 'Category:',
        'label.quantity': 'Quantity:',
        'placeholder.quantity': '0',
        'label.price': 'Price (₺):',
        'placeholder.price': '0.00',
        'label.description': 'Description:',
        'placeholder.description': 'Product description (optional)',
        'btn.add': '➕ Add Product',
        'btn.clear': '🗑️ Clear',
        'btn.deleteAll': '🧹 Delete All',
        'products.title': 'Products',
        'search.placeholder': 'Search products...',
        'stats.totalProducts': 'Total Products',
        'stats.totalStock': 'Total Stock',
        'stats.totalValue': 'Total Value',
        'subscription.info': 'Subscription: <strong id="currentPackage">{{package}}</strong> | Weekly Remaining: <strong id="weeklyRemaining">{{remaining}}</strong>',
        'nav.login': 'Log in',
        'nav.signup': 'Sign up',
        'nav.logout': 'Logout',
        'nav.subs': 'Subscriptions',
        'empty.message': 'No products yet. Start by adding your first product!',
        'loginPrompt': 'Please log in or sign up.',
        'needLoginAdd': 'You must be logged in to add products.',
        'subscriptionExpired': 'Your subscription expired. Please renew to add more products.',
        'productAddedMessage': 'Product added successfully! ✓'
    },
    es: {
        'header.title': '🏪 Sistema de Inventario',
        'subtitle': 'Administra tu inventario fácilmente',
        'form.newProduct': 'Agregar Producto',
        'label.productName': 'Nombre del producto:',
        'placeholder.productName': 'Ingrese el nombre del producto',
        'label.category': 'Categoría:',
        'label.quantity': 'Cantidad:',
        'placeholder.quantity': '0',
        'label.price': 'Precio (₺):',
        'placeholder.price': '0.00',
        'label.description': 'Descripción:',
        'placeholder.description': 'Descripción del producto (opcional)',
        'btn.add': '➕ Agregar',
        'btn.clear': '🗑️ Limpiar',
        'btn.deleteAll': '🧹 Eliminar todo',
        'products.title': 'Productos',
        'search.placeholder': 'Buscar productos...',
        'stats.totalProducts': 'Total Productos',
        'stats.totalStock': 'Stock Total',
        'stats.totalValue': 'Valor Total',
        'subscription.info': 'Suscripción: <strong id="currentPackage">{{package}}</strong> | Restante semanal: <strong id="weeklyRemaining">{{remaining}}</strong>',
        'nav.login': 'Iniciar sesión',
        'nav.signup': 'Registrarse',
        'nav.logout': 'Salir',
        'nav.subs': 'Suscripciones',
        'empty.message': 'Aún no hay productos. ¡Agrega el primero!',
        'loginPrompt': 'Por favor, inicia sesión o regístrate.',
        'needLoginAdd': 'Debes iniciar sesión para agregar productos.',
        'subscriptionExpired': 'Tu suscripción ha expirado. Por favor renueva para añadir más.',
        'productAddedMessage': 'Producto agregado con éxito! ✓'
    },
    fr: {
        'header.title': '🏪 Gestionnaire de Stock',
        'subtitle': 'Gérez votre inventaire facilement',
        'form.newProduct': 'Ajouter un produit',
        'label.productName': 'Nom du produit:',
        'placeholder.productName': 'Entrez le nom du produit',
        'label.category': 'Catégorie:',
        'label.quantity': 'Quantité:',
        'placeholder.quantity': '0',
        'label.price': 'Prix (₺):',
        'placeholder.price': '0.00',
        'label.description': 'Description:',
        'placeholder.description': 'Description du produit (optionnel)',
        'btn.add': '➕ Ajouter',
        'btn.clear': '🗑️ Effacer',
        'btn.deleteAll': '🧹 Tout supprimer',
        'products.title': 'Produits',
        'search.placeholder': 'Rechercher des produits...',
        'stats.totalProducts': 'Total Produits',
        'stats.totalStock': 'Stock Total',
        'stats.totalValue': 'Valeur Totale',
        'subscription.info': 'Abonnement: <strong id="currentPackage">{{package}}</strong> | Restant hebdomadaire: <strong id="weeklyRemaining">{{remaining}}</strong>',
        'nav.login': 'Connexion',
        'nav.signup': 'S’inscrire',
        'nav.logout': 'Déconnexion',
        'nav.subs': 'Abonnements',
        'empty.message': 'Aucun produit pour le moment. Ajoutez-en un!',
        'loginPrompt': 'Veuillez vous connecter ou vous inscrire.',
        'needLoginAdd': 'Vous devez être connecté pour ajouter des produits.',
        'subscriptionExpired': 'Votre abonnement est terminé. Veuillez renouveler.',
        'productAddedMessage': 'Produit ajouté avec succès! ✓'
    },
    de: {
        'header.title': '🏪 Lagerverwaltung',
        'subtitle': 'Verwalten Sie Ihr Inventar einfach',
        'form.newProduct': 'Neues Produkt',
        'label.productName': 'Produktname:',
        'placeholder.productName': 'Produktname eingeben',
        'label.category': 'Kategorie:',
        'label.quantity': 'Menge:',
        'placeholder.quantity': '0',
        'label.price': 'Preis (₺):',
        'placeholder.price': '0.00',
        'label.description': 'Beschreibung:',
        'placeholder.description': 'Produktbeschreibung (optional)',
        'btn.add': '➕ Hinzufügen',
        'btn.clear': '🗑️ Leeren',
        'btn.deleteAll': '🧹 Alles löschen',
        'products.title': 'Produkte',
        'search.placeholder': 'Produkte suchen...',
        'stats.totalProducts': 'Gesamtprodukte',
        'stats.totalStock': 'Gesamtbestand',
        'stats.totalValue': 'Gesamtwert',
        'subscription.info': 'Abo: <strong id="currentPackage">{{package}}</strong> | Wöchentlich verbleibend: <strong id="weeklyRemaining">{{remaining}}</strong>',
        'nav.login': 'Anmelden',
        'nav.signup': 'Registrieren',
        'nav.logout': 'Abmelden',
        'nav.subs': 'Abonnements',
        'empty.message': 'Noch keine Produkte. Fügen Sie ein Produkt hinzu!',
        'loginPrompt': 'Bitte melden Sie sich an oder registrieren Sie sich.',
        'needLoginAdd': 'Sie müssen angemeldet sein, um Produkte hinzuzufügen.',
        'subscriptionExpired': 'Ihr Abonnement ist beendet. Bitte erneuern.',
        'productAddedMessage': 'Produkt erfolgreich hinzugefügt! ✓'
    }
};

function translate(key) {
    const lang = localStorage.getItem('dukkan_lang') || 'tr';
    const pool = TRANSLATIONS[lang] || TRANSLATIONS['tr'];
    return pool[key] || TRANSLATIONS['tr'][key] || '';
}

function translatePage() {
    const lang = localStorage.getItem('dukkan_lang') || 'tr';

    // direction for RTL
    if (['ar', 'he'].includes(lang)) document.documentElement.dir = 'rtl';
    else document.documentElement.dir = 'ltr';

    // data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const t = translate(key);
        if (!t) return;
        // replace placeholders for subscription info
        el.innerHTML = t.replace('{{package}}', document.getElementById('currentPackage') ? document.getElementById('currentPackage').textContent : '').replace('{{remaining}}', document.getElementById('weeklyRemaining') ? document.getElementById('weeklyRemaining').textContent : '');
    });

    // placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const t = translate(key);
        if (t) el.placeholder = t;
    });

    // update some dynamic strings in script
}

// Updated message helpers to use translations
function showSuccess(messageKeyOrString) {
    const messageText = TRANSLATIONS[localStorage.getItem('dukkan_lang') || 'tr'][messageKeyOrString] || messageKeyOrString;
    const messageEl = document.createElement('div');
    messageEl.className = 'success-message';
    messageEl.innerHTML = `
        ${messageText}
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    document.querySelector('.main-content').insertBefore(messageEl, document.querySelector('.form-section'));

    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

function showAlert(messageKeyOrString) {
    const messageText = TRANSLATIONS[localStorage.getItem('dukkan_lang') || 'tr'][messageKeyOrString] || messageKeyOrString;
    const messageEl = document.createElement('div');
    messageEl.className = 'alert-message';
    messageEl.innerHTML = messageText;
    document.querySelector('.main-content').insertBefore(messageEl, document.querySelector('.form-section'));

    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

function showSubscriptionPrompt(message) {
    // Remove existing prompt if any
    const existing = document.querySelector('.subscribe-message');
    if (existing) existing.remove();

    const msg = message || 'Aboneliğiniz bitti. Ürün eklemek için aboneliğinizi yenileyin.';
    const messageEl = document.createElement('div');
    messageEl.className = 'subscribe-message';
    messageEl.innerHTML = `
        <div style="flex:1">${msg}</div>
        <div style="display:flex; gap:8px;">
            <a class="btn btn-add" href="subscription.html">Abonelik Al</a>
            <button class="btn btn-clear" onclick="this.closest('.subscribe-message').remove()">Çık</button>
        </div>
    `;
    document.querySelector('.main-content').insertBefore(messageEl, document.querySelector('.form-section'));
}

// Auth helpers and UI
function isLoggedIn() {
    return !!getCurrentUser();
}

function showLoginPrompt(message) {
    // reuse subscribe message container
    const existing = document.querySelector('.subscribe-message');
    if (existing) existing.remove();
    const msg = message || 'Lütfen giriş yapın veya kayıt olun.';
    const messageEl = document.createElement('div');
    messageEl.className = 'subscribe-message';
    messageEl.innerHTML = `
        <div style="flex:1">${msg}</div>
        <div style="display:flex; gap:8px;">
            <a class="btn btn-add" href="login.html">Giriş Yap</a>
            <a class="btn btn-clear" href="signup.html">Katıl</a>
            <button class="btn btn-clear" onclick="this.closest('.subscribe-message').remove()">Çık</button>
        </div>
    `;
    document.querySelector('.main-content').insertBefore(messageEl, document.querySelector('.form-section'));
}

function updateAuthUI() {
    const user = getCurrentUser();
    const userStatus = document.getElementById('userStatus');
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');
    const logoutBtn = document.getElementById('logoutBtn');

    // subscription bar behaviour
    const pkgSpan = document.querySelector('.subscription-bar .sub-inner span:nth-child(1)');
    const remSpan = document.querySelector('.subscription-bar .sub-inner span:nth-child(2)');
    const authActions = document.querySelector('.subscription-bar .sub-inner .auth-actions');

    if (user) {
        if (userStatus) userStatus.textContent = `Hoşgeldin, ${user}`;
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (pkgSpan) pkgSpan.style.display = 'inline';
        if (remSpan) remSpan.style.display = 'inline';
        if (authActions) authActions.style.display = 'flex';
    } else {
        if (userStatus) userStatus.textContent = '';
        if (loginLink) loginLink.style.display = 'inline-block';
        if (signupLink) signupLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (pkgSpan) pkgSpan.style.display = 'none';
        if (remSpan) remSpan.style.display = 'none';
        if (authActions) authActions.style.display = 'flex';
    }

    // disable or enable product form for guests
    const form = document.getElementById('productForm');
    if (form) {
        const inputs = form.querySelectorAll('input, select, textarea, button[type="submit"]');
        if (!isLoggedIn()) {
            inputs.forEach(i => i.disabled = true);
            // show banner
            if (!document.getElementById('formAuthBanner')) {
                const banner = document.createElement('div');
                banner.id = 'formAuthBanner';
                banner.className = 'alert-message';
                banner.innerHTML = 'Ürün eklemek için lütfen <a href="login.html">Giriş Yapın</a> veya <a href="signup.html">Katılın</a>.';
                form.parentElement.insertBefore(banner, form);
            }
        } else {
            inputs.forEach(i => i.disabled = false);
            const banner = document.getElementById('formAuthBanner');
            if (banner) banner.remove();
        }
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
function buyPackage(name, limit, price) {
    // Satın al butonuna basınca ödeme sayfasına git ve paket bilgilerini gönder
    window.location.href = `checkout.html?name=${name}&limit=${limit}&price=${price}`;
}