const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');
let js = fs.readFileSync('dashboard.js', 'utf8');

// HTML Transformations
html = html.replace('<title>Faculty Dashboard', '<title>Student Dashboard');
html = html.replace('<h2>LAB DASH</h2>', '<h2>STUDENT DASH</h2>');

// Remove Stock Alerts and Tracking from Sidebar
html = html.replace(/<a class="nav-item" data-view="alerts">[\s\S]*?<\/a>/, '');
html = html.replace(/<a class="nav-item" data-view="tracking">[\s\S]*?<\/a>/, '');

// Rename Student Requests to My Status
html = html.replace('<span>Student Requests</span>', '<span>My Status</span>');

// Replace header actions toggle with nothing
html = html.replace(/<div class="toggle-group" id="catalogue-toggle">[\s\S]*?<\/div>/, '');

// Replace subview-add with nothing
html = html.replace(/<div id="subview-add" class="sub-view">[\s\S]*?<\/div>\s*<\/section>/, '</section>');
html = html.replace('<div id="subview-list" class="sub-view active">', ''); // Remove the nested list wrapper
html = html.replace('</div>\n                <!-- Sub-view: Add Item -->', ''); // Remove its closing 

// Update request table headers
html = html.replace(/<div class="request-row request-header">[\s\S]*?<\/div>/, `<div class="request-row request-header" style="grid-template-columns: 2fr 1fr 2fr 1fr;">
                        <div>Component</div>
                        <div>Qty</div>
                        <div>Purpose</div>
                        <div>Status</div>
                    </div>`);

// Remove Alerts and Tracking views
html = html.replace(/<section id="view-alerts" class="view-section">[\s\S]*?<\/section>/, '');
html = html.replace(/<section id="view-tracking" class="view-section">[\s\S]*?<\/section>/, '');

// Swap script import
html = html.replace('dashboard.js', 'student-dashboard.js');

// Add modal
html = html.replace('</body>', `
    <!-- Request Modal -->
    <div class="modal" id="request-modal">
        <div class="modal-content glass-card" style="width: 400px;">
            <button class="modal-close-btn" id="close-modal" style="position:absolute;top:20px;right:20px;background:none;border:none;color:white;cursor:pointer;font-size:18px;">✕</button>
            <h2 class="accent-text" style="margin-bottom: 24px;">Borrow Request</h2>
            <form id="borrow-form">
                <input type="hidden" id="borrow-comp-id">
                <div class="input-group">
                    <label>Quantity</label>
                    <input type="number" id="borrow-qty" required min="1" placeholder="1">
                </div>
                <div class="input-group">
                    <label>Purpose</label>
                    <input type="text" id="borrow-purpose" required placeholder="Reason for borrowing">
                </div>
                <div style="margin-top: 2rem;">
                    <button type="submit" class="submit-btn glitch-target" id="submit-borrow-btn">
                        <span class="btn-text">Submit Request</span>
                        <div class="spinner"></div>
                    </button>
                </div>
            </form>
        </div>
    </div>
</body>`);


// JS Transformations
js = js.replace(/const alertsList.*/, '');
js = js.replace(/const defaultersList.*/, '');
js = js.replace(/const borrowingsList.*/, '');
js = js.replace(/const catalogueToggle.*/, '');
js = js.replace(/const subViews.*/, '');
js = js.replace(/const addItemForm.*/, '');

js = js.replace('// Catalogue Sub-view Toggle', '');
js = js.replace(/if \(catalogueToggle\) \{[\s\S]*?\}/, '');
js = js.replace("addItemForm.addEventListener('submit', handleAddItem);", '');

// Strip faculty views
js = js.replace(/alerts: \['Stock Alerts'.*/, '');
js = js.replace(/tracking: \['Return Tracking'.*/, '');
js = js.replace(/case 'alerts':.*/, '');
js = js.replace(/case 'tracking':.*/, '');
js = js.replace("['Student Requests', 'Approve or reject equipment borrowing requests.']", "['My Status', 'Check the status of your borrow requests.']");

// Update request fetching to filter by user
js = js.replace(
    "const { data: req, error: reqErr } = await supabase.from('requests').select('*, inventory(name)').order('created_at', { ascending: false });", 
    "const { data: req, error: reqErr } = await supabase.from('requests').select('*, inventory(name)').eq('student_name', auth.currentUser.email).order('created_at', { ascending: false });"
);

// Update Request listing logic
js = js.replace(
    "grid-template-columns: 2fr 2fr 1fr 2fr 1.5fr;",
    "grid-template-columns: 2fr 1fr 2fr 1fr;"
);
js = js.replace(
    /<div class="action-btns">[\s\S]*?<\/div>\s*<\/div>/,
    `<div style="font-weight:600; text-transform:uppercase;" class="\${req.status === 'accepted' ? 'accent-text' : (req.status==='rejected' ? 'error-message' : '')}">\${req.status}</div>
        </div>`
);
js = js.replace(/<div style="font-weight: 600;">\$\{req\.student_name\}<\/div>/, "");

// Modify inventory cards
js = js.replace(/<button class="card-delete-btn"[\s\S]*?<\/button>/, `
                <button class="card-delete-btn" onclick="openBorrowModal('\${item.id}')" title="Request to Borrow" style="color: white; border-color: rgba(255,255,255,0.4); background: rgba(0,0,0,0.4);">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 12 12 16 14"></polyline></svg>
                </button>
`);

// Add modal logic
js += `
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
    }
});
`;

fs.writeFileSync('student-dashboard.html', html);
fs.writeFileSync('student-dashboard.js', js);
