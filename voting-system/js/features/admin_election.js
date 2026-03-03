/* js/features/admin_election.js */
import { db } from "../firebase-config.js";
import { 
    collection, getDocs, doc, updateDoc, addDoc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export async function initAdminElection() {
    const tbody = document.getElementById('orgStatusTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 15px; color:#888;">Loading organizations...</td></tr>';

    try {
        const snap = await getDocs(collection(db, "organizations"));
        tbody.innerHTML = '';

        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 15px; color:#888;">No organizations found. Create one first.</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const org = docSnap.data();
            const orgId = docSnap.id;
            const status = org.electionStatus || 'Registration';

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #eee";
            tr.innerHTML = `
                <td style="padding:12px;"><strong>${org.name}</strong></td>
                <td style="padding:12px;">
                    <select class="status-select profile-input" data-id="${orgId}" data-name="${org.name}" data-old="${status}" style="padding:8px; border-radius:8px; width: 100%; max-width: 200px;">
                        <option value="Registration" ${status==='Registration'?'selected':''}>Registration Phase</option>
                        <option value="Voting" ${status==='Voting'?'selected':''}>Voting Live</option>
                        <option value="Completed" ${status==='Completed'?'selected':''}>Election Completed</option>
                    </select>
                </td>
                <td style="padding:12px; text-align:right;">
                    <button class="btn-update-status btn-vote-now" style="padding:8px 15px; font-size:12px; border:none;" data-id="${orgId}">Update Status</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach listeners to update buttons
        document.querySelectorAll('.btn-update-status').forEach(btn => {
            // Clone to prevent duplicate listeners if init is called multiple times
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const select = document.querySelector(`.status-select[data-id="${id}"]`);
                const newStatus = select.value;
                const oldStatus = select.dataset.old;
                const orgName = select.dataset.name;

                if(newStatus === oldStatus) return alert("Status is already set to " + newStatus);

                try {
                    e.target.textContent = "Saving...";
                    e.target.disabled = true;
                    
                    await updateDoc(doc(db, "organizations", id), { electionStatus: newStatus });
                    
                    // --- AUTO NOTIFICATION SYSTEM ---
                    let notifTitle = "";
                    let notifMsg = "";

                    if (newStatus === 'Voting') {
                        notifTitle = `🗳️ Voting OPEN: ${orgName}`;
                        notifMsg = `The official voting period for ${orgName} has begun! Cast your ballots now in the 'Vote' tab.`;
                    } else if (newStatus === 'Completed') {
                        notifTitle = `🏆 Election Results: ${orgName}`;
                        notifMsg = `Voting has concluded for ${orgName}. Check the Organizations tab to see the official winners!`;
                    } else if (newStatus === 'Registration') {
                        notifTitle = `⚙️ Phase Change: ${orgName}`;
                        notifMsg = `${orgName} has returned to the Registration and preparation phase.`;
                    }

                    if(notifTitle) {
                        await addDoc(collection(db, "notifications"), {
                            title: notifTitle,
                            message: notifMsg,
                            type: "global",
                            timestamp: new Date().toISOString(),
                            readBy: [] // No one has read it yet
                        });
                    }

                    alert(`Successfully updated to ${newStatus} and notified students!`);
                    initAdminElection(); // Reload the table
                } catch(err) {
                    console.error(err);
                    alert("Failed to update status.");
                    e.target.textContent = "Update Status";
                    e.target.disabled = false;
                }
            });
        });

    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red; padding:15px;">Error loading organizations. Check console.</td></tr>';
    }
}