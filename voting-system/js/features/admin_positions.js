/* js/features/admin_positions.js */
import { db } from "../firebase-config.js";
import { 
    collection, addDoc, getDocs, deleteDoc, doc, query, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export async function initPositionManagement() {
    console.log("Initializing Position Management...");
    await loadPositions();

    const form = document.getElementById('addPositionForm');
    if(form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', handleAddPosition);
    }
}

async function loadPositions() {
    const tbody = document.getElementById('positionsTableBody');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#888;">Loading...</td></tr>';

    try {
        // FIX: Removed orderBy to prevent index errors. We sort in JS.
        const q = query(collection(db, "positions"));
        const snapshot = await getDocs(q);

        tbody.innerHTML = "";

        if(snapshot.empty) {
            // Default initialization if empty (optional)
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#888;">No positions found. Add one above.</td></tr>';
            return;
        }

        const positions = [];
        snapshot.forEach(doc => positions.push({ id: doc.id, ...doc.data() }));

        // Sort in Client Side
        positions.sort((a, b) => (a.order || 99) - (b.order || 99));

        positions.forEach(pos => {
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid #eee";
            row.innerHTML = `
                <td style="padding: 10px; font-weight:600;">${pos.order}</td>
                <td style="padding: 10px;">${pos.title}</td>
                <td style="padding: 10px;">${pos.maxWinners || 1}</td>
                <td style="padding: 10px; text-align: right;">
                    <button class="btn-del-pos" data-id="${pos.id}" style="color:#c62828; border:none; background:none; cursor:pointer;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.btn-del-pos').forEach(btn => {
            btn.addEventListener('click', () => handleDeletePosition(btn.dataset.id));
        });

    } catch(e) {
        console.error("Error loading positions:", e);
        // Show actual error in alert for debugging
        alert("System Error: " + e.message); 
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error loading data. Check console.</td></tr>';
    }
}

async function handleAddPosition(e) {
    e.preventDefault();
    const title = document.getElementById('newPosTitle').value.trim();
    const order = parseInt(document.getElementById('newPosOrder').value);
    const limit = parseInt(document.getElementById('newPosLimit').value);

    if(!title || !order || !limit) return alert("Please fill all fields.");

    try {
        await addDoc(collection(db, "positions"), {
            title: title,
            order: order,
            maxWinners: limit,
            createdAt: serverTimestamp()
        });
        alert("Position Added!");
        document.getElementById('addPositionForm').reset();
        loadPositions();
    } catch(e) {
        console.error(e);
        alert("Failed to add position.");
    }
}

async function handleDeletePosition(id) {
    if(!confirm("Delete this position?")) return;
    try {
        await deleteDoc(doc(db, "positions", id));
        loadPositions();
    } catch(e) { console.error(e); alert("Delete failed."); }
}