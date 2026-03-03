/* js/features/application.js */
import { db, auth } from "../firebase-config.js";
import { doc, getDoc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let eligibility = { canApply: true, message: "" };

export async function initApplicationFeature() {
    try {
        const navItem = document.getElementById('nav-item-application');
        if(navItem) navItem.classList.remove('hidden');

        await checkUserEligibility();

        const navLink = document.getElementById('nav-application');
        if(navLink) {
            navLink.addEventListener('click', () => {
                if (!eligibility.canApply) alert(eligibility.message); 
            });
        }

        await loadFormDropdowns();

        const form = document.getElementById('candidacyForm');
        if(form) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            newForm.addEventListener('submit', handleApplicationSubmit);
            
            if (!eligibility.canApply) disableForm(newForm, eligibility.message);
        }

    } catch (error) { console.error("Error:", error); }
}

async function checkUserEligibility() {
    const user = auth.currentUser;
    if(!user) return;

    try {
        const appRef = doc(db, "applications", user.uid);
        const appSnap = await getDoc(appRef);
        
        if (appSnap.exists()) {
            const status = appSnap.data().status;
            if (status === 'Pending') { eligibility = { canApply: false, message: "You already have a pending application." }; return; }
            if (status === 'Approved') { eligibility = { canApply: false, message: "You are already an official candidate." }; return; }
        }

        const q = query(collection(db, "candidates"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) { eligibility = { canApply: false, message: "You are already registered as a candidate." }; return; }

        eligibility = { canApply: true, message: "" };
    } catch (e) { console.error("Eligibility Check Error:", e); }
}

function disableForm(form, msg) {
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) elements[i].disabled = true;
    const btn = form.querySelector('button');
    if(btn) { btn.textContent = msg; btn.style.background = "#999"; btn.style.cursor = "not-allowed"; }
}

async function loadFormDropdowns() {
    const orgSelect = document.getElementById('apply_org');
    const posSelect = document.getElementById('apply_position');
    const partySelect = document.getElementById('apply_partylist');
    
    if(!orgSelect || !posSelect || !partySelect) return;
    
    orgSelect.innerHTML = `<option value="" disabled selected>Select Target Organization</option>`;
    posSelect.innerHTML = `<option value="" disabled selected>Select Position</option>`;
    
    try {
        // Load Positions
        const pSnap = await getDocs(collection(db, "positions"));
        let positions = [];
        pSnap.forEach(d => positions.push(d.data()));
        if(positions.length > 0) {
            positions.sort((a,b) => (a.order||99) - (b.order||99));
            positions.forEach(p => posSelect.innerHTML += `<option value="${p.title}">${p.title}</option>`);
        } else {
            ["President", "Vice President", "Secretary", "Treasurer"].forEach(p => posSelect.innerHTML += `<option value="${p}">${p}</option>`);
        }

        // Load Organizations
        const user = auth.currentUser;
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userStrand = userSnap.exists() ? userSnap.data().strand : null;

        const qOrg = await getDocs(collection(db, "organizations"));
        qOrg.forEach((doc) => {
            const org = doc.data();
            let allowedStrands = Array.isArray(org.allowedStrands) ? org.allowedStrands : ['All'];
            if (org.electionStatus === 'Registration' && (allowedStrands.includes('All') || allowedStrands.includes(userStrand))) {
                orgSelect.innerHTML += `<option value="${doc.id}">${org.name}</option>`;
            }
        });

        // Load Partylists Independent of Orgs
        orgSelect.addEventListener('change', async () => {
            partySelect.disabled = false;
            partySelect.innerHTML = `<option value="" disabled selected>Loading Partylists...</option>`;
            
            try {
                // Fetch ALL active partylists available campus-wide
                const snapParty = await getDocs(collection(db, "partylists"));
                
                partySelect.innerHTML = `<option value="" disabled selected>Select Partylist</option>`;
                partySelect.innerHTML += `<option value="Independent" style="font-weight:bold;">Run as Independent</option>`;
                
                snapParty.forEach(doc => {
                    const party = doc.data();
                    let pStrands = Array.isArray(party.allowedStrands) ? party.allowedStrands : ['All'];
                    // Optional: You could filter partylists by strand here too
                    partySelect.innerHTML += `<option value="${doc.id}">${party.name}</option>`;
                });
            } catch(err) {
                partySelect.innerHTML = `<option value="Independent">Run as Independent</option>`;
            }
        });

    } catch (error) { console.error(error); }
}

async function handleApplicationSubmit(e) {
    e.preventDefault();
    if(!eligibility.canApply) return alert(eligibility.message);

    const user = auth.currentUser;
    if (!user) return alert("You are not logged in!");

    const position = document.getElementById('apply_position').value;
    const orgId = document.getElementById('apply_org').value;
    const partyId = document.getElementById('apply_partylist').value;
    const partyName = document.getElementById('apply_partylist').options[document.getElementById('apply_partylist').selectedIndex].text;
    const platform = document.getElementById('apply_platform').value.trim();
    // NEW: Get Achievements Input
    const achievements = document.getElementById('apply_achievements').value.trim(); 

    try {
        await setDoc(doc(db, "applications", user.uid), {
            uid: user.uid,
            applicantName: document.getElementById('topName').innerText, 
            position: position,
            organizationId: orgId,
            partylistId: partyId,
            partylistName: partyName,
            platform: platform, 
            achievements: achievements, // NEW: Save to DB
            status: "Pending", 
            appliedAt: new Date().toISOString()
        });
        
        alert("Application Submitted! Please wait for approval.");
        document.getElementById('candidacyForm').reset();
        
        await checkUserEligibility();
        const form = document.getElementById('candidacyForm');
        if(form && !eligibility.canApply) disableForm(form, eligibility.message);
        
    } catch (error) { 
        console.error(error);
        alert("Submission failed. Check console."); 
    }
}