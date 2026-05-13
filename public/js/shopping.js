// ============================================================
//  SHAD Portal — Shopping
//  Handles: add items, check off items, pending count
// ============================================================


// ── SHOPPING DATA ─────────────────────────────────────────
// Existing items on the list.
// When you connect Firebase this will come from the database.

let shoppingItems = [
    { id: 1, name: 'Bandages',          description: 'Restock first aid kits',        store: 'Costco',       priority: false, purchased: false },
    { id: 2, name: 'Markers',           description: 'Activity supplies for workshop', store: 'Dollar Store', priority: false, purchased: false },
    { id: 3, name: 'Electrolyte Drinks',description: 'Wellness support',               store: 'Grocery',      priority: true,  purchased: false },
    { id: 4, name: 'Printer Paper',     description: 'Office supplies',                store: 'Staples',      priority: false, purchased: false },
];

let nextItemId = 5;


// ── ON PAGE LOAD ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

    renderShoppingList();
    setupAddItemForm();

});


// ── RENDER LIST ───────────────────────────────────────────

function renderShoppingList() {

    const listCard = document.querySelector('.list-card');

    // Keep the heading, remove old rows
    const oldRows = listCard.querySelectorAll('.item-row');
    oldRows.forEach(function(row) { row.remove(); });

    // Update pending count badge
    const pending = shoppingItems.filter(function(i) { return !i.purchased; }).length;
    const badge = listCard.querySelector('.card-head span');
    badge.textContent = pending + ' Items Pending';

    // Rebuild rows
    shoppingItems.forEach(function(item) {

        const row = document.createElement('div');
        row.className = 'item-row';
        row.setAttribute('data-id', item.id);

        if (item.purchased) {
            row.style.opacity = '0.5';
        }

        row.innerHTML =
            '<label class="check-wrap">' +
                '<input type="checkbox" ' + (item.purchased ? 'checked' : '') + '>' +
                '<span class="custom-box"></span>' +
            '</label>' +
            '<div class="item-info">' +
                '<h4>' + item.name + (item.priority ? ' ⚡' : '') + '</h4>' +
                '<p>' + item.description + '</p>' +
            '</div>' +
            '<small>' + item.store + '</small>';

        // Checkbox toggle
        const checkbox = row.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
            togglePurchased(item.id);
        });

        listCard.appendChild(row);

    });

}


// ── TOGGLE PURCHASED ─────────────────────────────────────

function togglePurchased(id) {

    const item = shoppingItems.find(function(i) { return i.id === id; });
    if (!item) return;

    item.purchased = !item.purchased;
    renderShoppingList();

    const status = item.purchased ? 'marked as purchased' : 'moved back to pending';
    showMessage(item.name + ' ' + status + '.', 'success');

}


// ── ADD ITEM FORM ─────────────────────────────────────────

function setupAddItemForm() {

    const addBtn = document.querySelector('.form-card button');
    if (!addBtn) return;

    addBtn.addEventListener('click', function() {

        const nameInput     = document.querySelector('.form-card input[type="text"]');
        const storeSelect   = document.querySelector('.form-card select');
        const descTextarea  = document.querySelector('.form-card textarea');
        const priorityCheck = document.querySelector('.priority-check input[type="checkbox"]');

        const name        = nameInput.value.trim();
        const store       = storeSelect.value;
        const description = descTextarea.value.trim();
        const priority    = priorityCheck.checked;

        if (!name) {
            showMessage('Please enter an item name.', 'error');
            return;
        }

        if (store === 'Select Store') {
            showMessage('Please select a store.', 'error');
            return;
        }

        const newItem = {
            id: nextItemId++,
            name: name,
            description: description || 'No description provided.',
            store: store,
            priority: priority,
            purchased: false
        };

        shoppingItems.push(newItem);
        renderShoppingList();

        // Clear the form
        nameInput.value       = '';
        storeSelect.value     = 'Select Store';
        descTextarea.value    = '';
        priorityCheck.checked = false;

        showMessage(name + ' added to the list!', 'success');

    });

}


// ── HELPERS ───────────────────────────────────────────────

function showMessage(text, type) {

    const existing = document.querySelector('.js-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.className = 'js-message';
    msg.textContent = text;

    msg.style.cssText =
        'position:fixed; bottom:30px; left:50%; transform:translateX(-50%);' +
        'padding:14px 28px; border-radius:14px; font-weight:700; font-size:15px;' +
        'font-family:Montserrat,sans-serif; z-index:9999; transition:opacity 0.4s;' +
        (type === 'success'
            ? 'background:#8bc53f; color:white;'
            : 'background:#d12c2c; color:white;');

    document.body.appendChild(msg);

    setTimeout(function() {
        msg.style.opacity = '0';
        setTimeout(function() { msg.remove(); }, 400);
    }, 2500);

}
