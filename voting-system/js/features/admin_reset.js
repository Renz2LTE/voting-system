import { db } from "../firebase-config.js";
import { 
    collection, getDocs, writeBatch 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function initResetFeature() {
    const btn = document.getElementById('btnResetElection');
    if(btn) {
        // Cloning removes old event listeners to prevent duplicates
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', handleReset);
    }
}

async function handleReset() {
    const confirmation = prompt(
        "⚠️ DANGER ZONE ⚠️\n\nThis will permanently delete:\n- All Candidates\n- All Votes\n- All Applications\n- All Timeline Events\n\nUser accounts will remain, but Voting History will be wiped.\n\nType 'DELETE' to confirm:"
    );

    if (confirmation !== 'DELETE') {
        return alert("Reset cancelled. Code did not match.");
    }

    const btn = document.getElementById('btnResetElection');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.style.background = "#555";

    try {
        // Step 1: Candidates
        btn.textContent = "1/5 Clearing Candidates...";
        await deleteCollection("candidates");

        // Step 2: Applications
        btn.textContent = "2/5 Clearing Applications...";
        await deleteCollection("applications");

        // Step 3: Timeline
        btn.textContent = "3/5 Clearing Timeline...";
        await deleteCollection("timeline");

        // Step 4: Notifications
        btn.textContent = "4/5 Clearing Notifications...";
        await deleteCollection("notifications");

        // Step 5: Reset Orgs & Users
        btn.textContent = "5/5 Resetting Users & Orgs...";
        await resetOrganizations(); 
        await resetUserStatus();

        btn.textContent = "Done! Reloading...";
        alert("✅ Election System has been reset successfully.");
        location.reload();

    } catch (error) {
        console.error("Reset Failed:", error);
        alert(`Error during reset: ${error.message}`);
        
        // Restore button state on error
        btn.disabled = false;
        btn.textContent = originalText;
        btn.style.background = "#d32f2f";
    }
}

async function deleteCollection(colName) {
    const q = collection(db, colName);
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log(`Collection ${colName} is already empty.`);
        return; // Skip if empty
    }

    const batch = writeBatch(db);
    let count = 0;
    
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
    });

    await batch.commit();
    console.log(`Deleted ${count} docs from ${colName}`);
}

async function resetUserStatus() {
    const q = collection(db, "users");
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    
    snapshot.forEach(doc => {
        batch.update(doc.ref, { 
            hasVoted: false,
            votedOrgs: [] // Reset the specific voting array
        });
    });

    await batch.commit();
    console.log("Users reset.");
}

async function resetOrganizations() {
    const q = collection(db, "organizations");
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    
    snapshot.forEach(doc => {
        batch.update(doc.ref, { 
            electionStatus: "Registration" // Reset status back to start
        });
    });

    await batch.commit();
    console.log("Organizations reset.");
}