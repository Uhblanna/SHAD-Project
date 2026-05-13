// ============================================================
//  SHAD Portal — Contact Staff
//  Handles: search staff cards by name or role
// ============================================================


// ── STAFF DATA ────────────────────────────────────────────
// When you connect Firebase this will come from the database.

const staffMembers = [
    { initial: 'S', name: 'Sarah Kim',  role: 'Program Assistant',  email: 'sarah.kim@email.com',  phone: '(555) 210-3391' },
    { initial: 'J', name: 'Jordan Lee', role: 'Program Director',   email: 'jordan.lee@email.com', phone: '(555) 221-8430' },
    { initial: 'A', name: 'Alex Chen',  role: 'Floater',            email: 'alex.chen@email.com',  phone: '(555) 902-1448' },
    { initial: 'P', name: 'Priya Das',  role: 'Operations Manager', email: 'priya.das@email.com',  phone: '(555) 410-1177' },
];


// ── ON PAGE LOAD ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

    setupSearch();

});


// ── SEARCH ────────────────────────────────────────────────

function setupSearch() {

    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {

        const query = searchInput.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.staff-card');

        cards.forEach(function(card) {

            const name = card.querySelector('h3').textContent.toLowerCase();
            const role = card.querySelector('.role').textContent.toLowerCase();

            if (query === '' || name.includes(query) || role.includes(query)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }

        });

    });

}
