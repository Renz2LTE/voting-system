/* js/admin.js */
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js"; 

// --- IMPORT FEATURES ---
import { initApplicationManagement } from "./features/admin_applications.js";
import { initUserManagement } from "./features/admin_users.js";
import { initAdminTimeline } from "./features/admin_timeline.js";
import { initReportsFeature } from "./features/admin_reports.js";
import { initAdminOrgs } from "./features/admin_orgs.js";
import { initAdminPartylists } from "./features/admin_partylists.js"; 
import { initResetFeature } from "./features/admin_reset.js";
import { initPositionManagement } from "./features/admin_positions.js"; 
import { initAdminAnalytics } from "./features/admin_analytics.js"; 
import { initAdminElection } from "./features/admin_election.js"; 

console.log("Admin script loaded. Waiting for Auth...");

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.role === 'admin') {
                    console.log("Admin Access Granted.");
                    const nameEl = document.getElementById('adminName');
                    if (nameEl) nameEl.textContent = userData.first_name;
                    initAdminFeatures();
                } else { 
                    alert("Access Denied: You are not an Admin.");
                    window.location.href = "user_dashboard.html"; 
                }
            }
        } catch(e) { console.error("Error fetching admin profile:", e); }
    } else { window.location.href = "index.html"; }
});

function initAdminFeatures() {
    setupNavigation();
    setupRegistrationToggle();
    setupMobileMenu(); // NEW
    initApplicationManagement(); 
    setupBroadcastForm(); 
    if(typeof initAdminAnalytics === 'function') initAdminAnalytics();

    const logoutBtn = document.getElementById('adminLogout');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const modal = document.getElementById('logoutModal');
            if(modal) { modal.classList.remove('hidden'); modal.classList.add('active'); }
        });
    }
    
    document.getElementById('cancelLogout').addEventListener('click', () => {
        document.getElementById('logoutModal').classList.remove('active');
        document.getElementById('logoutModal').classList.add('hidden');
    });
    
    document.getElementById('confirmLogout').addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "index.html");
    });
}

// NEW FUNCTION: Mobile Sidebar Toggle
function setupMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if(hamburgerBtn && sidebar && overlay) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

function setupBroadcastForm() {
    const form = document.getElementById('broadcastForm');
    if(form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "notifications"), {
                title: document.getElementById('broadcastTitle').value, 
                message: document.getElementById('broadcastMsg').value, 
                type: "global", timestamp: new Date().toISOString(), readBy: []
            });
            alert("Broadcast sent!");
            form.reset();
        } catch (error) { alert("Failed to send."); }
    });
}

async function setupRegistrationToggle() {
    const toggle = document.getElementById('toggleRegistration');
    const msg = document.getElementById('controlStatusMsg');
    const ref = doc(db, "settings", "election_controls");
    try {
        const snap = await getDoc(ref);
        if(snap.exists()) {
            toggle.checked = snap.data().isRegistrationOpen;
            if(msg) msg.textContent = toggle.checked ? "Open" : "Closed";
        }
    } catch(e) {}

    if(toggle) toggle.addEventListener('change', async () => {
        const isOpen = toggle.checked;
        await setDoc(ref, { isRegistrationOpen: isOpen }, {merge:true});
        if(msg) msg.textContent = isOpen ? "Open" : "Closed";

        try {
            await addDoc(collection(db, "notifications"), {
                title: isOpen ? "📝 Candidacy Filing OPEN" : "🔒 Candidacy Filing CLOSED",
                message: isOpen ? "The window for filing candidacy is now officially open! Submit your applications via the dashboard." : "The window for filing candidacy has officially closed.",
                type: "global", timestamp: new Date().toISOString(), readBy: []
            });
        } catch(err) { console.error(err); }
    });
}

function setupNavigation() {
    const views = { 
        overview: 'view-overview', applications: 'view-applications', users: 'view-users', 
        orgs: 'view-orgs', partylists: 'view-partylists', positions: 'view-positions', 
        reports: 'view-reports', settings: 'view-settings'
    };
    
    const navs = { 
        overview: 'nav-overview', applications: 'nav-applications', users: 'nav-users', 
        orgs: 'nav-orgs', partylists: 'nav-partylists', positions: 'nav-positions', 
        reports: 'nav-reports', settings: 'nav-settings'
    };

    // ITEM 3 FIX: Admin Dynamic Headers
    const headerTitles = {
        overview: { title: "Overview", sub: "Admin Control Center" },
        applications: { title: "Applications", sub: "Review Candidate Filings" },
        users: { title: "User Management", sub: "Manage Registered Students" },
        orgs: { title: "Organizations", sub: "Councils & Clubs Editor" },
        partylists: { title: "Partylists", sub: "Political Parties Approval" },
        positions: { title: "Positions", sub: "Ballot Structure Config" },
        reports: { title: "Reports & Audit", sub: "Official Election Results" },
        settings: { title: "Election Control", sub: "Timeline & Master Settings" }
    };

    Object.keys(navs).forEach(key => {
        const link = document.getElementById(navs[key]);
        if (!link) return; 
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            Object.values(views).forEach(v => {
                const el = document.getElementById(v);
                if(el) el.classList.add('hidden');
            });
            Object.values(navs).forEach(n => {
                const el = document.getElementById(n);
                if(el) el.classList.remove('active');
            });

            const targetView = document.getElementById(views[key]);
        if(targetView) targetView.classList.remove('hidden');
        link.classList.add('active');
        
        // Update Dynamic Header
        const pageTitle = document.getElementById('pageTitle');
        const pageSub = document.querySelector('.header-left .text-muted');
        if(pageTitle && headerTitles[key]) pageTitle.textContent = headerTitles[key].title;
        if(pageSub && headerTitles[key]) pageSub.textContent = headerTitles[key].sub;

        // NEW: Close sidebar on mobile after clicking a link
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if(sidebar && overlay && window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }

        // Load specific logic
        if(key === 'applications') initApplicationManagement();
            if(key === 'users') initUserManagement();
            if(key === 'orgs') initAdminOrgs();
            if(key === 'partylists') { if(typeof initAdminPartylists === 'function') initAdminPartylists(); }
            if(key === 'positions') { if(typeof initPositionManagement === 'function') initPositionManagement(); }
            if(key === 'reports') initReportsFeature();
            if(key === 'settings') { initAdminTimeline(); initResetFeature(); if(typeof initAdminElection === 'function') initAdminElection(); }
        });
    });
}