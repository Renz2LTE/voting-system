/* js/features/admin_users.js */
import { db } from "../firebase-config.js";
import { 
    collection, getDocs, doc, setDoc, deleteDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { 
    sendPasswordResetEmail, getAuth, createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let usersCache = [];

export async function initUserManagement() {
    console.log("Initializing User Management...");
    await loadUsers();
    
    // --- SEARCH SETUP ---
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        newSearch.addEventListener('input', (e) => filterUsers(e.target.value));
    }

    // --- ADD ADMIN SETUP ---
    const btnAddAdmin = document.getElementById('btnAddAdmin');
    const modalAddAdmin = document.getElementById('addAdminModal');
    const btnCloseModal = document.getElementById('closeAddAdminModal');
    const formAddAdmin = document.getElementById('addAdminForm');

    if (btnAddAdmin && modalAddAdmin) {
        // Clone button to remove old listeners
        const newBtnAddAdmin = btnAddAdmin.cloneNode(true);
        btnAddAdmin.parentNode.replaceChild(newBtnAddAdmin, btnAddAdmin);
        
        newBtnAddAdmin.addEventListener('click', () => {
            modalAddAdmin.classList.remove('hidden');
            modalAddAdmin.classList.add('active');
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            modalAddAdmin.classList.remove('active');
            modalAddAdmin.classList.add('hidden');
        });
    }

    if (formAddAdmin) {
        const newForm = formAddAdmin.cloneNode(true);
        formAddAdmin.parentNode.replaceChild(newForm, formAddAdmin);
        newForm.addEventListener('submit', handleAddAdminSubmit);
    }
}

async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Loading users...</td></tr>';

    try {
        const q = query(collection(db, "users"), orderBy("last_name"));
        const snapshot = await getDocs(q);
        
        usersCache = [];
        snapshot.forEach(doc => {
            usersCache.push({ id: doc.id, ...doc.data() });
        });

        renderTable(usersCache);
    } catch (error) {
        console.error("Error loading users:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error loading data.</td></tr>';
    }
}

function renderTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = "";

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No users found.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #eee";
        
        let roleBadge = user.role === 'admin' 
            ? '<span style="background:#222; color:white; padding:2px 8px; border-radius:10px; font-size:10px;">ADMIN</span>' 
            : '<span style="background:#e3f2fd; color:#1565c0; padding:2px 8px; border-radius:10px; font-size:10px;">STUDENT</span>';

        const yearStrand = (user.year_level && user.strand) 
            ? `${user.year_level} - ${user.strand}` 
            : `<span style="color:#aaa; font-style:italic;">N/A (Admin)</span>`;

        row.innerHTML = `
            <td style="padding:12px;"><strong>${user.last_name}, ${user.first_name}</strong></td>
            <td style="padding:12px;">${user.student_id || "N/A"}</td>
            <td style="padding:12px; font-size:13px;">${yearStrand}</td>
            <td style="padding:12px;">${roleBadge}</td>
            <td style="padding:12px; text-align:right;">
                <button class="btn-reset-password" data-id="${user.id}" data-email="${user.email}" title="Reset Password"
                    style="border:1px solid #ffecb3; background:#fff8e1; padding:5px 10px; border-radius:5px; cursor:pointer; margin-right:5px;">
                    <i class="fa-solid fa-key" style="color:#f57f17;"></i>
                </button>
                <button class="btn-del-user" data-id="${user.id}" title="Delete User"
                    style="border:1px solid #ffcdd2; background:#ffebee; padding:5px 10px; border-radius:5px; cursor:pointer;">
                    <i class="fa-solid fa-trash" style="color:#c62828;"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.btn-reset-password').forEach(btn => {
        btn.addEventListener('click', () => handlePasswordReset(btn.dataset.id, btn.dataset.email));
    });
    document.querySelectorAll('.btn-del-user').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteUser(btn.dataset.id));
    });
}

function filterUsers(queryText) {
    const lower = queryText.toLowerCase();
    const filtered = usersCache.filter(u => 
        (u.first_name && u.first_name.toLowerCase().includes(lower)) ||
        (u.last_name && u.last_name.toLowerCase().includes(lower)) ||
        (u.student_id && u.student_id.toLowerCase().includes(lower))
    );
    renderTable(filtered);
}

// --- ADD ADMIN LOGIC ---
async function handleAddAdminSubmit(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = "Creating Account...";
    btn.disabled = true;

    const fname = document.getElementById('admin_fname').value.trim();
    const lname = document.getElementById('admin_lname').value.trim();
    const email = document.getElementById('admin_email').value.trim();
    const pass = document.getElementById('admin_password').value;

    try {
        const auth = getAuth();
        
        // 1. Create the new user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const newUser = userCredential.user;

        // 2. Save the Admin Profile to Firestore
        await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            first_name: fname,
            last_name: lname,
            email: email,
            role: 'admin',      // CRITICAL: Forces Admin privileges
            status: 'active',
            createdAt: new Date().toISOString()
        });

        // 3. Alert and Redirect (Because creating a user signs out the current session)
        alert(`Admin account for ${fname} created successfully!\n\nFor security reasons, you have been logged out. Please log in again.`);
        
        await auth.signOut();
        window.location.href = "index.html";

    } catch (error) {
        console.error("Error creating admin:", error);
        alert("Failed to create admin: " + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- PASSWORD RESET LOGIC ---
async function handlePasswordReset(uid, email) {
    if(!email || email === "undefined") return alert("User has no email address recorded.");
    
    if(confirm(`Send password reset email to ${email}?`)) {
        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, email);
            alert("Password reset email sent!");
        } catch(e) {
            console.error(e);
            alert("Failed to send reset email: " + e.message);
        }
    }
}

// --- DELETE LOGIC ---
async function handleDeleteUser(uid) {
    if(!confirm("Are you sure you want to delete this user? This will remove their data from the database.")) return;

    try {
        await deleteDoc(doc(db, "users", uid));
        alert("User data deleted.");
        loadUsers();
    } catch(err) {
        console.error(err);
        alert("Failed to delete user data.");
    }
}