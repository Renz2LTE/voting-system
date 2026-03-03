/* js/features/public_partylists.js */
import { db, auth } from "../firebase-config.js";
import { 
    collection, getDocs, doc, getDoc, addDoc, serverTimestamp, query, where 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let allCandidatesCache = [];

export async function initPublicPartylistsFeature() {
    setupPartylistRegistration();

    const container = document.getElementById('publicPartylistsGrid');
    if (!container) return;

    container.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1/-1;"><i class="fa-solid fa-spinner fa-spin"></i> Loading partylists...</p>`;

    try {
        const user = auth.currentUser;
        if (!user) return;
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userStrand = userSnap.exists() ? userSnap.data().strand : null;

        const [partiesSnap, candsSnap] = await Promise.all([
            getDocs(collection(db, "partylists")),
            getDocs(collection(db, "candidates"))
        ]);

        allCandidatesCache = [];
        candsSnap.forEach(doc => allCandidatesCache.push(doc.data()));

        container.innerHTML = "";

        if (partiesSnap.empty) {
            container.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1/-1;">No partylists registered yet.</p>`;
            return;
        }

        let visibleCount = 0;

        partiesSnap.forEach(docSnap => {
            const party = { id: docSnap.id, ...docSnap.data() };
            
            let allowedStrands = [];
            if (Array.isArray(party.allowedStrands)) allowedStrands = party.allowedStrands;
            else allowedStrands = ['All'];

            if (!allowedStrands.includes('All') && !allowedStrands.includes(userStrand)) return;
            
            visibleCount++;

            const card = document.createElement('div');
            card.className = "card";
            card.style.textAlign = "center";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.padding = "0"; 
            card.style.overflow = "hidden";
            
            const banner = `<div style="width:100%; height:120px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); margin-bottom:15px; display:flex; align-items:center; justify-content:center; color:white; font-size:40px;"><i class="fa-solid fa-users-line"></i></div>`;
            const shortMission = party.mission ? (party.mission.substring(0, 80) + (party.mission.length > 80 ? "..." : "")) : "No details provided.";

            card.innerHTML = `
                ${banner}
                <div style="padding: 0 20px 20px 20px; flex: 1; display: flex; flex-direction: column;">
                    <h3 style="color: var(--dark-blue); font-size: 22px; margin-bottom: 5px;">${party.name}</h3>
                    <span style="display:inline-block; background:#ecfdf5; color:#059669; font-size:11px; padding:3px 10px; border-radius:12px; margin-bottom:15px;">Political Partylist</span>
                    <p style="font-size:13px; color:#666; margin-bottom:20px; flex:1; line-height:1.5;">${shortMission}</p>
                    
                    <button class="btn-view-party" data-id="${party.id}" 
                        style="width:100%; padding:12px; border:none; background:#10b981; color:white; border-radius:8px; cursor:pointer; font-weight:600; transition:0.3s;">
                        <i class="fa-solid fa-users-viewfinder"></i> View Details & Roster
                    </button>
                </div>
            `;
            
            container.appendChild(card);
            const viewBtn = card.querySelector('.btn-view-party');
            viewBtn.onmouseover = () => viewBtn.style.background = "#059669";
            viewBtn.onmouseout = () => viewBtn.style.background = "#10b981";
            viewBtn.onclick = () => openPartyModal(party);
        });

        if (visibleCount === 0) {
            container.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1/-1;">No partylists available for your strand (${userStrand}).</p>`;
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = `<p style="color:red; text-align:center;">Failed to load partylists.</p>`;
    }
}

function setupPartylistRegistration() {
    const btnOpen = document.getElementById('btnOpenPartylistModal');
    const modal = document.getElementById('registerPartylistModal');
    const btnClose = document.getElementById('closePartylistModal');
    const form = document.getElementById('registerPartylistForm');

    if(btnClose && modal) {
        btnClose.onclick = () => { modal.classList.remove('active'); modal.classList.add('hidden'); };
    }

    if(form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Submitting...";

            try {
                const user = auth.currentUser;
                const userSnap = await getDoc(doc(db, "users", user.uid));
                const userName = userSnap.exists() ? `${userSnap.data().first_name} ${userSnap.data().last_name}` : "Student";

                const name = document.getElementById('partylist_name').value;
                const mission = document.getElementById('partylist_mission').value;
                const vision = document.getElementById('partylist_vision').value;
                
                const checkboxes = document.querySelectorAll('#partylist_strands input[type="checkbox"]:checked');
                let strands = Array.from(checkboxes).map(cb => cb.value);
                if(strands.length === 0) strands = ['All'];

                await addDoc(collection(db, "partylist_requests"), {
                    name: name,
                    mission: mission,
                    vision: vision,
                    allowedStrands: strands,
                    submitterUid: user.uid,
                    submitterName: userName,
                    status: "Pending",
                    createdAt: serverTimestamp()
                });

                alert("Partylist Registration Submitted successfully! Waiting for Admin approval.");
                newForm.reset();
                if(modal) { modal.classList.remove('active'); modal.classList.add('hidden'); }

            } catch(err) {
                console.error(err);
                alert("Failed to submit request.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Submit Application";
            }
        });
    }

    if(btnOpen && modal) {
        const newBtn = btnOpen.cloneNode(true);
        btnOpen.parentNode.replaceChild(newBtn, btnOpen);
        
        newBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if(!user) return;

            try {
                const q = query(collection(db, "partylist_requests"), where("submitterUid", "==", user.uid));
                const snap = await getDocs(q);
                const hasPending = snap.docs.some(doc => doc.data().status === 'Pending');
                
                if(hasPending) {
                    alert("You already have a pending partylist request. Please wait for admin approval.");
                    return;
                }
                modal.classList.remove('hidden');
                modal.classList.add('active');

            } catch (err) { console.error(err); alert("System error."); }
        });
    }
}

