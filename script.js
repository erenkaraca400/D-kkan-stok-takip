// Veri depolama
let products = [];
const STORAGE_KEY = 'dukkan_products';
const PACKAGE_KEY = 'dukkan_package';
const WEEKLY_KEY = 'dukkan_weekly';

let userPackage = null;
let weeklyData = { start: null, count: 0 };

function getWeekStart(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    d.setHours(0,0,0,0);
    return d.toISOString().split('T')[0];
}

function loadPackage() {
    const saved = localStorage.getItem(PACKAGE_KEY);
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
    localStorage.setItem(PACKAGE_KEY, JSON.stringify(userPackage));
}

function loadWeekly() {
    const saved = localStorage.getItem(WEEKLY_KEY);
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
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(weeklyData));
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
    loadProducts();
    loadPackage();
    loadWeekly();
    renderProducts();
    updateStats();
    updateSubscriptionUI();

    // Event Listeners
    productForm.addEventListener('submit', addProduct);
    searchInput.addEventListener('input', filterProducts);
    filterCategory.addEventListener('change', filterProducts);
    clearBtn.addEventListener('click', clearFilters);

    // Hepsini sil butonu
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAllProducts);

});

function deleteAllProducts() {
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
        productsList.innerHTML = '<p class="empty-message">Henüz ürün eklenmemiş. İlk ürünü ekleyerek başlayın!</p>';
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
            
            <div class="product-actions">
                <button class="btn btn-decrease" onclick="changeQuantity(${product.id}, -1)">➖ Azalt</button>
                <button class="btn btn-increase" onclick="changeQuantity(${product.id}, 1)">➕ Arttır</button>
                <button class="btn btn-edit" onclick="editProduct(${product.id})">✏️ Düzenle</button>
                <button class="btn btn-delete" onclick="deleteProduct(${product.id})">🗑️ Sil</button>
            </div>
        </div>
    `).join('');
}

// Miktar Değiştir
function changeQuantity(productId, change) {
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
            
            <div class="product-actions">
                <button class="btn btn-decrease" onclick="changeQuantity(${product.id}, -1)">➖ Azalt</button>
                <button class="btn btn-increase" onclick="changeQuantity(${product.id}, 1)">➕ Arttır</button>
                <button class="btn btn-edit" onclick="editProduct(${product.id})">✏️ Düzenle</button>
                <button class="btn btn-delete" onclick="deleteProduct(${product.id})">🗑️ Sil</button>
            </div>
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadProducts() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            products = JSON.parse(saved);
        } catch (e) {
            products = [];
        }
    }
}

// Yardımcı Fonksiyonlar
function showSuccess(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'success-message';
    messageEl.innerHTML = `
        ${message}
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    document.querySelector('.main-content').insertBefore(messageEl, document.querySelector('.form-section'));

    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

function showAlert(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'alert-message';
    messageEl.textContent = message;
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