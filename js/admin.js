/* js/admin.js */
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js"; 

// --- IMPORT FEATURES ---
import { initApplicationManagement } from "./features/admin_applications.js";
import { initUserManagement } from "./features/admin_users.js";

// --- 1. SECURITY & AUTHENTICATION CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Check if the user is actually an ADMIN
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                if (userData.role !== 'admin') {
                    // Not an admin? Kick them out.
                    alert("ACCESS DENIED: You are not an Administrator.");
                    window.location.href = "user_dashboard.html"; 
                } else {
                    // Access Granted: Initialize Admin Panel
                    document.getElementById('adminName').textContent = userData.first_name;
                    initAdminFeatures();
                }
            } else {
                console.error("User document not found.");
                window.location.href = "index.html";
            }
        } catch(e) {
            console.error("Auth verification error:", e);
        }
    } else {
        // Not logged in? Go to login page.
        window.location.href = "index.html";
    }
});

// --- 2. INITIALIZE FEATURES ---
function initAdminFeatures() {
    console.log("Admin Features Initialized");
    
    setupNavigation();
    setupRegistrationToggle();
    
    // Load Application counts immediately (for the sidebar badge)
    initApplicationManagement(); 

    // Setup Logout Button
    document.getElementById('adminLogout').addEventListener('click', () => {
        if(confirm("Are you sure you want to log out of the Admin Panel?")) {
            signOut(auth).then(() => window.location.href = "index.html");
        }
    });
}

// --- 3. ELECTION CONTROL (TOGGLE REGISTRATION) ---
async function setupRegistrationToggle() {
    const toggle = document.getElementById('toggleRegistration');
    const msg = document.getElementById('controlStatusMsg');
    
    // Reference to the settings document in Firestore
    const settingsRef = doc(db, "settings", "election_controls");

    // A. Load Initial State
    try {
        const snap = await getDoc(settingsRef);
        
        if (snap.exists()) {
            const data = snap.data();
            toggle.checked = data.isRegistrationOpen === true;
            updateStatusText(toggle.checked);
        } else {
            // Document doesn't exist? Create it (Default to Closed)
            await setDoc(settingsRef, { isRegistrationOpen: false });
            toggle.checked = false;
            updateStatusText(false);
        }
    } catch (e) {
        console.error("Error loading settings:", e);
        msg.textContent = "Error connecting to database.";
    }

    // B. Listen for Switch Changes
    toggle.addEventListener('change', async (e) => {
        const newState = e.target.checked;
        updateStatusText(newState);
        
        try {
            await updateDoc(settingsRef, { isRegistrationOpen: newState });
            console.log("Registration status updated:", newState);
        } catch (error) {
            console.error("Error updating toggle:", error);
            alert("Failed to save setting. Check console.");
            e.target.checked = !newState; // Revert UI if failed
        }
    });

    // Helper to update text color/message
    function updateStatusText(isOpen) {
        if(isOpen) {
            msg.textContent = "Status: Registration is OPEN (Tab Visible)";
            msg.style.color = "#0099ff"; // Blue
        } else {
            msg.textContent = "Status: Registration is CLOSED (Tab Hidden)";
            msg.style.color = "#d32f2f"; // Red
        }
    }
}

// --- 4. NAVIGATION SYSTEM ---
function setupNavigation() {
    // Map of Views (Content Areas)
    const views = {
        overview: document.getElementById('view-overview'),
        applications: document.getElementById('view-applications'),
        users: document.getElementById('view-users'),
        settings: document.getElementById('view-settings')
    };
    
    // Map of Sidebar Links
    const navs = {
        overview: document.getElementById('nav-overview'),
        applications: document.getElementById('nav-applications'),
        users: document.getElementById('nav-users'),
        settings: document.getElementById('nav-settings')
    };

    // Loop through all nav items to attach click listeners
    Object.keys(navs).forEach(key => {
        if (!navs[key]) return; // Skip if element not found

        navs[key].addEventListener('click', (e) => {
            e.preventDefault();
            
            // 1. Hide ALL views
            Object.values(views).forEach(v => v.classList.add('hidden'));
            
            // 2. Deactivate ALL nav links
            Object.values(navs).forEach(n => n.classList.remove('active'));

            // 3. Show SELECTED view
            if (views[key]) views[key].classList.remove('hidden');
            
            // 4. Activate SELECTED nav link
            navs[key].classList.add('active');

            // 5. Update Header Title
            document.getElementById('pageTitle').textContent = 
                key.charAt(0).toUpperCase() + key.slice(1).replace('-', ' ');

            // 6. TRIGGER FEATURE LOADS
            // We reload data when the tab is clicked to ensure it's fresh
            if(key === 'applications') {
                initApplicationManagement();
            }
            if(key === 'users') {
                initUserManagement();
            }
        });
    });
}