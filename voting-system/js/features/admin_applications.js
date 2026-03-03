/* js/features/admin_applications.js */
import { db, storage } from "../firebase-config.js";
import { 
    collection, getDocs, getDoc, doc, updateDoc, addDoc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { 
    ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Global caches
let applicationsCache = [];
let candidatesCache = [];
let orgsCache = [];

export async function initApplicationManagement() {
    console.log("Initializing Application & Candidate Management...");
    
    // Load data
    await loadOrgsCache();
    await loadApplications();
    await loadCandidates();

    // --- DUMMY CANDIDATE LISTENERS ---
    const btnDummy = document.getElementById('btnAddDummyCandidate');
    if (btnDummy) {
        const newBtn = btnDummy.cloneNode(true);
        btnDummy.parentNode.replaceChild(newBtn, btnDummy);
        newBtn.addEventListener('click', openDummyModal);
    }

    const formDummy = document.getElementById('dummyCandidateForm');
    if (formDummy) {
        const newForm = formDummy.cloneNode(true);
        formDummy.parentNode.replaceChild(newForm, formDummy);
        newForm.addEventListener('submit', handleCreateDummy);
    }

    const closeDummy = document.getElementById('closeDummyModal');
    if (closeDummy) {
        closeDummy.onclick = () => {
            const modal = document.getElementById('dummyCandidateModal');
            modal.classList.remove('active');
            modal.classList.add('hidden');
        };
    }

    // --- EDIT CANDIDATE LISTENERS ---
    const formEditCand = document.getElementById('editCandidateForm');
    if (formEditCand) {
        const newForm = formEditCand.cloneNode(true);
        formEditCand.parentNode.replaceChild(newForm, formEditCand);
        newForm.addEventListener('submit', handleEditCandidateSubmit);
    }

    const closeEditCand = document.getElementById('closeEditCandidateModal');
    if (closeEditCand) {
        closeEditCand.onclick = () => {
            const modal = document.getElementById('editCandidateModal');
            modal.classList.remove('active');
            modal.classList.add('hidden');
        };
    }
}

// --- CACHE LOADERS ---
async function loadOrgsCache() {
    try {
        const snap = await getDocs(collection(db, "organizations"));
        orgsCache = [];
        snap.forEach(doc => orgsCache.push({ id: doc.id, ...doc.data() }));
    } catch(e) { console.error("Failed to load orgs", e); }
}

function getOrgName(orgId) {
    const org = orgsCache.find(o => o.id === orgId);
    return org ? org.name : "Independent / Unknown";
}

// --- APPLICATIONS LOGIC ---
async function loadApplications() {
    const tableBody = document.getElementById('applicationsTableBody');
    const badge = document.getElementById('appBadge');
    if (!tableBody) return; 

    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Loading data...</td></tr>';

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

        // Counters
        if(document.getElementById('countPending')) document.getElementById('countPending').textContent = pendingCount;
        if(document.getElementById('countApproved')) document.getElementById('countApproved').textContent = approvedCount;
        if(document.getElementById('countTotal')) document.getElementById('countTotal').textContent = applicationsCache.length;
        
        if (badge) {
            if(pendingCount > 0) { badge.textContent = pendingCount; badge.classList.remove('hidden'); } 
            else { badge.classList.add('hidden'); }
        }

        renderAppTable(applicationsCache);
    } catch (error) {
        console.error("Error loading apps:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error loading data.</td></tr>`;
    }
}

function renderAppTable(apps) {
    const tableBody = document.getElementById('applicationsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (apps.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No applications found.</td></tr>';
        return;
    }

    apps.sort((a, b) => (a.status === 'Pending' ? -1 : 1));

    apps.forEach(app => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #eee";
        
        let statusColor = '#666';
        if(app.status === 'Approved') statusColor = 'green';
        if(app.status === 'Declined') statusColor = 'red';

        let actionButtons = '';
        if (app.status === 'Pending') {
            actionButtons = `
                <button class="btn-approve" data-id="${app.id}" style="background: #e6fffa; color: #047481; border: 1px solid #047481; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-right: 5px;"><i class="fa-solid fa-check"></i></button>
                <button class="btn-decline" data-id="${app.id}" style="background: #fff5f5; color: #c53030; border: 1px solid #c53030; padding: 5px 10px; border-radius: 5px; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
            `;
        } else {
            actionButtons = `<span style="font-size: 12px; color: #aaa;">Done</span>`;
        }

        row.innerHTML = `
            <td style="padding: 12px;"><strong>${app.applicantName}</strong></td>
            <td style="padding: 12px;">${app.position}</td>
            <td style="padding: 12px;">${getOrgName(app.organizationId)}</td>
            <td style="padding: 12px; font-size: 12px; color: #888;">${new Date(app.appliedAt).toLocaleDateString()}</td>
            <td style="padding: 12px;"><span style="color: ${statusColor}; font-weight: 600;">${app.status}</span></td>
            <td style="padding: 12px; text-align: right;">${actionButtons}</td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.btn-approve').forEach(btn => btn.addEventListener('click', () => handleApprove(btn.dataset.id)));
    document.querySelectorAll('.btn-decline').forEach(btn => btn.addEventListener('click', () => handleDecline(btn.dataset.id)));
}

// --- APPROVED CANDIDATES LOGIC ---
async function loadCandidates() {
    const tableBody = document.getElementById('candidatesTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Loading candidates...</td></tr>';

    try {
        const snap = await getDocs(collection(db, "candidates"));
        candidatesCache = [];
        snap.forEach(doc => candidatesCache.push({ id: doc.id, ...doc.data() }));

        renderCandidatesTable();
    } catch(e) {
        console.error(e);
        tableBody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Failed to load candidates.</td></tr>';
    }
}

function renderCandidatesTable() {
    const tableBody = document.getElementById('candidatesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (candidatesCache.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#888;">No candidates currently registered.</td></tr>';
        return;
    }

    candidatesCache.forEach(cand => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #eee";
        
        const photo = cand.photoUrl || "https://img.freepik.com/free-icon/user_318-159711.jpg";
        const isDummy = cand.userId && cand.userId.startsWith('dummy_');
        const typeBadge = isDummy 
            ? `<span style="background:#fff3cd; color:#f57f17; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:bold;">Dummy</span>` 
            : `<span style="background:#e3f2fd; color:#1976d2; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:bold;">Student</span>`;

        row.innerHTML = `
            <td style="padding: 8px;"><img src="${photo}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #ddd;"></td>
            <td style="padding: 12px; font-weight:600; color:var(--dark-blue);">${cand.name}</td>
            <td style="padding: 12px;">${cand.position}</td>
            <td style="padding: 12px;">${getOrgName(cand.party)}</td>
            <td style="padding: 12px;">${typeBadge}</td>
            <td style="padding: 12px; text-align: right;">
                <button class="btn-edit-cand" data-id="${cand.id}" style="color:#0099ff; border:1px solid #cceeff; background:#f0f9ff; cursor:pointer; padding:5px 10px; border-radius:5px; margin-right:5px;"><i class="fa-solid fa-pen"></i> Edit</button>
                <button class="btn-del-cand" data-id="${cand.id}" style="color:#c62828; border:1px solid #ffcdd2; background:#ffebee; cursor:pointer; padding:5px 10px; border-radius:5px;"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.btn-edit-cand').forEach(btn => btn.addEventListener('click', () => openEditCandidateModal(btn.dataset.id)));
    document.querySelectorAll('.btn-del-cand').forEach(btn => btn.addEventListener('click', () => handleDeleteCandidate(btn.dataset.id)));
}

// --- DUMMY CANDIDATE FUNCTIONS ---
async function openDummyModal() {
    const modal = document.getElementById('dummyCandidateModal');
    const orgSelect = document.getElementById('dummy_org');
    const posSelect = document.getElementById('dummy_position');
    
    orgSelect.innerHTML = '<option value="" disabled selected>Select Organization</option>';
    orgsCache.forEach(org => {
        orgSelect.innerHTML += `<option value="${org.id}">${org.name}</option>`;
    });

    if (posSelect) {
        posSelect.innerHTML = '<option value="" disabled selected>Select Position</option>';
        try {
            const pSnap = await getDocs(collection(db, "positions"));
            let positions = [];
            pSnap.forEach(doc => positions.push(doc.data()));
            
            if (positions.length > 0) {
                positions.sort((a, b) => (a.order || 99) - (b.order || 99));
                positions.forEach(p => {
                    posSelect.innerHTML += `<option value="${p.title}">${p.title}</option>`;
                });
            } else {
                // FALLBACK IF NO CUSTOM POSITIONS EXIST
                const defaultPos = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "P.R.O"];
                defaultPos.forEach(p => {
                    posSelect.innerHTML += `<option value="${p}">${p}</option>`;
                });
            }
        } catch (e) { 
            console.error("Error loading positions:", e); 
        }
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
}

async function handleCreateDummy(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = "Creating...";

    const fname = document.getElementById('dummy_fname').value;
    const lname = document.getElementById('dummy_lname').value;
    const position = document.getElementById('dummy_position').value;
    const orgId = document.getElementById('dummy_org').value;
    const platform = document.getElementById('dummy_platform').value;
    const achievements = document.getElementById('dummy_achievements').value; // NEW

    const fileInput = document.getElementById('dummy_photo');
    let photoUrl = "https://img.freepik.com/free-icon/user_318-159711.jpg";

    try {
        const fakeUid = "dummy_" + Date.now();

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `candidates/${fakeUid}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            photoUrl = await getDownloadURL(storageRef);
        }

        await addDoc(collection(db, "candidates"), {
            name: `${fname} ${lname}`,
            position: position,
            party: orgId,
            userId: fakeUid,
            platform: platform,
            achievements: achievements, // NEW
            voteCount: 0,
            photoUrl: photoUrl,
            createdAt: serverTimestamp()
        });

        alert("Dummy Candidate Created Successfully!");
        document.getElementById('dummyCandidateForm').reset();
        
        const modal = document.getElementById('dummyCandidateModal');
        modal.classList.remove('active');
        modal.classList.add('hidden');
        
        loadCandidates(); 

    } catch (error) {
        console.error(error);
        alert("Failed to create candidate.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Create Candidate";
    }
}

// --- EDIT / DELETE CANDIDATE LOGIC ---
async function openEditCandidateModal(candId) {
    const cand = candidatesCache.find(c => c.id === candId);
    if(!cand) return alert("Candidate not found.");

    document.getElementById('edit_cand_id').value = cand.id;
    document.getElementById('edit_cand_name').value = cand.name;
    document.getElementById('edit_cand_platform').value = cand.platform || "";
    document.getElementById('edit_cand_achievements').value = cand.achievements || ""; // NEW
    document.getElementById('edit_cand_photo').value = ""; // Reset file input

    const orgSelect = document.getElementById('edit_cand_org');
    orgSelect.innerHTML = '';
    orgsCache.forEach(org => {
        const isSelected = org.id === cand.party ? 'selected' : '';
        orgSelect.innerHTML += `<option value="${org.id}" ${isSelected}>${org.name}</option>`;
    });

    const posSelect = document.getElementById('edit_cand_position');
    if (posSelect) {
        posSelect.innerHTML = '<option value="" disabled>Select Position</option>';
        try {
            const pSnap = await getDocs(collection(db, "positions"));
            let positions = [];
            pSnap.forEach(doc => positions.push(doc.data()));
            
            if (positions.length > 0) {
                positions.sort((a, b) => (a.order || 99) - (b.order || 99));
                positions.forEach(p => {
                    const isSelected = p.title === cand.position ? 'selected' : '';
                    posSelect.innerHTML += `<option value="${p.title}" ${isSelected}>${p.title}</option>`;
                });
            } else {
                // FALLBACK IF NO CUSTOM POSITIONS EXIST
                const defaultPos = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "P.R.O"];
                defaultPos.forEach(p => {
                    const isSelected = p === cand.position ? 'selected' : '';
                    posSelect.innerHTML += `<option value="${p}" ${isSelected}>${p}</option>`;
                });
            }
        } catch (e) { console.error("Error loading positions:", e); }
    }

    const modal = document.getElementById('editCandidateModal');
    modal.classList.remove('hidden');
    modal.classList.add('active');
}

async function handleEditCandidateSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = "Saving...";

    const candId = document.getElementById('edit_cand_id').value;
    const name = document.getElementById('edit_cand_name').value;
    const position = document.getElementById('edit_cand_position').value;
    const orgId = document.getElementById('edit_cand_org').value;
    const platform = document.getElementById('edit_cand_platform').value;
    const achievements = document.getElementById('edit_cand_achievements').value; // NEW
    const fileInput = document.getElementById('edit_cand_photo');

    try {
        let updates = { name, position, party: orgId, platform, achievements }; // UPDATED

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `candidates/${candId}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            updates.photoUrl = await getDownloadURL(storageRef);
        }

        await updateDoc(doc(db, "candidates", candId), updates);
        
        alert("Candidate updated successfully!");
        
        const modal = document.getElementById('editCandidateModal');
        modal.classList.remove('active');
        modal.classList.add('hidden');
        
        loadCandidates(); 

    } catch(e) {
        console.error(e);
        alert("Failed to update candidate.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Save Changes";
    }
}

async function handleDeleteCandidate(candId) {
    if(!confirm("Are you sure you want to permanently delete this candidate? Their votes will also be lost.")) return;
    try {
        await deleteDoc(doc(db, "candidates", candId));
        alert("Candidate deleted.");
        loadCandidates();
    } catch(e) {
        console.error(e);
        alert("Failed to delete candidate.");
    }
}

// --- APPLICATION APPROVAL LOGIC ---
async function handleApprove(appId) {
    if(!confirm("Approve this candidate?")) return;

    try {
        const appData = applicationsCache.find(a => a.id === appId);
        if(!appData) return alert("Error: Data not found in cache.");

        let candidatePhoto = "https://img.freepik.com/free-icon/user_318-159711.jpg";
        
        try {
            const userSnap = await getDoc(doc(db, "users", appData.uid));
            if (userSnap.exists() && userSnap.data().photoUrl) {
                candidatePhoto = userSnap.data().photoUrl;
            }
        } catch (err) {}

        await addDoc(collection(db, "candidates"), {
            name: appData.applicantName, 
            position: appData.position,
            party: appData.organizationId,
            userId: appData.uid,
            platform: appData.platform || "No platform provided.", 
            achievements: appData.achievements || "", // NEW
            voteCount: 0,
            photoUrl: candidatePhoto, 
            createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "applications", appId), { status: "Approved" });
        alert("Candidate Approved!");
        loadApplications(); 
        loadCandidates(); // Refresh candidates list
    } catch (error) { console.error(error); alert("Approval failed."); }
}

async function handleDecline(appId) {
    if(!confirm("Decline this application?")) return;
    try {
        await updateDoc(doc(db, "applications", appId), { status: "Declined" });
        alert("Application Declined.");
        loadApplications();
    } catch (error) { console.error(error); alert("Decline failed."); }
}