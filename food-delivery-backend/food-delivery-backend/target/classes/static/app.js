/**
 * BiteDash - Gourmet Food Delivery Frontend
 * Core JavaScript Logic
 */

// Global Application State
const state = {
    restaurants: [],
    foods: [],
    currentView: 'home', // home, menu, orders, admin
    currentRestaurant: null,
    currentCategory: 'all',
    cart: {
        restaurantId: null,
        restaurantName: null,
        items: [], // { foodId, name, price, quantity, addOns }
        subtotal: 0,
        discount: 0,
        coupon: null,
        total: 0
    },
    admin: {
        activeTab: 'tab-admin-orders',
        orders: [],
        restaurants: [],
        foods: []
    },
    userPhone: localStorage.getItem('bitedash_user_phone') || ''
};

// Coupons configuration
const COUPONS = {
    'BITE20': 0.20, // 20% Off
    'BITE50': 0.50, // 50% Off
    'WELCOME10': 0.10 // 10% Off
};

// API Base URL (uses current host)
const API_BASE = '/api';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initRoutes();
    initEventListeners();
    loadRestaurants();
    checkExistingCart();
    
    if (state.userPhone) {
        document.getElementById('lookup-phone-input').value = state.userPhone;
        loadUserOrders(state.userPhone);
    }
});

/* ==========================================
   NAVIGATION & ROUTING
   ========================================== */
function initRoutes() {
    const navBtnHome = document.getElementById('nav-btn-home');
    const navBtnOrders = document.getElementById('nav-btn-orders');
    const navBtnAdmin = document.getElementById('nav-btn-admin');
    const logoBtn = document.getElementById('btn-logo');
    
    const showView = (viewId) => {
        state.currentView = viewId;
        
        // Update Nav Active States
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (viewId === 'home') navBtnHome.classList.add('active');
        if (viewId === 'orders') navBtnOrders.classList.add('active');
        if (viewId === 'admin') navBtnAdmin.classList.add('active');
        
        // Toggle Views
        document.querySelectorAll('.content-view').forEach(view => view.classList.remove('active'));
        
        if (viewId === 'home') {
            document.getElementById('view-home').classList.add('active');
            loadRestaurants(); // Reload to capture any updates
        } else if (viewId === 'menu') {
            document.getElementById('view-menu').classList.add('active');
        } else if (viewId === 'orders') {
            document.getElementById('view-orders').classList.add('active');
            if (state.userPhone) loadUserOrders(state.userPhone);
        } else if (viewId === 'admin') {
            document.getElementById('view-admin').classList.add('active');
            loadAdminData();
        }
    };

    navBtnHome.addEventListener('click', () => showView('home'));
    navBtnOrders.addEventListener('click', () => showView('orders'));
    navBtnAdmin.addEventListener('click', () => showView('admin'));
    logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('home');
    });

    // Handle menu back button
    document.getElementById('menu-back-btn').addEventListener('click', () => {
        showView('home');
    });
}

function initEventListeners() {
    // Search filter input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim();
        loadRestaurants(query);
    }, 300));

    // Category Filter Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const filterType = tab.getAttribute('data-filter');
            applyRestaurantFilters(filterType);
        });
    });

    // Cart Sidebar Triggering
    const cartBtn = document.getElementById('cart-btn');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartSidebar = document.getElementById('cart-sidebar');

    const toggleCart = () => {
        cartSidebar.classList.toggle('open');
        cartOverlay.classList.toggle('active');
    };

    cartBtn.addEventListener('click', toggleCart);
    cartCloseBtn.addEventListener('click', toggleCart);
    cartOverlay.addEventListener('click', toggleCart);

    // Cart Checkout Actions
    const cartActionBtn = document.getElementById('btn-cart-action');
    cartActionBtn.addEventListener('click', handleCartAction);

    // Coupon Application
    document.getElementById('btn-apply-coupon').addEventListener('click', applyCouponCode);

    // Orders Lookup
    document.getElementById('btn-lookup-orders').addEventListener('click', () => {
        const phone = document.getElementById('lookup-phone-input').value.trim();
        if (!phone) {
            showToast('Please enter a phone number', 'warning');
            return;
        }
        state.userPhone = phone;
        localStorage.setItem('bitedash_user_phone', phone);
        loadUserOrders(phone);
    });

    // Seed Data
    document.getElementById('btn-seed-data').addEventListener('click', seedDemoData);

    // Modal close hooks
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModal = btn.getAttribute('data-close');
            document.getElementById(targetModal).classList.remove('active');
        });
    });

    // Admin Dashboard navigation tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabId = tab.getAttribute('data-tab');
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            
            state.admin.activeTab = tabId;
        });
    });

    // Admin Add Buttons (open modals)
    document.getElementById('btn-add-restaurant-modal').addEventListener('click', () => {
        document.getElementById('modal-restaurant').classList.add('active');
    });

    document.getElementById('btn-add-food-modal').addEventListener('click', () => {
        populateRestaurantDropdown('food-restaurant');
        document.getElementById('modal-food').classList.add('active');
    });

    // Admin submit handlers
    document.getElementById('form-add-restaurant').addEventListener('submit', createRestaurant);
    document.getElementById('form-add-food').addEventListener('submit', createFoodItem);
    document.getElementById('btn-refresh-admin-orders').addEventListener('click', () => fetchAdminOrders());
    
    // Admin selective restaurant filter for menu item list
    document.getElementById('admin-food-restaurant-select').addEventListener('change', (e) => {
        const restId = e.target.value;
        fetchAdminFoods(restId);
    });
}

