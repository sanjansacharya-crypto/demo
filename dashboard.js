import { supabase } from './src/supabaseClient.js';
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";

// Firebase Config (Re-using from index.html)
const firebaseConfig = {
    apiKey: "AIzaSyC_EQleUr1_SnXGU7LFoBWPgw14cCop1Ng",
    authDomain: "login-35e23.firebaseapp.com",
    projectId: "login-35e23",
    storageBucket: "login-35e23.firebasestorage.app",
    messagingSenderId: "662226193773",
    appId: "1:662226193773:web:1f8303cf97c5c194c21e64"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// State Management
let currentView = 'catalogue';
let inventoryData = [];
let requestsData = [];

// DOM Elements
const viewSections = document.querySelectorAll('.view-section');
const navItems = document.querySelectorAll('.nav-item[data-view]');
const viewTitle = document.getElementById('view-title');
const viewSubtitle = document.getElementById('view-subtitle');
const inventoryList = document.getElementById('inventory-list');
const requestsList = document.getElementById('requests-list');
const alertsList = document.getElementById('alerts-list');
const defaultersList = document.getElementById('defaulters-list');
const borrowingsList = document.getElementById('borrowings-list');

const catalogueToggle = document.getElementById('catalogue-toggle');
const subViews = document.querySelectorAll('.sub-view');

const addItemForm = document.getElementById('add-item-form');
const logoutBtn = document.getElementById('logout-btn');

// Authentication Check
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        console.log("Authenticated as:", user.email);
        initDashboard();
    }
});

// Initialization
async function initDashboard() {
    setupEventListeners();
    
    // Ensure storage bucket exists
    try {
        const { data, error } = await supabase.storage.createBucket('inventory-images', {
            public: true,
            fileSizeLimit: 1024 * 1024 * 2, // 2MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg']
        });
    } catch (err) {
        // Bucket might already exist
        console.log("Bucket check completed");
    }

    await refreshAllData();
}

function setupEventListeners() {
    // Nav Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // Catalogue Sub-view Toggle
    if (catalogueToggle) {
        catalogueToggle.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const subView = btn.getAttribute('data-subview');
                switchSubView(subView);
            });
        });
    }

    // Form Submission
    addItemForm.addEventListener('submit', handleAddItem);

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
}

// View Management
function switchView(view) {
    currentView = view;
    
    // Update UI
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === view);
    });

    viewSections.forEach(section => {
        section.classList.toggle('active', section.id === `view-${view}`);
    });

    // Reset to list view when entering catalogue
    if (view === 'catalogue') {
        switchSubView('list');
    }

    // Update Header Text
    const titles = {
        catalogue: ['Lab Catalogue', 'Manage and track laboratory equipment in real-time.'],
        requests: ['Student Requests', 'Approve or reject equipment borrowing requests.'],
        alerts: ['Stock Alerts', 'Monitor low and out-of-stock components.'],
        tracking: ['Return Tracking', 'Track active borrowings and manage defaulters.']
    };

    viewTitle.textContent = titles[view][0];
    viewSubtitle.textContent = titles[view][1];

    renderCurrentView();
}

function switchSubView(subView) {
    // Update Toggle Buttons
    catalogueToggle.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-subview') === subView);
    });

    // Update Sub-views
    subViews.forEach(view => {
        view.classList.toggle('active', view.id === `subview-${subView}`);
    });
}

// Data Fetching
async function refreshAllData() {
    try {
        // Fetch Inventory
        const { data: inv, error: invErr } = await supabase.from('inventory').select('*').order('name');
        if (invErr) throw invErr;
        inventoryData = inv;

        // Fetch Requests
        const { data: req, error: reqErr } = await supabase.from('requests').select('*, inventory(name)').order('created_at', { ascending: false });
        if (reqErr) throw reqErr;
        requestsData = req;

        renderCurrentView();
    } catch (err) {
        console.error("Error refreshing data:", err);
    }
}

// Rendering Logic
function renderCurrentView() {
    switch (currentView) {
        case 'catalogue': renderCatalogue(inventoryData, inventoryList); break;
        case 'requests': renderRequests(); break;
        case 'alerts': renderCatalogue(inventoryData.filter(i => i.available_quantity < 5), alertsList); break;
        case 'tracking': renderTracking(); break;
    }
}

