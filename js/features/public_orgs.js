/* js/features/public_orgs.js */
import { db } from "../firebase-config.js";
import { 
    collection, getDocs, query, where, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export async function initPublicOrgsFeature() {
    const container = document.getElementById('publicOrgsGrid');
    if (!container) return;

    container.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1/-1;">Loading organizations...</p>`;

    try {
        const q = collection(db, "organizations");
        const snapshot = await getDocs(q);

        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1/-1;">No organizations registered.</p>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const org = docSnap.data();
            const card = document.createElement('div');
            card.className = "card";
            card.style.textAlign = "center";
            
            // Truncate text for preview
            const shortMission = org.mission ? org.mission.substring(0, 80) + "..." : "No mission statement available.";

            card.innerHTML = `
                <div style="width: 60px; height: 60px; background: #eef2ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto; color: var(--primary-blue); font-size: 24px;">
                    <i class="fa-solid fa-users"></i>
                </div>
                <h3 style="color: var(--dark-blue); margin-bottom: 10px;">${org.name}</h3>
                <p style="color: #666; font-size: 13px; margin-bottom: 20px; min-height: 40px;">${shortMission}</p>
                <button class="btn-vote-now btn-view-org" data-id="${docSnap.id}" style="width: 100%; border: none; background: var(--bg-light); color: var(--text-dark);">
                    View Details
                </button>
            `;
            container.appendChild(card);
        });

        // Add Listeners to "View Details" buttons
        document.querySelectorAll('.btn-view-org').forEach(btn => {
            btn.addEventListener('click', () => openOrgModal(btn.dataset.id));
        });

    } catch (e) {
        console.error("Error loading orgs:", e);
        container.innerHTML = `<p style="color:red; text-align:center;">Error loading data.</p>`;
    }
}

// --- MODAL LOGIC ---
async function openOrgModal(orgId) {
    const modal = document.getElementById('publicOrgModal');
    const content = document.getElementById('publicOrgModalContent');
    
    modal.classList.remove('hidden');
    modal.classList.add('active');
    content.innerHTML = `<div style="text-align:center; padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading details...</div>`;

    try {
        // 1. Get Org Details
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if(!orgSnap.exists()) return;
        const org = orgSnap.data();

        // 2. Get Members (Candidates)
        const qMembers = query(collection(db, "candidates"), where("party", "==", orgId));
        const memSnap = await getDocs(qMembers);

        let membersHtml = '';
        if(memSnap.empty) {
            membersHtml = '<p style="color:#888; font-style:italic;">No official candidates yet.</p>';
        } else {
            membersHtml = '<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
            memSnap.forEach(m => {
                const mem = m.data();
                const goal = mem.platform || "No specific platform stated."; // Assuming we might add 'platform' later
                membersHtml += `
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 8px; border: 1px solid #eee;">
                        <strong style="color: var(--primary-blue); display:block;">${mem.position}</strong>
                        <span style="font-weight: 600; color: #333;">${mem.name}</span>
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">"${goal}"</p>
                    </div>
                `;
            });
            membersHtml += '</div>';
        }

        // 3. Render Modal Content
        content.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: var(--dark-blue); font-size: 28px; margin-bottom: 5px;">${org.name}</h2>
                <span style="background: #eef2ff; color: var(--primary-blue); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Official Organization</span>
            </div>

            <div style="margin-bottom: 25px;">
                <h4 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Mission & Vision</h4>
                <p style="font-size: 14px; color: #555; margin-bottom: 10px;"><strong>Mission:</strong> ${org.mission || "N/A"}</p>
                <p style="font-size: 14px; color: #555;"><strong>Vision:</strong> ${org.vision || "N/A"}</p>
            </div>

            <div>
                <h4 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Our Candidates</h4>
                ${membersHtml}
            </div>
        `;

    } catch (e) {
        console.error(e);
        content.innerHTML = `<p style="color:red; text-align:center;">Failed to load details.</p>`;
    }
}

// Close Modal Logic (Attached globally once)
const closeBtn = document.getElementById('closePublicOrgModal');
if(closeBtn) {
    closeBtn.addEventListener('click', () => {
        document.getElementById('publicOrgModal').classList.remove('active');
        document.getElementById('publicOrgModal').classList.add('hidden');
    });
}