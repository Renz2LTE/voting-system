/* js/user_dashboard.js */
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js"; 

// --- IMPORT FEATURES ---
import { initApplicationFeature } from "./features/application.js";
import { initVotingFeature } from "./features/voting.js";
import { initOrganizationFeature } from "./features/organization.js";
import { initNotificationFeature } from "./features/notifications.js"; 
import { initUserTimeline } from "./features/timeline.js";
import { initPublicOrgsFeature } from "./features/public_orgs.js"; // <--- NEW IMPORT

// --- GLOBAL VARIABLES ---
let currentUser = null;

// --- 1. INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log("User Logged In:", user.uid);

        // Load Basic Profile
        await loadUserProfile(user.uid);
        
        // --- INITIALIZE ALL FEATURES ---
        try { if(typeof initApplicationFeature === 'function') initApplicationFeature(); } catch(e) { console.error("App Err", e); }
        try { if(typeof initVotingFeature === 'function') initVotingFeature(); } catch(e) { console.error("Vote Err", e); }
        try { if(typeof initOrganizationFeature === 'function') initOrganizationFeature(); } catch(e) { console.error("MyOrg Err", e); }
        try { if(typeof initNotificationFeature === 'function') initNotificationFeature(); } catch(e) { console.error("Notif Err", e); }
        try { if(typeof initUserTimeline === 'function') initUserTimeline(); } catch(e) { console.error("Timeline Err", e); }
        try { if(typeof initPublicOrgsFeature === 'function') initPublicOrgsFeature(); } catch(e) { console.error("PublicOrg Err", e); } // <--- NEW CALL
        
        // Render Date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-US', options);
        renderCalendar();

    } else {
        window.location.href = "index.html";
    }
});

// --- 2. NAVIGATION LOGIC ---
const views = {
    dashboard: document.getElementById('view-dashboard'),
    application: document.getElementById('view-application'),
    vote: document.getElementById('view-vote'),
    guidelines: document.getElementById('view-guidelines'),
    settings: document.getElementById('view-settings'),
    org: document.getElementById('view-org'),
    allOrgs: document.getElementById('view-all-orgs') // <--- NEW VIEW
};

const navLinks = {
    dashboard: document.getElementById('nav-dashboard'),
    application: document.getElementById('nav-application'),
    vote: document.getElementById('nav-vote'),
    guidelines: document.getElementById('nav-guidelines'),
    settings: document.getElementById('menu-settings'),
    org: document.getElementById('nav-org'),
    allOrgs: document.getElementById('nav-all-orgs') // <--- NEW LINK
};

function switchView(viewName) {
    Object.values(views).forEach(el => { if(el) el.classList.add('hidden'); });
    Object.values(navLinks).forEach(el => { if(el) el.classList.remove('active'); });

    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
        
        const titles = {
            dashboard: "Dashboard",
            application: "Candidacy Filing",
            vote: "Official Ballot",
            guidelines: "Guidelines",
            settings: "Settings",
            org: "My Organization",
            allOrgs: "Student Organizations" // <--- NEW TITLE
        };
        document.getElementById('pageTitle').textContent = titles[viewName];
    }

    if (navLinks[viewName] && viewName !== 'settings') {
        navLinks[viewName].classList.add('active');
    }
}

// Attach Click Events
if(navLinks.dashboard) navLinks.dashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
if(navLinks.application) navLinks.application.addEventListener('click', (e) => { e.preventDefault(); switchView('application'); });
if(navLinks.vote) navLinks.vote.addEventListener('click', (e) => { e.preventDefault(); switchView('vote'); });
if(navLinks.guidelines) navLinks.guidelines.addEventListener('click', (e) => { e.preventDefault(); switchView('guidelines'); });
if(navLinks.settings) navLinks.settings.addEventListener('click', (e) => { e.preventDefault(); switchView('settings'); });
if(navLinks.org) navLinks.org.addEventListener('click', (e) => { e.preventDefault(); switchView('org'); });
if(navLinks.allOrgs) navLinks.allOrgs.addEventListener('click', (e) => { e.preventDefault(); switchView('allOrgs'); }); // <--- NEW LISTENER

const btnVote = document.getElementById('btnGoToVote');
if(btnVote) btnVote.addEventListener('click', () => switchView('vote'));

// --- 3. PROFILE & HEADER ---
async function loadUserProfile(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('sideName').textContent = data.first_name;
            document.getElementById('topName').textContent = data.first_name;
            document.getElementById('welcomeMessage').textContent = `Hello, ${data.first_name}!`;
            document.getElementById('profileNameDisplay').textContent = `${data.first_name} ${data.last_name}`;

            fillInputs(data);
            
            if (data.role === 'admin') {
                const adminBtn = document.getElementById('menu-admin');
                if (adminBtn) adminBtn.classList.remove('hidden');
            }
        }
    } catch (error) { console.error("Error loading profile:", error); }
}

function fillInputs(data) {
    const map = {
        'p_firstname': 'first_name', 'p_lastname': 'last_name', 'p_studentid': 'student_id',
        'p_birthday': 'birthday', 'p_phone': 'phone', 'p_email': 'email',
        'p_strand': 'strand', 'p_address': 'address'
    };
    for (const [id, field] of Object.entries(map)) {
        const el = document.getElementById(id);
        if(el) el.value = data[field] || '';
    }
}

// Dropdown & Logout
const dropdownTrigger = document.getElementById('userDropdownTrigger');
const dropdownMenu = document.getElementById('dropdownMenu');
if(dropdownTrigger) {
    dropdownTrigger.addEventListener('click', () => {
        dropdownMenu.classList.toggle('hidden');
        dropdownMenu.classList.toggle('show');
    });
}
document.getElementById('menu-logout').addEventListener('click', () => {
    if(confirm("Are you sure you want to log out?")) {
        signOut(auth).then(() => window.location.href = "index.html");
    }
});

// --- 4. CALENDAR HELPER ---
function renderCalendar() {
    const date = new Date();
    document.getElementById('calMonthYear').textContent = date.toLocaleString('default', { month: 'long' });
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;

    grid.innerHTML = "";
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    for(let i=0; i<firstDay; i++) grid.innerHTML += `<div></div>`;
    for(let i=1; i<=daysInMonth; i++) {
        const isToday = i === date.getDate() ? "today" : "";
        grid.innerHTML += `<div class="cal-day ${isToday}">${i}</div>`;
    }
}