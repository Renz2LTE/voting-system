/* js/features/voting.js */
import { db, auth } from "../firebase-config.js";
import { 
    collection, getDocs, doc, writeBatch, increment, getDoc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// State
let selections = {}; 
let candidatesCache = [];
let orgsCache = [];
let currentUserData = null;

export async function initVotingFeature() {
    const container = document.getElementById('candidatesContainer');
    if(!container) return;

    try {
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        
        currentUserData = { votedOrgs: [], hasVoted: false, strand: null };

        if (userSnap.exists()) {
            const data = userSnap.data();
            currentUserData = {
                ...data,
                votedOrgs: data.votedOrgs || []
            };
        }

        await loadVotingData(container);

    } catch (e) {
        console.error("Error init voting:", e);
        container.innerHTML = `<p style="color:red; text-align:center;">Error initializing voting system.</p>`;
    }
}

async function loadVotingData(container) {
    container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading Ballots...</div>';
    
    try {
        const [candsSnap, orgsSnap] = await Promise.all([
            getDocs(collection(db, "candidates")),
            getDocs(collection(db, "organizations"))
        ]);

        candidatesCache = [];
        candsSnap.forEach(doc => candidatesCache.push({ id: doc.id, ...doc.data() }));

        orgsCache = [];
        orgsSnap.forEach(doc => orgsCache.push({ id: doc.id, ...doc.data() }));

        renderBallots(container);

    } catch (error) {
        console.error("Error loading data:", error);
        container.innerHTML = `<p style="color:red; text-align:center;">Error loading ballots.</p>`;
    }
}

function renderBallots(container) {
    container.innerHTML = "";
    const banner = document.getElementById('voteStatusBanner');
    if(banner) banner.classList.add('hidden');
    
    const globalSubmit = document.getElementById('finalSubmitBtn');
    if(globalSubmit) globalSubmit.style.display = 'none'; 

    // Filter Active Elections AND Strand
    const activeOrgs = orgsCache.filter(o => {
        if (o.electionStatus !== 'Voting') return false;
        
        // Multi-Strand Check
        let allowedStrands = [];
        if (Array.isArray(o.allowedStrands)) {
            allowedStrands = o.allowedStrands;
        } else if (o.allowedStrand) {
            allowedStrands = [o.allowedStrand];
        } else {
            allowedStrands = ['All'];
        }

        const userStrand = currentUserData.strand;
        
        if (allowedStrands.includes('All') || allowedStrands.includes(userStrand)) return true;
        
        return false; 
    });

    if (activeOrgs.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:50px; color:#888;">
                <i class="fa-solid fa-calendar-xmark" style="font-size:40px; margin-bottom:15px;"></i>
                <h3>No Active Elections</h3>
                <p>There are no open ballots for your strand at this time.</p>
            </div>`;
        return;
    }

    activeOrgs.forEach(org => {
        const hasVotedForOrg = currentUserData.votedOrgs && currentUserData.votedOrgs.includes(org.id);
        
        const orgSection = document.createElement('div');
        orgSection.className = "card";
        orgSection.style.marginBottom = "30px";
        orgSection.style.borderTop = "5px solid var(--primary-blue)";

        let html = `
            <div style="border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h2 style="color:var(--dark-blue); font-size:24px;">${org.name}</h2>
                    <p style="color:#666; font-size:13px;">Official Ballot</p>
                </div>
                ${hasVotedForOrg ? 
                    '<span style="background:#e8f5e9; color:#2e7d32; padding:5px 12px; border-radius:20px; font-weight:600; font-size:12px;"><i class="fa-solid fa-check"></i> Voted</span>' : 
                    '<span style="background:#e3f2fd; color:#1976d2; padding:5px 12px; border-radius:20px; font-weight:600; font-size:12px;">Voting Open</span>'
                }
            </div>
        `;

        if (hasVotedForOrg) {
            html += `<div style="text-align:center; padding:30px; color:#2e7d32;">
                        <i class="fa-solid fa-circle-check" style="font-size:50px; margin-bottom:10px;"></i>
                        <p>You have already cast your vote for ${org.name}.</p>
                     </div>`;
        } else {
            const orgCandidates = candidatesCache.filter(c => c.party === org.id);
            if (orgCandidates.length === 0) {
                html += `<p style="text-align:center; color:#999; padding: 20px;">No candidates found for this organization.</p>`;
            } else {
                html += renderOrgBallot(org, orgCandidates);
            }
        }

        orgSection.innerHTML = html;
        container.appendChild(orgSection);

        if (!hasVotedForOrg) {
            setupOrgListeners(orgSection, org.id);
        }
    });

    document.querySelectorAll('.btn-view-platform').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const platform = e.target.dataset.platform;
            const name = e.target.dataset.name;
            alert(`${name}'s Platform:\n\n${platform}`);
        });
    });
}

