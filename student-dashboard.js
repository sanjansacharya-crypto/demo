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

    // Update Header Text
    const titles = {
        catalogue: ['Lab Catalogue', 'View and request laboratory equipment.'],
        requests: ['My Status', 'Check the status of your borrow requests.']
    };

    if (titles[view]) {
        viewTitle.textContent = titles[view][0];
        viewSubtitle.textContent = titles[view][1];
    }

    renderCurrentView();
}

// Data Fetching
async function refreshAllData() {
    try {
        // Fetch Inventory
        const { data: inv, error: invErr } = await supabase.from('inventory').select('*').order('name');
        if (invErr) throw invErr;

        // Generate Signed URLs for private images
        const paths = inv.filter(i => i.image_url && !i.image_url.startsWith('http')).map(i => i.image_url);
        
        if (paths.length > 0) {
            const { data: signedData, error: signedErr } = await supabase.storage
                .from('app-files')
                .createSignedUrls(paths, 3600); // 1 hour expiry
            
            if (!signedErr) {
                inv.forEach(item => {
                    const match = signedData.find(s => s.path === item.image_url);
                    if (match) item.display_url = match.signedUrl;
                });
            }
        }

        inventoryData = inv;

        // Fetch Requests JUST for this student
        const { data: req, error: reqErr } = await supabase.from('requests')
            .select('*, inventory(name)')
            .eq('student_name', auth.currentUser.email)
            .order('created_at', { ascending: false });
            
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
                ${(item.display_url || item.image_url) ? `<img src="${item.display_url || item.image_url}" alt="${item.name}">` : `<span style="font-size: 3rem; opacity: 0.2;">🧬</span>`}
                <span class="card-badge">${item.available_quantity > 0 ? 'INSTOCK' : 'OUT OF STOCK'}</span>
                
                <button class="card-delete-btn" onclick="openBorrowModal('${item.id}')" title="Request to Borrow" style="color: white; border-color: rgba(255,255,255,0.4); background: rgba(0,0,0,0.4);">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 12 12 16 14"></polyline></svg>
                </button>
            </div>
            <div class="card-content">
                <h3 style="margin-bottom: 4px;">${item.name}</h3>
                <p style="font-size: 0.8rem; height: 3em; overflow: hidden; margin-bottom: 12px;">${item.description || 'No description available.'}</p>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 8px; color: var(--text-muted);">
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
    if (!requestsData.length) {
        requestsList.innerHTML = '<div class="empty-state">No requests sent yet.</div>';
        return;
    }

    requestsList.innerHTML = requestsData.map(req => `
        <div class="request-row">
            <div>${req.inventory?.name || 'Unknown'}</div>
            <div class="accent-text">${req.quantity}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${req.purpose}</div>
            <div style="font-weight:600; text-transform:uppercase;" class="${req.status === 'accepted' ? 'accent-text' : (req.status==='rejected' ? 'error-message' : '')}">${req.status}</div>
        </div>
    `).join('');
}

// Modal Form Logic
window.openBorrowModal = (id) => {
    document.getElementById('borrow-comp-id').value = id;
    document.getElementById('request-modal').classList.add('active');
};
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('request-modal').classList.remove('active');
});

document.getElementById('borrow-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-borrow-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const id = document.getElementById('borrow-comp-id').value;
        const qty = parseInt(document.getElementById('borrow-qty').value);
        const purpose = document.getElementById('borrow-purpose').value;
        
        const { error } = await supabase.from('requests').insert([{
            inventory_id: id,
            quantity: qty,
            purpose: purpose,
            student_name: auth.currentUser.email
        }]);
        
        if(error) throw error;
        
        document.getElementById('borrow-form').reset();
        document.getElementById('request-modal').classList.remove('active');
        
        await refreshAllData();
        switchView('requests');
    } catch(err) {
        alert("Error requesting item: " + err.message);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
});
