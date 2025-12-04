/* js/features/organization.js */
import { db, auth } from "../firebase-config.js";
import { 
    collection, getDocs, doc, getDoc, updateDoc, query, where 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let currentOrgId = null;

export async function initOrganizationFeature() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const q = query(collection(db, "candidates"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return; 

        const candidateData = snapshot.docs[0].data();
        const orgId = candidateData.party;

        if (!orgId || orgId === "Independent" || orgId === "CREATE_NEW") return; 

        const navItem = document.getElementById('nav-item-org');
        if(navItem) navItem.classList.remove('hidden');
        
        currentOrgId = orgId;
        await loadOrgDetails(orgId);
        await loadOrgMembers(orgId);

        if (candidateData.position === 'President') {
            const editBtn = document.getElementById('btnEditOrg');
            if(editBtn) {
                editBtn.classList.remove('hidden');
                editBtn.addEventListener('click', openEditOrgModal);
            }
        }
    } catch (error) { console.error(error); }
}

async function loadOrgDetails(orgId) {
    try {
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if (orgSnap.exists()) {
            const data = orgSnap.data();
            document.getElementById('orgNameDisplay').textContent = data.name;
            document.getElementById('orgMissionDisplay').textContent = data.mission || "No mission statement.";
            document.getElementById('orgVisionDisplay').textContent = data.vision || "No vision statement.";
            
            document.getElementById('edit_org_mission').value = data.mission || "";
            document.getElementById('edit_org_vision').value = data.vision || "";
        }
    } catch (e) { console.error(e); }
}

async function loadOrgMembers(orgId) {
    const list = document.getElementById('orgMembersList');
    if(!list) return;
    list.innerHTML = "<li>Loading...</li>";

    try {
        const q = query(collection(db, "candidates"), where("party", "==", orgId));
        const snapshot = await getDocs(q);
        list.innerHTML = ""; 
        
        snapshot.forEach(doc => {
            const member = doc.data();
            const li = document.createElement('li');
            li.style.marginBottom = "10px";
            li.innerHTML = `<strong>${member.name}</strong> - ${member.position}`;
            list.appendChild(li);
        });
    } catch (e) { list.innerHTML = "<li>Error loading members.</li>"; }
}

function openEditOrgModal() {
    document.getElementById('editOrgModal').classList.remove('hidden');
    document.getElementById('editOrgModal').classList.add('active');
}

const closeBtn = document.getElementById('closeOrgModal');
if(closeBtn) closeBtn.addEventListener('click', () => {
    document.getElementById('editOrgModal').classList.remove('active');
    document.getElementById('editOrgModal').classList.add('hidden');
});

const form = document.getElementById('editOrgForm');
if(form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentOrgId) return;
    try {
        await updateDoc(doc(db, "organizations", currentOrgId), {
            mission: document.getElementById('edit_org_mission').value,
            vision: document.getElementById('edit_org_vision').value
        });
        alert("Updated!");
        document.getElementById('editOrgModal').classList.remove('active');
        document.getElementById('editOrgModal').classList.add('hidden');
        loadOrgDetails(currentOrgId); 
    } catch (e) { alert("Failed."); }
});