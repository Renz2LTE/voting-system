/* js/features/admin_partylists.js */
import { db } from "../firebase-config.js";
import { 
    collection, addDoc, getDocs, doc, updateDoc, query, where 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let pendingRequestsCache = [];

export async function initAdminPartylists() {
    await loadPendingPartylists(); 
    await loadOfficialPartylists();

    const closeReview = document.getElementById('closeReviewModal');
    if(closeReview) {
        closeReview.onclick = () => {
            document.getElementById('reviewPartylistModal').classList.remove('active');
            document.getElementById('reviewPartylistModal').classList.add('hidden');
        }
    }
}

async function loadPendingPartylists() {
    const tbody = document.getElementById('pendingPartylistsTableBody');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading requests...</td></tr>';

    try {
        const q = query(collection(db, "partylist_requests"), where("status", "==", "Pending"));
        const snap = await getDocs(q);
        
        pendingRequestsCache = [];
        tbody.innerHTML = "";

        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#888;">No pending partylist requests.</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const req = { id: docSnap.id, ...docSnap.data() };
            pendingRequestsCache.push(req);

            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid #eee";
            row.innerHTML = `
                <td style="padding: 12px; font-weight:600; color:var(--dark-blue);">${req.name}</td>
                <td style="padding: 12px;">${req.submitterName || "Student"}</td>
                <td style="padding: 12px; font-size:12px; color:#666;">${req.createdAt ? new Date(req.createdAt.toDate()).toLocaleDateString() : 'Recent'}</td>
                <td style="padding: 12px; text-align: right;">
                    <button class="btn-review-partylist" data-id="${req.id}" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a; padding:5px 15px; border-radius:5px; cursor:pointer; font-weight:600;">
                        Review Request
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.btn-review-partylist').forEach(btn => {
            btn.addEventListener('click', () => openReviewModal(btn.dataset.id));
        });

    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error loading requests.</td></tr>';
    }
}

async function loadOfficialPartylists() {
    const tbody = document.getElementById('officialPartylistsTableBody');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Loading partylists...</td></tr>';

    try {
        const snap = await getDocs(collection(db, "partylists"));
        tbody.innerHTML = "";

        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#888;">No official partylists exist yet.</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const p = docSnap.data();
            let strandStr = "All";
            if (p.allowedStrands && p.allowedStrands.length > 0 && !p.allowedStrands.includes('All')) {
                strandStr = p.allowedStrands.join(", ");
            }

            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid #eee";
            row.innerHTML = `
                <td style="padding: 12px; font-weight:600; color:#10b981;">${p.name}</td>
                <td style="padding: 12px; font-size:12px;">${strandStr}</td>
                <td style="padding: 12px; text-align: right;">
                    <span style="background:#e0f2fe; color:#0284c7; padding:4px 10px; border-radius:12px; font-size:11px;">Active</span>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch(e) { console.error(e); tbody.innerHTML = '<tr><td colspan="3">Error loading.</td></tr>'; }
}

function openReviewModal(reqId) {
    const req = pendingRequestsCache.find(r => r.id === reqId);
    if(!req) return;

    const content = document.getElementById('reviewPartylistContent');
    
    content.innerHTML = `
        <h3 style="color:var(--dark-blue); margin-bottom:5px; font-size:20px;">${req.name}</h3>
        <p style="font-size:12px; color:#666; margin-bottom:15px;">Submitted by: <strong>${req.submitterName}</strong></p>
        
        <div style="margin-bottom:15px;">
            <strong style="display:block; font-size:12px; color:#888; text-transform:uppercase;">Mission</strong>
            <p style="font-size:14px; color:#333; line-height:1.5;">${req.mission}</p>
        </div>
        
        <div>
            <strong style="display:block; font-size:12px; color:#888; text-transform:uppercase;">Vision</strong>
            <p style="font-size:14px; color:#333; line-height:1.5;">${req.vision}</p>
        </div>
    `;

    const btnApprove = document.getElementById('btnApprovePartylist');
    const newBtnApprove = btnApprove.cloneNode(true);
    btnApprove.parentNode.replaceChild(newBtnApprove, btnApprove);
    newBtnApprove.onclick = () => handleApprovePartylist(req);

    const btnDecline = document.getElementById('btnDeclinePartylist');
    const newBtnDecline = btnDecline.cloneNode(true);
    btnDecline.parentNode.replaceChild(newBtnDecline, btnDecline);
    newBtnDecline.onclick = () => handleDeclinePartylist(req.id);

    const modal = document.getElementById('reviewPartylistModal');
    modal.classList.remove('hidden');
    modal.classList.add('active');
}

async function handleApprovePartylist(req) {
    if(!confirm(`Approve ${req.name} as an official Partylist?`)) return;
    
    try {
        await addDoc(collection(db, "partylists"), {
            name: req.name,
            mission: req.mission,
            vision: req.vision,
            allowedStrands: req.allowedStrands,
            status: "Active"
        });

        await updateDoc(doc(db, "partylist_requests", req.id), { status: "Approved" });

        await addDoc(collection(db, "notifications"), {
            title: "🎉 New Official Partylist!",
            message: `The partylist "${req.name}" is now official! Candidates can now join this party when filing for candidacy.`,
            type: "global",
            timestamp: new Date().toISOString(),
            readBy: []
        });

        alert("Partylist Approved Successfully!");
        document.getElementById('reviewPartylistModal').classList.remove('active');
        document.getElementById('reviewPartylistModal').classList.add('hidden');
        
        loadPendingPartylists();
        loadOfficialPartylists();

    } catch(e) { console.error(e); alert("Failed to approve."); }
}

async function handleDeclinePartylist(reqId) {
    if(!confirm("Are you sure you want to decline this request?")) return;
    try {
        await updateDoc(doc(db, "partylist_requests", reqId), { status: "Declined" });
        alert("Request declined.");
        document.getElementById('reviewPartylistModal').classList.remove('active');
        document.getElementById('reviewPartylistModal').classList.add('hidden');
        loadPendingPartylists();
    } catch(e) { console.error(e); }
}