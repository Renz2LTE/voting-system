/* js/features/admin_users.js */
import { db, auth } from "../firebase-config.js";

// Correct Import: Auth functions from firebase-auth
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js"; 

// Correct Import: Firestore functions from firebase-firestore
import { 
    collection, getDocs, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let usersCache = [];

export async function initUserManagement() {
    console.log("Initializing User Management...");
    
    // Load Users
    await loadUsers();

    // Setup Search
    const searchInput = document.getElementById('userSearchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterUsers(e.target.value);
        });
    }

    // Setup Modal Close
    const closeBtn = document.getElementById('closeEditModal');
    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('editUserModal').classList.remove('active');
            document.getElementById('editUserModal').classList.add('hidden');
        });
    }

    // Setup Save Form
    const editForm = document.getElementById('editUserForm');
    if(editForm) {
        editForm.addEventListener('submit', handleSaveChanges);
    }

    // Setup Password Reset
    const resetBtn = document.getElementById('btnResetPassword');
    if(resetBtn) {
        resetBtn.addEventListener('click', handlePasswordReset);
    }
}

async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if(!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    try {
        const snapshot = await getDocs(collection(db, "users"));
        usersCache = [];
        
        snapshot.forEach(doc => {
            usersCache.push({ uid: doc.id, ...doc.data() });
        });

        renderTable(usersCache);

    } catch (error) {
        console.error("Error loading users:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error loading users.</td></tr>';
    }
}

function renderTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '';

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No users found.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #eee";

        const hasVotedBadge = user.hasVoted 
            ? `<span style="color:green; background:#e6fffa; padding:2px 8px; border-radius:10px; font-size:11px;">Voted</span>` 
            : `<span style="color:#666; background:#eee; padding:2px 8px; border-radius:10px; font-size:11px;">Not Voted</span>`;

        const roleBadge = user.role === 'admin' 
            ? `<span style="color:purple; font-weight:bold;">(Admin)</span>` 
            : ``;

        row.innerHTML = `
            <td style="padding: 12px;"><strong>${user.first_name} ${user.last_name}</strong> ${roleBadge}</td>
            <td style="padding: 12px;">${user.student_id || 'N/A'}</td>
            <td style="padding: 12px;">${user.strand || '-'} - ${user.year_level || '-'}</td>
            <td style="padding: 12px;">${hasVotedBadge}</td>
            <td style="padding: 12px; text-align: right;">
                <button class="btn-edit-user" data-uid="${user.uid}" style="background: white; border: 1px solid #ddd; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Attach Edit Listeners
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.uid));
    });
}

function filterUsers(query) {
    const lowerQ = query.toLowerCase();
    const filtered = usersCache.filter(u => 
        (u.first_name + ' ' + u.last_name).toLowerCase().includes(lowerQ) || 
        (u.student_id && u.student_id.toLowerCase().includes(lowerQ))
    );
    renderTable(filtered);
}

function openEditModal(uid) {
    const user = usersCache.find(u => u.uid === uid);
    if (!user) return;

    document.getElementById('edit_uid').value = user.uid;
    document.getElementById('edit_fname').value = user.first_name || '';
    document.getElementById('edit_lname').value = user.last_name || '';
    document.getElementById('edit_sid').value = user.student_id || '';

    // Show Modal
    const modal = document.getElementById('editUserModal');
    modal.classList.remove('hidden');
    modal.classList.add('active');
}

async function handleSaveChanges(e) {
    e.preventDefault();
    const uid = document.getElementById('edit_uid').value;
    const fname = document.getElementById('edit_fname').value;
    const lname = document.getElementById('edit_lname').value;
    const sid = document.getElementById('edit_sid').value;

    try {
        await updateDoc(doc(db, "users", uid), {
            first_name: fname,
            last_name: lname,
            student_id: sid
        });

        alert("User details updated!");
        document.getElementById('editUserModal').classList.remove('active');
        document.getElementById('editUserModal').classList.add('hidden');
        loadUsers(); // Refresh table
    } catch (error) {
        console.error("Update failed:", error);
        alert("Failed to update user.");
    }
}

async function handlePasswordReset() {
    const uid = document.getElementById('edit_uid').value;
    const user = usersCache.find(u => u.uid === uid);
    
    if(!confirm(`Send a password reset email to ${user.email}?`)) return;

    try {
        await sendPasswordResetEmail(auth, user.email);
        alert(`Reset link sent to ${user.email}`);
    } catch (error) {
        console.error("Reset failed:", error);
        alert("Could not send reset email: " + error.message);
    }
}