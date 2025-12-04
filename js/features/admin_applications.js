/* js/features/admin_applications.js */
import { db } from "../firebase-config.js";
import { 
    collection, getDocs, doc, updateDoc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let applicationsCache = [];

export async function initApplicationManagement() {
    await loadApplications();
}

async function loadApplications() {
    const tableBody = document.getElementById('applicationsTableBody');
    const badge = document.getElementById('appBadge');
    
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Loading...</td></tr>';

    try {
        const q = collection(db, "applications");
        const snapshot = await getDocs(q);
        
        applicationsCache = [];
        let pendingCount = 0;
        let approvedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            applicationsCache.push({ id: doc.id, ...data });
            if(data.status === 'Pending') pendingCount++;
            if(data.status === 'Approved') approvedCount++;
        });

        document.getElementById('countPending').textContent = pendingCount;
        document.getElementById('countApproved').textContent = approvedCount;
        document.getElementById('countTotal').textContent = applicationsCache.length;
        
        if(badge) {
            badge.textContent = pendingCount;
            badge.classList.toggle('hidden', pendingCount === 0);
        }

        renderTable(applicationsCache);
    } catch (e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error.</td></tr>`;
    }
}

function renderTable(apps) {
    const tableBody = document.getElementById('applicationsTableBody');
    tableBody.innerHTML = '';

    if (apps.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No applications.</td></tr>';
        return;
    }

    apps.sort((a, b) => (a.status === 'Pending' ? -1 : 1));

    apps.forEach(app => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #eee";
        
        let statusColor = app.status === 'Approved' ? 'green' : app.status === 'Declined' ? 'red' : '#666';
        let buttons = app.status === 'Pending' ? `
            <button class="btn-approve" data-id="${app.id}" style="color: green; border: 1px solid green; padding: 4px 8px; border-radius: 4px; background:white; cursor:pointer;">Approve</button>
            <button class="btn-decline" data-id="${app.id}" style="color: red; border: 1px solid red; padding: 4px 8px; border-radius: 4px; background:white; cursor:pointer;">Decline</button>
        ` : `<span style="color:#aaa; font-size:12px;">Completed</span>`;

        row.innerHTML = `
            <td style="padding: 12px;"><strong>${app.applicantName}</strong></td>
            <td style="padding: 12px;">${app.position}</td>
            <td style="padding: 12px;">${app.organizationId}</td>
            <td style="padding: 12px; font-size: 12px;">${new Date(app.appliedAt).toLocaleDateString()}</td>
            <td style="padding: 12px;"><span style="color: ${statusColor}; font-weight: 600;">${app.status}</span></td>
            <td style="padding: 12px; text-align: right;">${buttons}</td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.btn-approve').forEach(btn => btn.addEventListener('click', () => handleApprove(btn.dataset.id)));
    document.querySelectorAll('.btn-decline').forEach(btn => btn.addEventListener('click', () => handleDecline(btn.dataset.id)));
}

async function handleApprove(appId) {
    if(!confirm("Approve candidate?")) return;
    try {
        const appData = applicationsCache.find(a => a.id === appId);
        await addDoc(collection(db, "candidates"), {
            name: appData.applicantName, position: appData.position, party: appData.organizationId,
            userId: appData.uid, voteCount: 0, photoUrl: "https://img.freepik.com/free-icon/user_318-159711.jpg",
            createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "applications", appId), { status: "Approved" });
        loadApplications();
    } catch (e) { console.error(e); alert("Failed"); }
}

async function handleDecline(appId) {
    if(!confirm("Decline?")) return;
    try {
        await updateDoc(doc(db, "applications", appId), { status: "Declined" });
        loadApplications();
    } catch (e) { console.error(e); alert("Failed"); }
}