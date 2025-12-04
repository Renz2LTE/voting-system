/* js/features/voting.js */
import { db, auth } from "../firebase-config.js";
import { 
    collection, getDocs, doc, writeBatch, increment, getDoc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// State
let userSelections = {}; 
let candidatesCache = [];

export async function initVotingFeature() {
    const container = document.getElementById('candidatesContainer');
    const submitBtn = document.getElementById('finalSubmitBtn');
    
    // 1. Check if User has already voted
    try {
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists() && userSnap.data().hasVoted) {
            showVotedState();
            return;
        }

        // 2. Load Candidates
        await loadCandidates(container);

        // 3. Setup Submit Button
        if (submitBtn) {
            // Remove old listeners by cloning
            const newBtn = submitBtn.cloneNode(true);
            submitBtn.parentNode.replaceChild(newBtn, submitBtn);
            newBtn.addEventListener('click', handleSubmitVote);
        }
    } catch (e) {
        console.error("Error init voting:", e);
    }
}

async function loadCandidates(container) {
    try {
        const q = collection(db, "candidates");
        const snapshot = await getDocs(q);
        
        candidatesCache = [];
        snapshot.forEach(doc => candidatesCache.push({ id: doc.id, ...doc.data() }));

        if (candidatesCache.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#888;">
                    <i class="fa-solid fa-folder-open" style="font-size:30px;"></i>
                    <p>No approved candidates found.</p>
                </div>`;
            return;
        }

        const positions = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "P.R.O"];
        let html = '';

        positions.forEach(pos => {
            const cands = candidatesCache.filter(c => c.position === pos);
            if (cands.length > 0) {
                html += `
                <div class="position-section">
                    <h3 style="border-left: 5px solid var(--primary-blue); padding-left: 10px; margin-bottom: 20px; color: var(--dark-blue);">
                        ${pos}
                    </h3>
                    <div class="candidates-row" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
                        ${cands.map(c => createCandidateCard(c)).join('')}
                    </div>
                </div>
                <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;">
                `;
            }
        });

        container.innerHTML = html;
        setupSelectionListeners();

    } catch (error) {
        console.error("Error loading candidates:", error);
        container.innerHTML = `<p style="color:red; text-align:center;">Error loading ballot.</p>`;
    }
}

function createCandidateCard(c) {
    const img = c.photoUrl || 'https://img.freepik.com/free-icon/user_318-159711.jpg';
    return `
    <div class="vote-card" id="card-${c.id}" style="background: white; padding: 20px; border-radius: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 2px solid transparent; transition: 0.3s;">
        <img src="${img}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 15px;">
        <h4 style="color: var(--dark-blue); font-size: 18px; margin-bottom: 5px;">${c.name}</h4>
        <p style="color: #666; font-size: 13px; margin-bottom: 15px;">${c.party}</p>
        <button class="btn-select-candidate" data-id="${c.id}" data-pos="${c.position}" 
            style="width: 100%; padding: 8px; border-radius: 20px; border: none; background: #f0f0f0; color: #555; cursor: pointer; font-weight: 600;">
            Select
        </button>
    </div>`;
}

function setupSelectionListeners() {
    document.querySelectorAll('.btn-select-candidate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const pos = e.target.dataset.pos;
            
            // Deselect others in same position
            const allInPos = candidatesCache.filter(c => c.position === pos);
            allInPos.forEach(c => {
                const card = document.getElementById(`card-${c.id}`);
                const b = card.querySelector('button');
                card.style.borderColor = "transparent";
                card.style.background = "white";
                b.style.background = "#f0f0f0";
                b.style.color = "#555";
                b.textContent = "Select";
            });

            // Select this one
            const activeCard = document.getElementById(`card-${id}`);
            const activeBtn = activeCard.querySelector('button');
            activeCard.style.borderColor = "#0099ff";
            activeCard.style.background = "#f0f9ff";
            activeBtn.style.background = "#0099ff";
            activeBtn.style.color = "white";
            activeBtn.textContent = "Selected";

            userSelections[pos] = id;
        });
    });
}

async function handleSubmitVote() {
    if (Object.keys(userSelections).length === 0) return alert("Select at least one candidate.");
    if (!confirm("Submit votes? This is final.")) return;

    try {
        const batch = writeBatch(db);
        batch.update(doc(db, "users", auth.currentUser.uid), { hasVoted: true });
        Object.values(userSelections).forEach(id => {
            batch.update(doc(db, "candidates", id), { voteCount: increment(1) });
        });

        await batch.commit();
        alert("Vote Submitted!");
        showVotedState();
    } catch (e) {
        console.error(e);
        alert("Submission failed.");
    }
}

function showVotedState() {
    document.getElementById('voteStatusBanner').classList.remove('hidden');
    document.getElementById('candidatesContainer').classList.add('hidden');
    const submitBtn = document.getElementById('finalSubmitBtn');
    if(submitBtn) submitBtn.classList.add('hidden');
    
    const dashBtn = document.getElementById('btnGoToVote');
    if(dashBtn) {
        dashBtn.textContent = "View Status";
        dashBtn.disabled = true;
    }
}