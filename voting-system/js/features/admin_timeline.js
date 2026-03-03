import { db } from "../firebase-config.js";
import { 
    collection, addDoc, getDocs, deleteDoc, doc, orderBy, query 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export async function initAdminTimeline() {
    console.log("Initializing Admin Timeline...");
    
    // Load existing events
    await loadAdminTimeline();

    // Setup Form Listener
    const form = document.getElementById('addEventForm');
    if(form) {
        // Remove old listener trick to prevent duplicates
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', handleAddEvent);
    }
}

async function loadAdminTimeline() {
    const list = document.getElementById('adminTimelineList');
    if(!list) return;

    list.innerHTML = "<p style='color:#888; font-size:13px;'>Loading events...</p>";

    try {
        const q = query(collection(db, "timeline"), orderBy("date", "asc"));
        const snapshot = await getDocs(q);
        
        list.innerHTML = ""; // Clear loader

        if(snapshot.empty) {
            list.innerHTML = "<p style='color:#888; font-size:13px;'>No events added yet.</p>";
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = "timeline-admin-item";
            
            // Restored nicer styling
            div.style.cssText = `
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px; border: 1px solid #eee; margin-bottom: 8px; 
                border-radius: 8px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.02);
            `;
            
            // Restored Status Badge Logic
            const statusColor = getStatusColor(data.status);
            
            div.innerHTML = `
                <div>
                    <strong style="color: var(--dark-blue); font-size: 14px;">${data.title}</strong>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        ${data.dateStr} 
                        <span style="background:${statusColor}; color:white; padding:2px 8px; border-radius:10px; font-size:10px; margin-left:8px; text-transform:uppercase; font-weight:600;">
                            ${data.status}
                        </span>
                    </div>
                </div>
                <button class="btn-delete-event" data-id="${docSnap.id}" style="color: #d32f2f; border: none; background: #ffebee; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            list.appendChild(div);
        });

        // Attach Delete Listeners
        document.querySelectorAll('.btn-delete-event').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteEvent(btn.dataset.id));
        });

    } catch (e) {
        console.error("Error loading timeline:", e);
        list.innerHTML = "<p style='color:red;'>Error loading data.</p>";
    }
}

function getStatusColor(status) {
    if(status === 'completed') return '#999';
    if(status === 'active') return '#0099ff'; // Blue
    return '#f1c40f'; // Yellow/Orange for pending
}

async function handleAddEvent(e) {
    e.preventDefault();
    
    const title = document.getElementById('eventTitle').value;
    const dateStr = document.getElementById('eventDate').value; 
    const status = document.getElementById('eventStatus').value;
    
    // Create a sortable date
    const sortDate = new Date().toISOString(); 

    try {
        await addDoc(collection(db, "timeline"), {
            title, dateStr, status, 
            date: sortDate 
        });
        
        alert("Event Added!");
        document.getElementById('addEventForm').reset();
        loadAdminTimeline(); // Refresh list
    } catch (error) {
        console.error("Add failed:", error);
        alert("Failed to add event.");
    }
}

async function handleDeleteEvent(id) {
    if(!confirm("Delete this event?")) return;
    try {
        await deleteDoc(doc(db, "timeline", id));
        loadAdminTimeline();
    } catch (e) {
        console.error(e);
        alert("Delete failed.");
    }
}