function openPartyModal(party) {
    const modal = document.getElementById('publicOrgModal'); // Reuses org modal skeleton
    const content = document.getElementById('publicOrgModalContent');
    const closeBtn = document.getElementById('closePublicOrgModal');

    if(!modal || !content) return;

    const candidates = allCandidatesCache.filter(c => c.partylistId === party.id); 
    
    const renderMemberCard = (m) => {
        const photo = m.photoUrl || "https://img.freepik.com/free-icon/user_318-159711.jpg";
        const memberJson = encodeURIComponent(JSON.stringify(m));

        return `
            <div style="background:white; padding:15px; border-radius:12px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.05); border:1px solid #f0f0f0;">
                <img src="${photo}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:10px; border:2px solid #10b981;">
                <h4 style="font-size:14px; color:var(--dark-blue); margin-bottom:5px;">${m.name}</h4>
                <span style="font-size:11px; color:#10b981; background:#ecfdf5; padding:3px 8px; border-radius:12px; font-weight:600;">${m.position}</span>
                <div style="margin-top:15px;">
                    <button class="btn-read-platform" data-member="${memberJson}" style="background:none; border:1px solid #10b981; color:#10b981; padding:6px 15px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:600; width:100%; transition:0.3s;">
                        View Profile
                    </button>
                </div>
            </div>
        `;
    };

    let candHtml = candidates.length > 0 
        ? `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:15px; margin-bottom:30px;">${candidates.map(renderMemberCard).join('')}</div>` 
        : `<p style="color:#888; font-style:italic; margin-bottom:30px; text-align:center;">No candidates running under this party yet.</p>`;

    const banner = `<div style="width:100%; height:200px; background: linear-gradient(135deg, #064e3b 0%, #10b981 100%); display:flex; align-items:center; justify-content:center; color:white; font-size:60px;"><i class="fa-solid fa-users-line"></i></div>`;

    content.innerHTML = `
        ${banner}
        <div style="padding: 30px; background:#f8f9fa;">
            <div style="text-align:center; margin-top:-60px; margin-bottom:30px;">
                <div style="background:white; display:inline-block; padding:20px 40px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
                    <h1 style="color:var(--dark-blue); font-size:28px; margin:0;">${party.name}</h1>
                    <span style="color:#666; font-size:13px; text-transform:uppercase; letter-spacing:1px;">Official Partylist Profile</span>
                </div>
            </div>
            
            <div style="background:white; padding:25px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.02); margin-bottom:30px; border:1px solid #eee;">
                <div style="display:flex; gap:30px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:250px;">
                        <h4 style="color:#10b981; font-size:14px; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;"><i class="fa-solid fa-bullseye"></i> Mission</h4>
                        <p style="color:#555; line-height:1.6; font-size:14px;">${party.mission || "Mission statement pending."}</p>
                    </div>
                    <div style="flex:1; min-width:250px;">
                        <h4 style="color:#10b981; font-size:14px; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;"><i class="fa-solid fa-eye"></i> Vision</h4>
                        <p style="color:#555; line-height:1.6; font-size:14px;">${party.vision || "Vision statement pending."}</p>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 30px;">
                <button id="btnTabCandidatesP" style="padding: 10px 20px; border: none; background: #10b981; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <i class="fa-solid fa-user-tie"></i> Official Candidates
                </button>
                <button id="btnTabMembersP" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: 0.3s;">
                    <i class="fa-solid fa-users"></i> Party Members
                </button>
            </div>
            
            <div id="candidatesSectionP" style="animation: fadeIn 0.4s ease-in-out;">
                <h3 style="color:var(--dark-blue); margin-bottom:20px; font-size:20px; border-bottom:2px solid #10b981; padding-bottom:10px;">Candidates Running</h3>
                ${candHtml}
            </div>

            <div id="membersSectionP" style="display: none; animation: fadeIn 0.4s ease-in-out; text-align: center; padding: 40px 20px; background: white; border-radius: 12px; border: 1px dashed #e2e8f0;">
                <i class="fa-solid fa-users-slash" style="font-size: 40px; color: #cbd5e1; margin-bottom: 15px;"></i>
                <h3 style="color: #64748b; margin-bottom: 5px;">Members List Unavailable</h3>
                <p style="color: #94a3b8; font-size: 14px;">The general membership roster for this partylist is not publicly visible.</p>
            </div>
        </div>
    `;

    // Tabs Logic
    const btnTabCandidates = document.getElementById('btnTabCandidatesP');
    const btnTabMembers = document.getElementById('btnTabMembersP');
    const candidatesSection = document.getElementById('candidatesSectionP');
    const membersSection = document.getElementById('membersSectionP');

    if(btnTabCandidates && btnTabMembers) {
        btnTabCandidates.addEventListener('click', () => {
            candidatesSection.style.display = 'block'; membersSection.style.display = 'none';
            btnTabCandidates.style.background = '#10b981'; btnTabCandidates.style.color = 'white'; btnTabCandidates.style.border = 'none';
            btnTabMembers.style.background = 'white'; btnTabMembers.style.color = '#475569'; btnTabMembers.style.border = '1px solid #cbd5e1';
        });

        btnTabMembers.addEventListener('click', () => {
            candidatesSection.style.display = 'none'; membersSection.style.display = 'block';
            btnTabMembers.style.background = '#10b981'; btnTabMembers.style.color = 'white'; btnTabMembers.style.border = 'none';
            btnTabCandidates.style.background = 'white'; btnTabCandidates.style.color = '#475569'; btnTabCandidates.style.border = '1px solid #cbd5e1';
        });
    }

    content.querySelectorAll('.btn-read-platform').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const memberObj = JSON.parse(decodeURIComponent(e.target.dataset.member));
            showCandidateProfile(memberObj, party);
        });
        btn.onmouseover = () => { btn.style.background = "#10b981"; btn.style.color = "white"; };
        btn.onmouseout = () => { btn.style.background = "none"; btn.style.color = "#10b981"; };
    });

    modal.classList.remove('hidden');
    modal.classList.add('active');

    if(closeBtn) closeBtn.onclick = () => { modal.classList.remove('active'); modal.classList.add('hidden'); };
}