function renderCatalogue(data, container) {
    if (!data.length) {
        container.innerHTML = '<div class="empty-state">No items found.</div>';
        return;
    }

    container.innerHTML = data.map(item => `
        <div class="inventory-card">
            <div class="card-image">
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : `<span style="font-size: 3rem; opacity: 0.2;">🧬</span>`}
                <span class="card-badge">${item.available_quantity > 0 ? 'INSTOCK' : 'OUT OF STOCK'}</span>
            </div>
            <div class="card-content">
                <h3 style="margin-bottom: 4px;">${item.name}</h3>
                <p style="font-size: 0.8rem; height: 3em; overflow: hidden; margin-bottom: 12px;">${item.description || 'No description available.'}</p>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 8px; color: var(--accent-light);">
                    <span>Min Borrow</span>
                    <span>${item.min_borrow_quantity || 1} units</span>
                </div>

                <div class="stock-indicator">
                    <span>Availability</span>
                    <span class="accent-text">${item.available_quantity} / ${item.total_quantity}</span>
                </div>
                <div class="stock-bar">
                    <div class="stock-progress" style="width: ${(item.available_quantity / item.total_quantity) * 100}%"></div>
                </div>
            </div>
        </div>
    `).join('');
}

async function renderRequests() {
    requestsList.innerHTML = requestsData.map(req => `
        <div class="request-row">
            <div style="font-weight: 600;">${req.student_name}</div>
            <div>${req.inventory?.name || 'Unknown'}</div>
            <div class="accent-text">${req.quantity}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${req.purpose}</div>
            <div class="action-btns">
                ${req.status === 'pending' ? `
                    <button class="btn-icon btn-accept" onclick="handleRequestAction('${req.id}', 'accepted')">✓</button>
                    <button class="btn-icon btn-reject" onclick="handleRequestAction('${req.id}', 'rejected')">✕</button>
                ` : `<span class="status-badge ${req.status}">${req.status.toUpperCase()}</span>`}
            </div>
        </div>
    `).join('');
}

function renderTracking() {
    // Simplified tracking for now
    borrowingsList.innerHTML = '<div class="empty-state">No active borrowings recorded.</div>';
    defaultersList.innerHTML = '<div class="empty-state">No defaulters found.</div>';
}

// Actions
async function handleAddItem(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-item');
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;

    try {
        const name = document.getElementById('comp-name').value;
        const total = parseInt(document.getElementById('comp-total').value);
        const minBorrow = parseInt(document.getElementById('comp-min-borrow').value);
        const desc = document.getElementById('comp-desc').value;
        const file = document.getElementById('comp-image').files[0];

        let imageUrl = null;

        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `items/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('inventory-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('inventory-images')
                .getPublicUrl(filePath);
            
            imageUrl = publicUrl;
        }

        // Insert Item
        const { data: newItem, error } = await supabase.from('inventory').insert([{
            name,
            total_quantity: total,
            available_quantity: total,
            min_borrow_quantity: minBorrow,
            description: desc,
            image_url: imageUrl
        }]).select().single();

        if (error) throw error;

        // Log the action (Audit)
        await supabase.from('audit_logs').insert([{
            table_name: 'inventory',
            record_id: newItem.id,
            action: 'CREATE',
            new_data: newItem,
            performed_by: auth.currentUser.email
        }]);

        addItemForm.reset();
        switchSubView('list');
        await refreshAllData();

    } catch (err) {
        alert("Error adding item: " + err.message);
    } finally {
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
    }
}

// Global scope expose for onclick
window.handleRequestAction = async (id, status) => {
    try {
        const { data: updatedReq, error } = await supabase.from('requests')
            .update({ status })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;

        // Log the action (Audit)
        await supabase.from('audit_logs').insert([{
            table_name: 'requests',
            record_id: id,
            action: `STATUS_CHANGE_${status.toUpperCase()}`,
            new_data: updatedReq,
            performed_by: auth.currentUser?.email || 'System'
        }]);

        await refreshAllData();
    } catch (err) {
        alert("Action failed: " + err.message);
    }
};
