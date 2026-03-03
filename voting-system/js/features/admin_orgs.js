/* js/features/admin_orgs.js */
import { db, storage } from "../firebase-config.js";
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { 
    ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

export async function initAdminOrgs() {
    await loadOrgs();
    
    const form = document.getElementById('createOrgForm');
    if(form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', handleCreateOrg);
    }

    const editForm = document.getElementById('editOrgForm');
    if(editForm) {
        const newEditForm = editForm.cloneNode(true);
        editForm.parentNode.replaceChild(newEditForm, editForm);
        newEditForm.addEventListener('submit', handleUpdateOrg);
    }

    const closeBtn = document.getElementById('closeEditOrgModal');
    if(closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('editOrgModal').classList.remove('active');
            document.getElementById('editOrgModal').classList.add('hidden');
        };
    }
}

async function loadOrgs() {
    const list = document.getElementById('adminOrgList');
    if(!list) return;
    list.innerHTML = "Loading Organizations...";
    
    try {
        const snapshot = await getDocs(collection(db, "organizations"));
        list.innerHTML = "";
        
        if(snapshot.empty) {
            list.innerHTML = "<p style='font-size:13px; color:#666;'>No organizations created yet.</p>";
            return;
        }

        snapshot.forEach(docSnap => {
            const org = docSnap.data();
            const status = org.electionStatus || 'Registration';
            
            let statusColor = '#999';
            if(status === 'Registration') statusColor = '#f39c12';
            if(status === 'Voting') statusColor = '#27ae60';
            if(status === 'Completed') statusColor = '#2c3e50';

            let strandTag = "";
            if (Array.isArray(org.allowedStrands)) {
                if (org.allowedStrands.includes("All")) {
                    strandTag = `<span style="background:#eee; color:#666; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:5px;">All Strands</span>`;
                } else {
                    strandTag = org.allowedStrands.map(s => 
                        `<span style="background:#e3f2fd; color:#1976d2; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:3px;">${s}</span>`
                    ).join("");
                }
            } else if (org.allowedStrand) {
                strandTag = `<span style="background:#e3f2fd; color:#1976d2; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:5px;">${org.allowedStrand}</span>`;
            }

            const div = document.createElement('div');
            div.style.cssText = "display:flex; justify-content:space-between; padding:12px; border:1px solid #eee; margin-bottom:8px; background:white; border-radius:8px; align-items:center;";
            
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:30px; height:30px; background:#f0f0f0; border-radius:50%; overflow:hidden;">
                        ${org.bannerUrl ? `<img src="${org.bannerUrl}" style="width:100%; height:100%; object-fit:cover;">` : '<i class="fa-solid fa-users" style="padding:8px; color:#aaa;"></i>'}
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; flex-wrap:wrap;">
                            <span style="font-weight:600; color:#333; margin-right:5px;">${org.name}</span>
                            ${strandTag}
                        </div>
                        <span style="font-size:11px; color:${statusColor}; font-weight:600;">${status}</span>
                    </div>
                </div>
                <div>
                    <button class="btn-edit-org" data-id="${docSnap.id}" style="color:#0099ff; border:1px solid #cceeff; background:#f0f9ff; cursor:pointer; padding:5px 10px; border-radius:5px; margin-right:5px;">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn-del-org" data-id="${docSnap.id}" style="color:#c62828; border:1px solid #ffcdd2; background:#ffebee; cursor:pointer; padding:5px 10px; border-radius:5px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });

        document.querySelectorAll('.btn-edit-org').forEach(btn => {
            btn.addEventListener('click', () => openEditOrgModal(btn.dataset.id));
        });
        document.querySelectorAll('.btn-del-org').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteOrg(btn.dataset.id));
        });

    } catch(e) { console.error(e); list.innerHTML = "Error loading."; }
}

function getSelectedStrands(containerId) {
    const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

async function handleCreateOrg(e) {
    e.preventDefault();
    const name = document.getElementById('newOrgName').value;
    const strands = getSelectedStrands('newOrgStrands');
    if(strands.length === 0) strands.push('All');

    try {
        await addDoc(collection(db, "organizations"), { 
            name: name, 
            allowedStrands: strands, 
            mission: "Our mission is to serve...", 
            vision: "We envision a community...",
            bannerUrl: "",
            electionStatus: "Registration" 
        });
        alert("Organization Created!");
        document.getElementById('newOrgName').value = "";
        document.querySelectorAll('#newOrgStrands input').forEach(cb => cb.checked = (cb.value === 'All'));
        loadOrgs();
    } catch(e) { alert("Failed to create."); }
}

async function openEditOrgModal(orgId) {
    try {
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if(!orgSnap.exists()) return alert("Org not found");

        const data = orgSnap.data();
        
        document.getElementById('edit_org_id').value = orgId;
        document.getElementById('edit_org_name').value = data.name || "";
        
        const savedStrands = data.allowedStrands || (data.allowedStrand ? [data.allowedStrand] : ['All']);
        document.querySelectorAll('#editOrgStrands input').forEach(cb => {
            cb.checked = savedStrands.includes(cb.value);
        });

        document.getElementById('edit_org_mission').value = data.mission || "";
        document.getElementById('edit_org_vision').value = data.vision || "";
        document.getElementById('edit_org_banner').value = ""; 

        const modal = document.getElementById('editOrgModal');
        modal.classList.remove('hidden');
        modal.classList.add('active');

    } catch(e) { console.error(e); alert("Error opening editor."); }
}

async function handleUpdateOrg(e) {
    e.preventDefault();
    const orgId = document.getElementById('edit_org_id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = "Saving..."; btn.disabled = true;

    try {
        const strands = getSelectedStrands('editOrgStrands');
        if(strands.length === 0) strands.push('All');

        let updates = {
            name: document.getElementById('edit_org_name').value,
            allowedStrands: strands, 
            mission: document.getElementById('edit_org_mission').value,
            vision: document.getElementById('edit_org_vision').value
        };

        const fileInput = document.getElementById('edit_org_banner');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `organizations/${orgId}/banner_${Date.now()}`);
            await uploadBytes(storageRef, file);
            updates.bannerUrl = await getDownloadURL(storageRef);
        }

        await updateDoc(doc(db, "organizations", orgId), updates);
        
        alert("Organization Updated Successfully!");
        document.getElementById('editOrgModal').classList.remove('active');
        document.getElementById('editOrgModal').classList.add('hidden');
        loadOrgs(); 

    } catch(e) { console.error(e); alert("Update failed."); } 
    finally { btn.textContent = "Save Changes"; btn.disabled = false; }
}

async function handleDeleteOrg(id) {
    if(!confirm("Delete this organization?")) return;
    try { await deleteDoc(doc(db, "organizations", id)); alert("Organization deleted."); loadOrgs(); } 
    catch(e) { alert("Delete failed."); }
}