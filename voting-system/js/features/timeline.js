/* js/features/timeline.js */
import { db } from "../firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export async function initUserTimeline() {
    const list = document.getElementById('userTimelineList');
    // If the element isn't found, stop (prevents errors on other pages)
    if(!list) return;

    try {
        // Query events sorted by date
        const q = query(collection(db, "timeline"), orderBy("date", "asc"));
        const snapshot = await getDocs(q);

        list.innerHTML = "";

        if(snapshot.empty) {
            list.innerHTML = `<li style="color:#888; text-align:center; list-style:none;">No activities scheduled.</li>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Determine CSS class based on status for styling colors
            let liClass = "pending"; // default gray
            if(data.status === 'completed') liClass = "completed"; // usually green or struck through
            if(data.status === 'active') liClass = "active"; // blue

            const li = document.createElement('li');
            li.className = liClass;
            
            // The HTML structure matches your dashboard.css
            li.innerHTML = `
                <span class="dot"></span>
                <div class="timeline-content">
                    <span class="activity">${data.title}</span>
                    <span class="date">${data.dateStr}</span>
                </div>
            `;
            list.appendChild(li);
        });

    } catch (e) {
        console.error("Timeline error:", e);
        list.innerHTML = `<li style="color:red; text-align:center; list-style:none;">Error loading timeline.</li>`;
    }
}