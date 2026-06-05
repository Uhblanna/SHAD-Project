// Isabelle McLean — Shopping list backed by the database so all staff share one live list

document.addEventListener('DOMContentLoaded', function() {
    loadShoppingList();
    setupAddItemForm();
    document.getElementById("savePurchasedBtn").addEventListener("click", savePurchasedItems);
});

function loadShoppingList() {
    fetch('/api/shopping')
        .then(function(r) { return r.json(); })
        .then(function(items) { renderShoppingList(items); })
        .catch(function() {
            document.getElementById('shoppingList').innerHTML = "<p class='empty-list'>Could not load list. Please refresh.</p>";
        });
}

function renderShoppingList(items) {
    const listCard = document.getElementById('shoppingList');
    listCard.innerHTML = "";

    const pending = items.filter(function(i) { return !i.purchased; }).length;
    const badge = document.querySelector('.card-head span');
    badge.textContent = pending + ' Items Pending';

    if (items.length === 0) {
        listCard.innerHTML = "<p class='empty-list'>No shopping items added yet.</p>";
        return;
    }

    items.forEach(function(item) {
        const row = document.createElement('div');
        row.className = item.purchased ? 'item-row purchased' : 'item-row';
        row.setAttribute('data-id', item.id);
        if (item.purchased) row.style.opacity = '0.5';

        row.innerHTML =
            '<label class="check-wrap">' +
                '<input type="checkbox" ' + (item.purchased ? 'checked' : '') + '>' +
                '<span class="custom-box"></span>' +
            '</label>' +
            '<div class="item-info">' +
                '<h4>' + escH(item.name) + (item.priority ? ' ⚡' : '') + '</h4>' +
                (item.requested_by ? '<p style="font-size:12px; font-weight:700; color:#146ff8; margin-bottom:2px;">Requested by: ' + escH(item.requested_by) + '</p>' : '') +
                (item.reason ? '<p style="font-size:12px; font-weight:600; color:#888; margin-bottom:2px;">Reason: ' + escH(item.reason) + '</p>' : '') +
                (item.description ? '<p>' + escH(item.description) + '</p>' : '') +
            '</div>';

        const checkbox = row.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
            togglePurchased(item.id, checkbox.checked);
        });

        listCard.appendChild(row);
    });
}

function togglePurchased(id, purchased) {
    fetch('/api/shopping/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchased: purchased })
    })
    .then(function() { loadShoppingList(); })
    .catch(function() { showMessage('Could not update item. Please try again.', 'error'); });
}

function setupAddItemForm() {
    const addBtn = document.querySelector('.form-card button');
    if (!addBtn) return;

    addBtn.addEventListener('click', function() {
        const nameInput        = document.getElementById('itemNameInput');
        const requestedByInput = document.getElementById('requestedByInput');
        const reasonInput      = document.getElementById('reasonInput');
        const descTextarea     = document.getElementById('descriptionInput');
        const priorityCheck    = document.querySelector('.priority-check input[type="checkbox"]');

        const name        = nameInput.value.trim();
        const requestedBy = requestedByInput.value.trim();
        const reason      = reasonInput.value.trim();
        const description = descTextarea.value.trim();
        const priority    = priorityCheck.checked;

        if (!name) { showMessage('Please enter an item name.', 'error'); return; }
        if (!requestedBy) { showMessage('Please enter who is requesting this item.', 'error'); return; }

        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';

        fetch('/api/shopping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, requested_by: requestedBy, reason, description, priority })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.error) { showMessage(data.error, 'error'); return; }
            nameInput.value        = '';
            requestedByInput.value = '';
            reasonInput.value      = '';
            descTextarea.value     = '';
            priorityCheck.checked  = false;
            loadShoppingList();
            showMessage(name + ' added to the list!', 'success');
        })
        .catch(function() { showMessage('Could not add item. Please try again.', 'error'); })
        .finally(function() {
            addBtn.disabled = false;
            addBtn.textContent = 'Add To List';
        });
    });
}

function savePurchasedItems() {
    fetch('/api/shopping/purchased/all', { method: 'DELETE' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.cleared === 0) { showMessage('No checked items to remove.', 'error'); return; }
            loadShoppingList();
            showMessage(data.cleared + ' checked item(s) removed.', 'success');
        })
        .catch(function() { showMessage('Could not remove items. Please try again.', 'error'); });
}

function escH(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showMessage(text, type) {
    const existing = document.querySelector('.js-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.className = 'js-message';
    msg.textContent = text;
    msg.style.cssText =
        'position:fixed; bottom:30px; left:50%; transform:translateX(-50%);' +
        'padding:14px 28px; border-radius:14px; font-weight:700; font-size:15px;' +
        'font-family:Archivo,sans-serif; z-index:9999; transition:opacity 0.4s;' +
        (type === 'success' ? 'background:#8bc53f; color:white;' : 'background:#d12c2c; color:white;');

    document.body.appendChild(msg);
    setTimeout(function() {
        msg.style.opacity = '0';
        setTimeout(function() { msg.remove(); }, 400);
    }, 2500);
}