function renderOrgBallot(org, candidates) {
    const positions = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "P.R.O"];
    let html = `<div id="ballot-${org.id}">`;

    positions.forEach(pos => {
        const posCandidates = candidates.filter(c => c.position === pos);
        if (posCandidates.length > 0) {
            html += `
                <h4 style="color:#555; margin-bottom:15px; font-weight:700; text-transform:uppercase; font-size:14px; letter-spacing:1px;">${pos}</h4>
                <div class="candidates-row" style="margin-bottom:30px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                    ${posCandidates.map(c => createCard(c)).join('')}
                </div>
            `;
        }
    });

    html += `
        <div style="text-align:right; margin-top:20px; border-top:1px solid #eee; padding-top:20px;">
            <button class="btn-vote-now btn-submit-org" data-org="${org.id}" style="border:none;">
                Submit Vote for ${org.name}
            </button>
        </div>
    </div>`;
    
    return html;
}

function createCard(c) {
    const img = c.photoUrl || 'https://img.freepik.com/free-icon/user_318-159711.jpg';
    const platformText = c.platform || "No platform provided.";
    const safePlatform = platformText.replace(/"/g, '&quot;');
    
    const orgObj = orgsCache.find(o => o.id === c.party);
    const orgName = orgObj ? orgObj.name : "Independent";

    return `
    <div class="vote-card" id="card-${c.id}" style="background:white; border-radius:15px; padding:20px; text-align:center; border:2px solid transparent; box-shadow:0 4px 10px rgba(0,0,0,0.05); transition:0.3s; position:relative; overflow:hidden;">
        <img src="${img}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin-bottom:10px;">
        <h4 style="font-size:16px; margin-bottom:5px; color:var(--dark-blue);">${c.name}</h4>
        <p style="font-size:12px; color:#666; margin-bottom:15px;">${orgName}</p>
        
        <div style="display:flex; gap:5px; justify-content:center; margin-bottom:10px;">
            <button class="btn-view-platform" data-platform="${safePlatform}" data-name="${c.name}" 
                style="background:none; border:none; color:var(--primary-blue); font-size:11px; cursor:pointer; text-decoration:underline;">
                View Platform
            </button>
        </div>
        
        <button class="btn-select-candidate" data-id="${c.id}" data-pos="${c.position}" data-org="${c.party}"
            style="width:100%; padding:8px; border-radius:20px; border:none; background:#f0f0f0; color:#555; cursor:pointer; font-weight:600; font-size:13px;">
            Select
        </button>
    </div>`;
}

function setupOrgListeners(container, orgId) {
    container.querySelectorAll('.btn-select-candidate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const pos = e.target.dataset.pos;
            
            if (!selections[orgId]) selections[orgId] = {};

            const allInPos = candidatesCache.filter(c => c.position === pos && c.party === orgId);
            allInPos.forEach(c => {
                const card = document.getElementById(`card-${c.id}`);
                if(card) {
                    card.style.borderColor = "transparent";
                    card.style.backgroundColor = "white";
                    const b = card.querySelector('.btn-select-candidate');
                    b.textContent = "Select";
                    b.style.background = "#f0f0f0";
                    b.style.color = "#555";
                }
            });

            const activeCard = document.getElementById(`card-${id}`);
            activeCard.style.borderColor = "var(--primary-blue)";
            activeCard.style.backgroundColor = "#f0f9ff";
            const activeBtn = activeCard.querySelector('.btn-select-candidate');
            activeBtn.textContent = "Selected";
            activeBtn.style.background = "var(--primary-blue)";
            activeBtn.style.color = "white";

            selections[orgId][pos] = id;
        });
    });

    const submitBtn = container.querySelector('.btn-submit-org');
    if(submitBtn) {
        submitBtn.addEventListener('click', () => handleSubmitOrgVote(orgId));
    }
}

async function handleSubmitOrgVote(orgId) {
    const orgSelections = selections[orgId] || {};
    
    if (Object.keys(orgSelections).length === 0) {
        return alert("Please select at least one candidate before submitting.");
    }

    if (!confirm(`Confirm vote for this organization? This action is final.`)) return;

    try {
        const batch = writeBatch(db);
        const userRef = doc(db, "users", auth.currentUser.uid);
        
        batch.update(userRef, {
            votedOrgs: arrayUnion(orgId),
            hasVoted: true 
        });

        Object.values(orgSelections).forEach(candId => {
            const candRef = doc(db, "candidates", candId);
            batch.update(candRef, { voteCount: increment(1) });
        });

        await batch.commit();
        alert("Vote Submitted Successfully!");
        initVotingFeature(); 

    } catch (e) {
        console.error(e);
        alert("Submission failed. Please try again.");
    }
}