async function showCandidateProfile(candidate, party) {
    const content = document.getElementById('publicOrgModalContent');
    const photo = candidate.photoUrl || "https://img.freepik.com/free-icon/user_318-159711.jpg";
    
    content.innerHTML = `<div style="padding: 100px 20px; text-align: center; color: #10b981;"><i class="fa-solid fa-spinner fa-spin fa-3x"></i></div>`;

    let age = "N/A", yearLevel = "N/A", strand = "N/A";
    if (candidate.userId && !candidate.userId.startsWith('dummy_')) {
        try {
            const userSnap = await getDoc(doc(db, "users", candidate.userId));
            if (userSnap.exists()) {
                const uData = userSnap.data();
                yearLevel = uData.year_level || "N/A";
                strand = uData.strand || "N/A";
                if (uData.birthday) {
                    const birthDate = new Date(uData.birthday);
                    const today = new Date();
                    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
                    age = calculatedAge;
                }
            }
        } catch (error) { console.error(error); }
    } else {
        yearLevel = "N/A (Demo)";
    }

    content.innerHTML = `
        <div style="background: white; position: sticky; top: 0; z-index: 10; padding: 15px 20px; border-bottom: 1px solid #eee; display:flex; align-items:center; gap:15px;">
            <button id="btnBackToParty" style="background:#ecfdf5; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; color:#065f46; font-weight:600; transition:0.2s;"><i class="fa-solid fa-arrow-left"></i> Back to ${party.name}</button>
            <span style="color:#94a3b8; font-size:14px;">Candidate Profile</span>
        </div>
        <div style="padding: 40px 20px; text-align: center; background: linear-gradient(180deg, #f8fafc 0%, white 100%);">
            <img src="${photo}" style="width: 160px; height: 160px; border-radius: 50%; object-fit: cover; border: 5px solid white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); margin-bottom:20px;">
            <h1 style="color: var(--dark-blue); font-size: 32px; margin-bottom: 5px;">${candidate.name}</h1>
            <h3 style="color: #10b981; font-weight: 600; margin-bottom: 10px;">Running for ${candidate.position}</h3>
            <span style="background:#ecfdf5; color:#059669; padding:4px 15px; border-radius:20px; font-size:12px; font-weight:700; text-transform:uppercase;">${party.name}</span>
            
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 25px; flex-wrap: wrap;">
                <div style="background: white; padding: 12px 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02); min-width: 100px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Age</div><div style="font-weight: 700; color: #334155; font-size: 16px;">${age}</div></div>
                <div style="background: white; padding: 12px 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02); min-width: 100px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Year Level</div><div style="font-weight: 700; color: #334155; font-size: 16px;">${yearLevel}</div></div>
                <div style="background: white; padding: 12px 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02); min-width: 100px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Strand</div><div style="font-weight: 700; color: #334155; font-size: 16px;">${strand}</div></div>
            </div>

            <!-- NEW: Modified Profile View to display Achievements -->
            <div style="max-width: 700px; margin: 40px auto 0 auto; text-align: left; background: white; padding: 35px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
                <h3 style="color: var(--dark-blue); margin-bottom: 20px; font-size:20px;"><i class="fa-solid fa-bullhorn" style="color:#10b981;"></i> Campaign Platform</h3>
                <div style="line-height: 1.8; color: #475569; font-size: 15px; white-space: pre-wrap; padding:20px; background:#f8fafc; border-radius:8px; border-left:4px solid #10b981; margin-bottom: 25px;">${candidate.platform || "No details provided."}</div>

                <h3 style="color: var(--dark-blue); margin-bottom: 20px; font-size:20px;"><i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> Achievements & Awards</h3>
                <div style="line-height: 1.8; color: #475569; font-size: 15px; white-space: pre-wrap; padding:20px; background:#fffbeb; border-radius:8px; border-left:4px solid #f59e0b;">${candidate.achievements || "No achievements listed."}</div>
            </div>
        </div>
    `;

    document.getElementById('btnBackToParty').onclick = () => openPartyModal(party);
}