/* ==========================================
   RESTAURANT MANAGEMENT (CUSTOMER VIEW)
   ========================================== */
async function loadRestaurants(searchQuery = '') {
    const container = document.getElementById('restaurants-container');
    const countLabel = document.getElementById('restaurant-count');
    
    try {
        let url = `${API_BASE}/restaurants`;
        if (searchQuery) {
            url += `?search=${encodeURIComponent(searchQuery)}`;
        }
        
        const response = await fetch(url);
        const res = await response.json();
        
        if (res.success) {
            state.restaurants = res.data;
            renderRestaurants(state.restaurants);
            
            // Hide seeder box if data exists, show it if database has <= 1 record to help user seed demo data
            const seederBox = document.getElementById('seeder-box');
            if (state.restaurants.length <= 1) {
                seederBox.style.display = 'block';
            } else {
                seederBox.style.display = 'none';
            }
        } else {
            container.innerHTML = `<div class="empty-state">Failed to load kitchens: ${res.message}</div>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="empty-state">Connection error to backend database.</div>`;
    }
}

function renderRestaurants(list) {
    const container = document.getElementById('restaurants-container');
    const countLabel = document.getElementById('restaurant-count');
    
    countLabel.textContent = `${list.length} Kitchens available`;
    
    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3>No restaurants found</h3>
                <p>Try searching for a different keyword or filter.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = list.map(rest => {
        const vegBadge = rest.isVeg ? `<span class="veg-indicator-badge">Veg Only</span>` : '';
        const closedClass = rest.isOpen ? '' : 'closed';
        const closedLabel = rest.isOpen ? 'Open Now' : 'Closed';
        const defaultImg = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60';
        const img = rest.imageUrl && rest.imageUrl !== 'https://via.placeholder.com/300' ? rest.imageUrl : defaultImg;
        
        return `
            <div class="restaurant-card ${closedClass}" onclick="openRestaurantMenu(${rest.id})">
                <div class="card-banner">
                    <img src="${img}" alt="${rest.name}" onerror="this.src='${defaultImg}'">
                    <span class="status-badge ${closedClass}">${closedLabel}</span>
                    ${vegBadge}
                </div>
                <div class="card-body">
                    <span class="card-cuisine">${rest.cuisine}</span>
                    <h3 class="card-title">${rest.name}</h3>
                    <div class="card-meta">
                        <span class="meta-item rating-badge">
                            ⭐ ${rest.rating.toFixed(1)}
                        </span>
                        <span class="meta-item">
                            🕒 ${rest.deliveryTime}
                        </span>
                        <span class="meta-item bold">
                            ${rest.priceRange}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function applyRestaurantFilters(filterType) {
    let list = [...state.restaurants];
    
    if (filterType === 'veg') {
        list = list.filter(r => r.isVeg);
    } else if (filterType === 'rating') {
        list = list.filter(r => r.rating >= 4.5);
    } else if (filterType === 'open') {
        list = list.filter(r => r.isOpen);
    }
    
    renderRestaurants(list);
}

/* ==========================================
   MENU MANAGEMENT (CUSTOMER VIEW)
   ========================================== */
async function openRestaurantMenu(id) {
    state.currentRestaurant = state.restaurants.find(r => r.id === id);
    if (!state.currentRestaurant) return;
    
    // Switch View
    state.currentView = 'menu';
    document.querySelectorAll('.content-view').forEach(view => view.classList.remove('active'));
    document.getElementById('view-menu').classList.add('active');
    
    // Render Restaurant Hero Detail Banner
    const banner = document.getElementById('restaurant-profile-banner');
    const defaultImg = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60';
    const rest = state.currentRestaurant;
    
    banner.innerHTML = `
        <div class="profile-info">
            <span class="profile-cuisine">${rest.cuisine}</span>
            <h1 class="profile-name">${rest.name}</h1>
            <p class="profile-address">
                <svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;display:inline;">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                ${rest.address}
            </p>
            <p class="profile-phone">📞 Tel: ${rest.phone || 'N/A'}</p>
        </div>
        <div class="profile-stats">
            <div class="stat-box">
                <div class="stat-value text-warning">⭐ ${rest.rating.toFixed(1)}</div>
                <div class="stat-label">Rating</div>
            </div>
            <div class="stat-box">
                <div class="stat-value text-primary">🕒 ${rest.deliveryTime}</div>
                <div class="stat-label">Delivery</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${rest.priceRange}</div>
                <div class="stat-label">Cost</div>
            </div>
        </div>
    `;
    
    // Fetch Foods for this Restaurant
    await loadRestaurantFoods(id);
}

async function loadRestaurantFoods(restaurantId) {
    const foodContainer = document.getElementById('food-container');
    const categoriesContainer = document.getElementById('menu-categories');
    
    try {
        const response = await fetch(`${API_BASE}/foods?restaurantId=${restaurantId}`);
        const res = await response.json();
        
        if (res.success) {
            state.foods = res.data;
            
            // Extract distinct categories
            const categories = ['all', ...new Set(state.foods.map(f => f.category))];
            
            // Render category sidebar
            categoriesContainer.innerHTML = categories.map(cat => {
                const activeClass = state.currentCategory === cat ? 'active' : '';
                const display = cat.charAt(0).toUpperCase() + cat.slice(1);
                return `
                    <li class="category-item ${activeClass}" onclick="selectMenuCategory('${cat}')">${display}</li>
                `;
            }).join('');
            
            renderFoodItems();
        } else {
            foodContainer.innerHTML = `<div class="empty-state">Failed to fetch menu items.</div>`;
        }
    } catch (err) {
        console.error(err);
        foodContainer.innerHTML = `<div class="empty-state">Connection error.</div>`;
    }
}

function selectMenuCategory(cat) {
    state.currentCategory = cat;
    document.querySelectorAll('.category-item').forEach(li => {
        if (li.textContent.toLowerCase() === cat.toLowerCase() || (cat === 'all' && li.textContent === 'All')) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });
    
    document.getElementById('current-category-name').textContent = cat === 'all' ? 'All Items' : cat;
    renderFoodItems();
}

function renderFoodItems() {
    const foodContainer = document.getElementById('food-container');
    let filtered = [...state.foods];
    
    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(f => f.category.toLowerCase() === state.currentCategory.toLowerCase());
    }
    
    if (filtered.length === 0) {
        foodContainer.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <p>No food items available in this category.</p>
            </div>
        `;
        return;
    }
    
    foodContainer.innerHTML = filtered.map(food => {
        const inCartItem = state.cart.items.find(item => item.foodId === food.id);
        const qty = inCartItem ? inCartItem.quantity : 0;
        
        const vegClass = food.isVeg ? '' : 'non-veg';
        const defaultImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
        const img = food.imageUrl && food.imageUrl !== 'https://via.placeholder.com/300' ? food.imageUrl : defaultImg;
        
        const actionBtnHtml = qty > 0 
            ? `
                <div class="quantity-selector">
                    <button class="qty-btn" onclick="updateCartQty(${food.id}, ${qty - 1})">-</button>
                    <span class="qty-val">${qty}</span>
                    <button class="qty-btn" onclick="updateCartQty(${food.id}, ${qty + 1})">+</button>
                </div>
            `
            : `
                <button class="btn-add-to-cart" onclick="addToCart(${food.id})">Add to Cart</button>
            `;
            
        return `
            <div class="food-card">
                <div class="food-image">
                    <img src="${img}" alt="${food.name}" onerror="this.src='${defaultImg}'">
                    <span class="food-veg-tag ${vegClass}" title="${food.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
                </div>
                <div class="food-body">
                    <h3 class="food-title">${food.name}</h3>
                    <p class="food-desc">${food.description}</p>
                    <div class="food-footer">
                        <span class="food-price">₹${food.price.toFixed(2)}</span>
                        <div class="add-btn-wrapper" id="btn-wrap-${food.id}">
                            ${actionBtnHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================
   SHOPPING CART OPERATIONS
   ========================================== */
function checkExistingCart() {
    const saved = localStorage.getItem('bitedash_cart');
    if (saved) {
        try {
            state.cart = JSON.parse(saved);
            updateCartUI();
        } catch (e) {
            console.error("Failed to restore cart", e);
        }
    }
}

function saveCart() {
    localStorage.setItem('bitedash_cart', JSON.stringify(state.cart));
}

function addToCart(foodId) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;

    // Check if adding item from different restaurant
    if (state.cart.restaurantId !== null && state.cart.restaurantId !== food.restaurantId) {
        const proceed = confirm(`Your cart contains items from "${state.cart.restaurantName}". Clear cart and add items from "${state.currentRestaurant.name}" instead?`);
        if (proceed) {
            clearCart();
        } else {
            return;
        }
    }

    // Set restaurant context
    state.cart.restaurantId = food.restaurantId;
    state.cart.restaurantName = state.currentRestaurant.name;

    // Add Item
    state.cart.items.push({
        foodId: food.id,
        name: food.name,
        price: food.price,
        quantity: 1,
        addOns: ''
    });

    saveCart();
    updateCartUI();
    renderFoodItems(); // Refresh menu add buttons
    showToast(`Added ${food.name} to cart`, 'success');
}

function updateCartQty(foodId, newQty) {
    const itemIndex = state.cart.items.findIndex(item => item.foodId === foodId);
    if (itemIndex === -1) return;

    if (newQty <= 0) {
        state.cart.items.splice(itemIndex, 1);
        showToast("Removed item from cart", "warning");
    } else {
        state.cart.items[itemIndex].quantity = newQty;
    }

    // Reset restaurant context if cart is empty
    if (state.cart.items.length === 0) {
        state.cart.restaurantId = null;
        state.cart.restaurantName = null;
        state.cart.coupon = null;
        state.cart.discount = 0;
        document.getElementById('coupon-code').value = '';
    }

    saveCart();
    updateCartUI();
    renderFoodItems(); // Refresh menu add buttons
}

function clearCart() {
    state.cart.restaurantId = null;
    state.cart.restaurantName = null;
    state.cart.items = [];
    state.cart.subtotal = 0;
    state.cart.discount = 0;
    state.cart.coupon = null;
    state.cart.total = 0;
    
    // Clear coupon UI inputs
    document.getElementById('coupon-code').value = '';
    
    saveCart();
    updateCartUI();
    renderFoodItems();
}

function updateCartUI() {
    const countBadge = document.getElementById('cart-count');
    const headerTotal = document.getElementById('header-cart-total');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total-amount');
    const discountEl = document.getElementById('cart-discount');
    const discountRow = document.getElementById('cart-discount-row');
    const couponLabel = document.getElementById('active-coupon-label');
    const itemsContainer = document.getElementById('cart-items-container');
    const checkoutSection = document.getElementById('checkout-form-section');
    const cartActionBtn = document.getElementById('btn-cart-action');

    // Item count count
    const count = state.cart.items.reduce((acc, item) => acc + item.quantity, 0);
    countBadge.textContent = count;

    // Subtotal
    state.cart.subtotal = state.cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Apply Discount
    if (state.cart.coupon && COUPONS[state.cart.coupon]) {
        state.cart.discount = state.cart.subtotal * COUPONS[state.cart.coupon];
        discountRow.classList.remove('hidden');
        couponLabel.textContent = state.cart.coupon;
        discountEl.textContent = `-$${state.cart.discount.toFixed(2)}`;
    } else {
        state.cart.discount = 0;
        discountRow.classList.add('hidden');
    }

    state.cart.total = Math.max(0, state.cart.subtotal - state.cart.discount);

    // Update monetary values
    headerTotal.textContent = `₹${state.cart.total.toFixed(2)}`;
    subtotalEl.textContent = `₹${state.cart.subtotal.toFixed(2)}`;
    totalEl.textContent = `₹${state.cart.total.toFixed(2)}`;

    // Render cart items listing
    if (state.cart.items.length === 0) {
        itemsContainer.innerHTML = `
            <div class="empty-cart-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-cart-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p>Your cart is empty</p>
                <span>Add items from your favorite restaurants to place an order.</span>
            </div>
        `;
        checkoutSection.classList.add('hidden');
        cartActionBtn.textContent = 'Proceed to Checkout';
        cartActionBtn.disabled = true;
    } else {
        cartActionBtn.disabled = false;
        itemsContainer.innerHTML = state.cart.items.map(item => `
            <div class="cart-item-row">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-qty">
                    <button onclick="updateCartQty(${item.foodId}, ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartQty(${item.foodId}, ${item.quantity + 1})">+</button>
                </div>
                <button class="cart-item-remove" onclick="updateCartQty(${item.foodId}, 0)" aria-label="Remove item">
                    &times;
                </button>
            </div>
        `).join('');
    }
}

function handleCartAction() {
    const checkoutSection = document.getElementById('checkout-form-section');
    const cartActionBtn = document.getElementById('btn-cart-action');

    if (checkoutSection.classList.contains('hidden')) {
        // Switch to checkout state
        checkoutSection.classList.remove('hidden');
        cartActionBtn.textContent = 'Place Order';
        
        // Auto pre-fill phone if available
        if (state.userPhone) {
            document.getElementById('cust-phone').value = state.userPhone;
        }
    } else {
        // Execute Checkout API request
        submitCheckoutOrder();
    }
}

function applyCouponCode() {
    if (state.cart.items.length === 0) {
        showToast('Add items to cart first!', 'warning');
        return;
    }
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    if (!code) {
        state.cart.coupon = null;
        updateCartUI();
        return;
    }

    if (COUPONS[code] !== undefined) {
        state.cart.coupon = code;
        updateCartUI();
        showToast(`Coupon "${code}" applied successfully!`, 'success');
    } else {
        showToast('Invalid Coupon Code', 'error');
    }
}

/* ==========================================
   ORDER CHECKOUT & API SUBMISSION
   ========================================== */
async function submitCheckoutOrder() {
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const method = document.getElementById('payment-method').value;
    const notes = document.getElementById('cust-instructions').value.trim();
    const coupon = state.cart.coupon || '';

    // Validations
    if (!name || !phone || !address) {
        showToast('Please fill all delivery details', 'warning');
        return;
    }

    // Prepare JSON Payload
    const payload = {
        customerName: name,
        customerPhone: phone,
        deliveryAddress: address,
        totalAmount: state.cart.total,
        paymentMethod: method,
        couponCode: coupon,
        discount: state.cart.discount,
        deliveryInstructions: notes,
        restaurantId: state.cart.restaurantId,
        orderItems: state.cart.items.map(item => ({
            foodId: item.foodId,
            quantity: item.quantity,
            price: item.price,
            addOns: item.addOns
        }))
    };

    const actionBtn = document.getElementById('btn-cart-action');
    actionBtn.disabled = true;
    actionBtn.textContent = 'Placing Order...';

    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const res = await response.json();
        if (res.success) {
            showToast('Order placed successfully!', 'success');
            
            // Clear cart
            clearCart();
            
            // Close Sidebar drawer
            document.getElementById('cart-sidebar').classList.remove('open');
            document.getElementById('cart-overlay').classList.remove('active');
            
            // Remember user phone number
            state.userPhone = phone;
            localStorage.setItem('bitedash_user_phone', phone);
            document.getElementById('lookup-phone-input').value = phone;

            // Route to Orders History view
            state.currentView = 'orders';
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('nav-btn-orders').classList.add('active');
            document.querySelectorAll('.content-view').forEach(view => view.classList.remove('active'));
            document.getElementById('view-orders').classList.add('active');
            
            loadUserOrders(phone);
        } else {
            showToast(`Order failed: ${res.message}`, 'error');
            actionBtn.disabled = false;
            actionBtn.textContent = 'Place Order';
        }
    } catch (e) {
        console.error(e);
        showToast('Network error during checkout.', 'error');
        actionBtn.disabled = false;
        actionBtn.textContent = 'Place Order';
    }
}

/* ==========================================
   ORDER LOOKUP & TRACKING (CUSTOMER VIEW)
   ========================================== */
async function loadUserOrders(phone) {
    const listContainer = document.getElementById('orders-list-container');
    
    try {
        const response = await fetch(`${API_BASE}/orders?phone=${encodeURIComponent(phone)}`);
        const res = await response.json();
        
        if (res.success) {
            const orders = res.data;
            renderOrders(orders);
        } else {
            listContainer.innerHTML = `<div class="empty-state">Error: ${res.message}</div>`;
        }
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="empty-state">Failed to retrieve orders.</div>`;
    }
}

function renderOrders(orders) {
    const container = document.getElementById('orders-list-container');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                </svg>
                <h3>No orders found</h3>
                <p>We couldn't find any orders placed under phone number: <strong>${state.userPhone}</strong>.</p>
            </div>
        `;
        return;
    }
    
    // Sort descending by ID / Date
    orders.sort((a, b) => b.id - a.id);

    container.innerHTML = orders.map(order => {
        const itemsHtml = order.orderItems.map(item => `
            <tr>
                <td class="item-qty-lbl">${item.quantity}x</td>
                <td>${item.foodName || 'Menu Item'}</td>
                <td class="item-price-lbl">₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        // Progress Calculations
        let progressPercent = 0;
        let step1 = 'active';
        let step2 = '';
        let step3 = '';
        let step4 = '';
        let step5 = '';

        const status = order.status;

        if (status === 'ACCEPTED') {
            progressPercent = 25;
            step1 = 'completed';
            step2 = 'active';
        } else if (status === 'PREPARING') {
            progressPercent = 50;
            step1 = 'completed';
            step2 = 'completed';
            step3 = 'active';
        } else if (status === 'OUT_FOR_DELIVERY') {
            progressPercent = 75;
            step1 = 'completed';
            step2 = 'completed';
            step3 = 'completed';
            step4 = 'active';
        } else if (status === 'DELIVERED') {
            progressPercent = 100;
            step1 = 'completed';
            step2 = 'completed';
            step3 = 'completed';
            step4 = 'completed';
            step5 = 'completed';
        } else if (status === 'REJECTED') {
            // Rejected / Cancelled has no positive progression
            step1 = 'active';
        }

        const trackerHtml = status === 'REJECTED' 
            ? `
                <div class="empty-state" style="padding: 1rem 0; color: var(--danger)">
                    <strong>🚫 This order was declined by the restaurant.</strong>
                </div>
            `
            : `
                <div class="order-stepper">
                    <div class="stepper-progress-bar" style="width: ${progressPercent}%"></div>
                    <div class="step ${step1}">
                        <div class="step-node"></div>
                        <span class="step-label">Placed</span>
                    </div>
                    <div class="step ${step2}">
                        <div class="step-node"></div>
                        <span class="step-label">Accepted</span>
                    </div>
                    <div class="step ${step3}">
                        <div class="step-node"></div>
                        <span class="step-label">Preparing</span>
                    </div>
                    <div class="step ${step4}">
                        <div class="step-node"></div>
                        <span class="step-label">Out</span>
                    </div>
                    <div class="step ${step5}">
                        <div class="step-node"></div>
                        <span class="step-label">Delivered</span>
                    </div>
                </div>
            `;

        const restName = order.restaurantName || `Restaurant #${order.restaurantId}`;
        const discountRow = order.discount > 0 
            ? `
                <tr>
                    <td colspan="2" style="color:var(--accent);font-weight:600;">Promo Discount</td>
                    <td class="item-price-lbl" style="color:var(--accent);font-weight:600;">-₹${order.discount.toFixed(2)}</td>
                </tr>
            `
            : '';

        return `
            <div class="order-record-card">
                <div class="order-record-header">
                    <div>
                        <span class="order-id-label">Order #${order.id}</span>
                        <span class="order-date">${new Date(order.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <span class="order-record-status ${status}">${status.replace(/_/g, ' ')}</span>
                </div>
                
                <div class="order-record-body">
                    <div class="order-item-summary">
                        <span class="order-summary-title">Kitchen: ${restName}</span>
                        <table class="item-list-table">
                            <tbody>
                                ${itemsHtml}
                                ${discountRow}
                            </tbody>
                        </table>
                        <div class="order-total-block">
                            <span>Grand Total</span>
                            <span class="total-amt">₹${order.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div style="border-left: 1px solid var(--border-color); padding-left: 1.5rem;">
                        <span class="order-summary-title">Delivery Details</span>
                        <p style="font-size:0.85rem; margin-top:0.5rem;"><strong>Recipient:</strong> ${order.customerName}</p>
                        <p style="font-size:0.85rem;"><strong>Address:</strong> ${order.deliveryAddress}</p>
                        ${order.deliveryInstructions ? `<p style="font-size:0.85rem; color:var(--text-muted);">ℹ️ ${order.deliveryInstructions}</p>` : ''}
                    </div>
                </div>
                
                ${trackerHtml}
            </div>
        `;
    }).join('');
}

/* ==========================================
   ADMIN PANEL DASHBOARD LOGIC
   ========================================== */
function loadAdminData() {
    fetchAdminOrders();
    fetchAdminRestaurants();
    fetchAdminFoods();
}

async function fetchAdminOrders() {
    const tbody = document.getElementById('admin-orders-table-body');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">Loading orders list...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE}/orders`);
        const res = await response.json();

        if (res.success) {
            state.admin.orders = res.data;
            renderAdminOrders(state.admin.orders);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Network Error</td></tr>`;
    }
}

function renderAdminOrders(orders) {
    const tbody = document.getElementById('admin-orders-table-body');
    
    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No orders have been placed yet.</td></tr>`;
        return;
    }

    orders.sort((a,b) => b.id - a.id);

    tbody.innerHTML = orders.map(order => {
        const items = order.orderItems.map(i => `${i.quantity}x ${i.foodName}`).join(', ');
        const restName = order.restaurantName || `Rest. #${order.restaurantId}`;
        const phone = order.customerPhone || 'N/A';
        
        return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>
                    <div>${order.customerName}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">${phone}</div>
                </td>
                <td>${restName}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${items}">
                    ${items}
                </td>
                <td class="bold">₹${order.totalAmount.toFixed(2)}</td>
                <td>
                    <span class="order-record-status ${order.status}">${order.status}</span>
                </td>
                <td>
                    <div class="admin-actions">
                        <select class="status-select" onchange="changeOrderStatus(${order.id}, this.value)">
                            <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>PENDING</option>
                            <option value="ACCEPTED" ${order.status === 'ACCEPTED' ? 'selected' : ''}>ACCEPTED</option>
                            <option value="PREPARING" ${order.status === 'PREPARING' ? 'selected' : ''}>PREPARING</option>
                            <option value="OUT_FOR_DELIVERY" ${order.status === 'OUT_FOR_DELIVERY' ? 'selected' : ''}>OUT_FOR_DELIVERY</option>
                            <option value="DELIVERED" ${order.status === 'DELIVERED' ? 'selected' : ''}>DELIVERED</option>
                            <option value="REJECTED" ${order.status === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
                        </select>
                        <button class="btn btn-secondary btn-sm" onclick="deleteOrder(${order.id})" style="padding:0.25rem 0.5rem; color:var(--danger)">&times;</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function changeOrderStatus(id, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/orders/${id}/status?status=${newStatus}`, {
            method: 'PATCH'
        });
        const res = await response.json();
        if (res.success) {
            showToast(`Order #${id} updated to ${newStatus}`, 'success');
            fetchAdminOrders();
        } else {
            showToast(`Update failed: ${res.message}`, 'error');
        }
    } catch (e) {
        showToast('Network error during status update', 'error');
    }
}

async function deleteOrder(id) {
    if (!confirm(`Are you sure you want to delete order #${id}?`)) return;
    try {
        const response = await fetch(`${API_BASE}/orders/${id}`, {
            method: 'DELETE'
        });
        const res = await response.json();
        if (res.success) {
            showToast(`Deleted order #${id}`, 'success');
            fetchAdminOrders();
        } else {
            showToast(`Delete failed: ${res.message}`, 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

async function fetchAdminRestaurants() {
    const tbody = document.getElementById('admin-restaurants-table-body');
    
    try {
        const response = await fetch(`${API_BASE}/restaurants`);
        const res = await response.json();
        if (res.success) {
            state.admin.restaurants = res.data;
            renderAdminRestaurants(state.admin.restaurants);
            
            // Also populate the filter dropdown in the food tab
            const selectFilter = document.getElementById('admin-food-restaurant-select');
            selectFilter.innerHTML = '<option value="">All Restaurants</option>' + 
                state.admin.restaurants.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7">Network Error</td></tr>`;
    }
}

function renderAdminRestaurants(list) {
    const tbody = document.getElementById('admin-restaurants-table-body');
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No restaurants available.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(rest => `
        <tr>
            <td><strong>#${rest.id}</strong></td>
            <td><strong>${rest.name}</strong></td>
            <td>${rest.cuisine}</td>
            <td>⭐ ${rest.rating.toFixed(1)}</td>
            <td>
                <span class="order-record-status ${rest.isOpen ? 'DELIVERED' : 'REJECTED'}">
                    ${rest.isOpen ? 'OPEN' : 'CLOSED'}
                </span>
            </td>
            <td>${rest.phone || 'N/A'}</td>
            <td>
                <div class="admin-actions">
                    <button class="btn btn-secondary btn-sm" onclick="toggleRestaurantStatus(${rest.id}, ${rest.isOpen})">
                        Toggle Open
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteRestaurant(${rest.id})" style="color:var(--danger)">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function toggleRestaurantStatus(id, currentOpen) {
    const restaurant = state.admin.restaurants.find(r => r.id === id);
    if (!restaurant) return;
    
    restaurant.isOpen = !currentOpen;
    
    try {
        const response = await fetch(`${API_BASE}/restaurants/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restaurant)
        });
        const res = await response.json();
        if (res.success) {
            showToast('Restaurant updated successfully', 'success');
            fetchAdminRestaurants();
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

async function deleteRestaurant(id) {
    if (!confirm('Warning: Deleting a restaurant will remove all its food menu items too. Proceed?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/restaurants/${id}`, { method: 'DELETE' });
        const res = await response.json();
        if (res.success) {
            showToast('Restaurant deleted', 'success');
            fetchAdminRestaurants();
            fetchAdminFoods();
        } else {
            showToast(res.message, 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

async function fetchAdminFoods(restaurantId = '') {
    const tbody = document.getElementById('admin-foods-table-body');
    
    try {
        let url = `${API_BASE}/foods`;
        if (restaurantId) {
            url += `?restaurantId=${restaurantId}`;
        }
        
        const response = await fetch(url);
        const res = await response.json();
        if (res.success) {
            state.admin.foods = res.data;
            renderAdminFoods(state.admin.foods);
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8">Network Error</td></tr>`;
    }
}

function renderAdminFoods(list) {
    const tbody = document.getElementById('admin-foods-table-body');
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">No menu items found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(food => {
        // Map restaurant ID to name
        const rest = state.admin.restaurants.find(r => r.id === food.restaurantId);
        const restName = rest ? rest.name : `ID: ${food.restaurantId}`;
        
        return `
            <tr>
                <td><strong>#${food.id}</strong></td>
                <td><strong>${food.name}</strong></td>
                <td>${restName}</td>
                <td>${food.category}</td>
                <td class="bold">₹${food.price.toFixed(2)}</td>
                <td>
                    <span class="dot ${food.isVeg ? 'veg' : 'non-veg'}" style="margin-right:4px;"></span>
                    ${food.isVeg ? 'Veg' : 'Non-Veg'}
                </td>
                <td>
                    <span class="order-record-status ${food.isAvailable ? 'DELIVERED' : 'REJECTED'}">
                        ${food.isAvailable ? 'AVAILABLE' : 'OUT OF STOCK'}
                    </span>
                </td>
                <td>
                    <div class="admin-actions">
                        <button class="btn btn-secondary btn-sm" onclick="toggleFoodAvailability(${food.id}, ${food.isAvailable})">
                            Toggle Stock
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="deleteFood(${food.id})" style="color:var(--danger)">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function toggleFoodAvailability(id, currentAvailable) {
    const food = state.admin.foods.find(f => f.id === id);
    if (!food) return;

    food.isAvailable = !currentAvailable;

    try {
        const response = await fetch(`${API_BASE}/foods/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(food)
        });
        const res = await response.json();
        if (res.success) {
            showToast('Stock toggled successfully', 'success');
            fetchAdminFoods(document.getElementById('admin-food-restaurant-select').value);
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

async function deleteFood(id) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/foods/${id}`, { method: 'DELETE' });
        const res = await response.json();
        if (res.success) {
            showToast('Menu item deleted', 'success');
            fetchAdminFoods(document.getElementById('admin-food-restaurant-select').value);
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

/* Modal form submission helper callbacks */
async function createRestaurant(e) {
    e.preventDefault();
    
    const payload = {
        name: document.getElementById('rest-name').value.trim(),
        cuisine: document.getElementById('rest-cuisine').value.trim(),
        priceRange: document.getElementById('rest-price').value,
        deliveryTime: document.getElementById('rest-delivery').value.trim(),
        rating: parseFloat(document.getElementById('rest-rating').value) || 4.0,
        address: document.getElementById('rest-address').value.trim(),
        phone: document.getElementById('rest-phone').value.trim(),
        isVeg: document.getElementById('rest-veg').checked,
        imageUrl: document.getElementById('rest-image').value.trim() || 'https://via.placeholder.com/300',
        isOpen: true
    };

    try {
        const response = await fetch(`${API_BASE}/restaurants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (res.success) {
            showToast('Restaurant added successfully', 'success');
            document.getElementById('modal-restaurant').classList.remove('active');
            document.getElementById('form-add-restaurant').reset();
            fetchAdminRestaurants();
        } else {
            showToast(res.message, 'error');
        }
    } catch (err) {
        showToast('Network error adding restaurant', 'error');
    }
}

async function createFoodItem(e) {
    e.preventDefault();

    const payload = {
        restaurantId: parseInt(document.getElementById('food-restaurant').value),
        name: document.getElementById('food-name').value.trim(),
        price: parseFloat(document.getElementById('food-price').value),
        category: document.getElementById('food-category').value.trim(),
        addOns: document.getElementById('food-addons').value.trim(),
        isVeg: document.getElementById('food-veg').checked,
        isAvailable: document.getElementById('food-available').checked,
        description: document.getElementById('food-desc').value.trim(),
        imageUrl: document.getElementById('food-image').value.trim() || 'https://via.placeholder.com/300'
    };

    try {
        const response = await fetch(`${API_BASE}/foods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (res.success) {
            showToast('Food menu item added', 'success');
            document.getElementById('modal-food').classList.remove('active');
            document.getElementById('form-add-food').reset();
            fetchAdminFoods(document.getElementById('admin-food-restaurant-select').value);
        } else {
            showToast(res.message, 'error');
        }
    } catch (err) {
        showToast('Network error adding food item', 'error');
    }
}

function populateRestaurantDropdown(elementId) {
    const select = document.getElementById(elementId);
    select.innerHTML = state.admin.restaurants.map(r => `
        <option value="${r.id}">${r.name}</option>
    `).join('');
}

/* ==========================================
   SEED DEMO DATABASE LOGIC
   ========================================== */
async function seedDemoData() {
    const btn = document.getElementById('btn-seed-data');
    btn.disabled = true;
    btn.textContent = 'Seeding database...';

    // Seeding payload structure
    const demoRestaurants = [
        {
            name: "Saravana Bhavan",
            cuisine: "South Indian Pure Veg",
            priceRange: "₹₹",
            deliveryTime: "15 min",
            rating: 4.7,
            address: "12 North Mada Street, Mylapore, Chennai",
            phone: "9840012345",
            isVeg: true,
            imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=60"
        },
        {
            name: "Anjappar Chettinad Restaurant",
            cuisine: "Chettinad Spicy",
            priceRange: "₹₹",
            deliveryTime: "25 min",
            rating: 4.5,
            address: "45 Nungambakkam High Road, Chennai",
            phone: "9840056789",
            isVeg: false,
            imageUrl: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=60"
        },
        {
            name: "Dindigul Thalappakatti",
            cuisine: "Traditional Biryani",
            priceRange: "₹₹₹",
            deliveryTime: "20 min",
            rating: 4.8,
            address: "82 Anna Salai, T. Nagar, Chennai",
            phone: "9840098765",
            isVeg: false,
            imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60"
        },
        {
            name: "Madurai Idli Shop",
            cuisine: "South Indian Breakfast",
            priceRange: "₹",
            deliveryTime: "10 min",
            rating: 4.6,
            address: "15 West Tower Street, Madurai",
            phone: "9840043210",
            isVeg: true,
            imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60"
        }
    ];

    const demoFoods = [
        // Saravana Bhavan
        { restName: "Saravana Bhavan", name: "Ghee Roast Dosa", price: 120.00, category: "Breakfast", isVeg: true, description: "Crispy golden crepe with pure ghee, served with 3 chutneys and sambar.", imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=60" },
        { restName: "Saravana Bhavan", name: "Rava Khichdi", price: 90.00, category: "Breakfast", isVeg: true, description: "Creamy semolina roasted with ghee, cashews, and fresh garden vegetables.", imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60" },
        { restName: "Saravana Bhavan", name: "Traditional Filter Coffee", price: 40.00, category: "Beverages", isVeg: true, description: "Aromatic chicory coffee frothed with fresh milk in traditional brass tumbler.", imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60" },
        { restName: "Saravana Bhavan", name: "Special Tamil Meals", price: 180.00, category: "Main Course", isVeg: true, description: "Traditional lunch plate featuring rice, sambar, rasam, kootu, poriyal, appalam, and payasam.", imageUrl: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&auto=format&fit=crop&q=60" },
        
        // Anjappar Chettinad
        { restName: "Anjappar Chettinad Restaurant", name: "Chettinad Pepper Chicken", price: 220.00, category: "Starters", isVeg: false, description: "Spicy dry chicken tossed in fresh ground black pepper and Chettinad spices.", imageUrl: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=60" },
        { restName: "Anjappar Chettinad Restaurant", name: "Mutton Chukka", price: 290.00, category: "Starters", isVeg: false, description: "Tender mutton pieces pan-fried with red chillies, garlic, and curry leaves.", imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60" },
        { restName: "Anjappar Chettinad Restaurant", name: "Chettinad Egg Masala", price: 140.00, category: "Main Course", isVeg: false, description: "Boiled eggs cooked in a thick, fragrant gravy of coconut, poppy seeds, and fennel.", imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60" },
        
        // Dindigul Thalappakatti
        { restName: "Dindigul Thalappakatti", name: "Thalappakatti Chicken Biryani", price: 260.00, category: "Main Course", isVeg: false, description: "Signature biryani made with short-grain Seeraga Samba rice and tender chicken pieces.", imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60" },
        { restName: "Dindigul Thalappakatti", name: "Thalappakatti Mutton Biryani", price: 340.00, category: "Main Course", isVeg: false, description: "Classic rich biryani made with Seeraga Samba rice and premium goat meat.", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60" },
        { restName: "Dindigul Thalappakatti", name: "Spicy Chicken 65", price: 180.00, category: "Starters", isVeg: false, description: "Crispy, deep-fried spicy chicken cubes marinated with yoghurt and ginger-garlic.", imageUrl: "https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=500&auto=format&fit=crop&q=60" },

        // Madurai Idli Shop
        { restName: "Madurai Idli Shop", name: "Madurai Mallipoo Idli (2 Pcs)", price: 50.00, category: "Breakfast", isVeg: true, description: "Super soft, fluffy steamed rice cakes made from hand-ground batter.", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60" },
        { restName: "Madurai Idli Shop", name: "Medu Vada (2 Pcs)", price: 60.00, category: "Starters", isVeg: true, description: "Crispy, savory lentil donut frothed with green chillies, black pepper, and curry leaves.", imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=60" },
        { restName: "Madurai Idli Shop", name: "Karupatti Sweet Halwa", price: 80.00, category: "Desserts", isVeg: true, description: "Traditional sweet made with palm jaggery, wheat, and pure ghee.", imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=60" }
    ];

    try {
        // Post Restaurants
        const restMap = {}; // mapping of name -> generated ID
        for (const rest of demoRestaurants) {
            const res = await fetch(`${API_BASE}/restaurants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rest)
            });
            const body = await res.json();
            if (body.success) {
                restMap[rest.name] = body.data.id;
            }
        }

        // Post Foods mapping to the correct restaurant ID
        for (const food of demoFoods) {
            const mappedId = restMap[food.restName];
            if (mappedId) {
                const payload = {
                    restaurantId: mappedId,
                    name: food.name,
                    price: food.price,
                    category: food.category,
                    isVeg: food.isVeg,
                    isAvailable: true,
                    description: food.description,
                    imageUrl: food.imageUrl
                };
                await fetch(`${API_BASE}/foods`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
        }

        showToast('Database seeded with Tamil Nadu menus!', 'success');
        loadRestaurants();
    } catch (e) {
        showToast('Failed to seed records: connection failed', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Seed Demo Data
        `;
    }
}

/* ==========================================
   TOAST NOTIFICATION COMPONENT
   ========================================== */
function showToast(message, type = 'primary') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon based on type
    let icon = `
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px;height:20px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    `;
    if (type === 'success') {
        icon = `
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px;height:20px;color:var(--accent);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        `;
    } else if (type === 'error') {
        icon = `
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px;height:20px;color:var(--danger)">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        `;
    } else if (type === 'warning') {
        icon = `
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px;height:20px;color:var(--warning)">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        `;
    }
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Automatically remove toast after 3.5 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s reverse ease forwards';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3500);
}

/* ==========================================
   DEBOUNCE UTILITY
   ========================================== */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
