/* js/features/public_orgs.js */
import { db, auth } from "../firebase-config.js";
import { 
    collection, getDocs, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let allCandidatesCache = [];
let organizationsCache = [];

export async function initPublicOrgsFeature() {
    const container = document.getElementById('publicOrgsGrid');
    if (!container) return;

    container.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1/-1;"><i class="fa-solid fa-spinner fa-spin"></i> Loading organizations...</p>`;

    try {
        const user = auth.currentUser;
        if (!user) return;
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userStrand = userSnap.exists() ? userSnap.data().strand : null;

        const [orgsSnap, candsSnap] = await Promise.all([
            getDocs(collection(db, "organizations")),
            getDocs(collection(db, "candidates"))
        ]);

        allCandidatesCache = [];
        candsSnap.forEach(doc => allCandidatesCache.push(doc.data()));

        organizationsCache = [];
        container.innerHTML = "";

        if (orgsSnap.empty) {
            container.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1/-1;">No organizations registered.</p>`;
            return;
        }

        let visibleCount = 0;

        orgsSnap.forEach(docSnap => {
            const org = { id: docSnap.id, ...docSnap.data() };
            organizationsCache.push(org);
            
            let allowedStrands = [];
            if (Array.isArray(org.allowedStrands)) allowedStrands = org.allowedStrands;
            else if (org.allowedStrand) allowedStrands = [org.allowedStrand];
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
            
            const banner = org.bannerUrl ? 
                `<img src="${org.bannerUrl}" style="width:100%; height:120px; object-fit:cover; margin-bottom:15px;">` : 
                `<div style="width:100%; height:120px; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); margin-bottom:15px; display:flex; align-items:center; justify-content:center; color:#4f46e5; font-size:40px;"><i class="fa-solid fa-sitemap"></i></div>`;

            const shortMission = org.mission ? (org.mission.substring(0, 80) + (org.mission.length > 80 ? "..." : "")) : "No details provided.";

            card.innerHTML = `
                ${banner}
                <div style="padding: 0 20px 20px 20px; flex: 1; display: flex; flex-direction: column;">
                    <h3 style="color: var(--dark-blue); font-size: 22px; margin-bottom: 5px;">${org.name}</h3>
                    <span style="display:inline-block; background:#f1f5f9; color:#64748b; font-size:11px; padding:3px 10px; border-radius:12px; margin-bottom:15px;">Organization</span>
                    <p style="font-size:13px; color:#666; margin-bottom:20px; flex:1; line-height:1.5;">${shortMission}</p>
                    
                    <button class="btn-view-org" data-id="${org.id}" 
                        style="width:100%; padding:12px; border:none; background:var(--primary-blue); color:white; border-radius:8px; cursor:pointer; font-weight:600; transition:0.3s;">
                        <i class="fa-solid fa-users-viewfinder"></i> View Details & Candidates
                    </button>
                </div>
            `;
            
            container.appendChild(card);
            const viewBtn = card.querySelector('.btn-view-org');
            viewBtn.onmouseover = () => viewBtn.style.background = "var(--dark-blue)";
            viewBtn.onmouseout = () => viewBtn.style.background = "var(--primary-blue)";
            viewBtn.onclick = () => openOrgModal(org);
        });

        if (visibleCount === 0) {
            container.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1/-1;">No organizations available for your strand (${userStrand}).</p>`;
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = `<p style="color:red; text-align:center;">Failed to load details.</p>`;
    }
}

function openOrgModal(org) {
    const modal = document.getElementById('publicOrgModal');
    const content = document.getElementById('publicOrgModalContent');
    const closeBtn = document.getElementById('closePublicOrgModal');

    if(!modal || !content) return;

    const candidates = allCandidatesCache.filter(c => c.organizationId === org.id || c.party === org.id); 

    const renderMemberCard = (m) => {
        const photo = m.photoUrl || "https://img.freepik.com/free-icon/user_318-159711.jpg";
        const memberJson = encodeURIComponent(JSON.stringify(m));
        
        return `
            <div style="background:white; padding:20px; border-radius:12px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #f0f0f0; transition: transform 0.2s;">
                <img src="${photo}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin-bottom:10px; border:3px solid #e0e7ff;">
                <h4 style="font-size:16px; color:var(--dark-blue); margin-bottom:5px;">${m.name}</h4>
                <span style="font-size:12px; color:#1976d2; background:#e3f2fd; padding:3px 10px; border-radius:12px; font-weight:600; display:block; margin-bottom:5px;">${m.position}</span>
                <span style="font-size:10px; color:#64748b;">Partylist: <strong>${m.partylistName || 'Independent'}</strong></span>
                <div style="margin-top:15px;">
                    <button class="btn-read-platform" data-member="${memberJson}" style="background:none; border:1px solid var(--primary-blue); color:var(--primary-blue); padding:6px 15px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:600; width:100%; transition:0.3s;">
                        View Profile
                    </button>
                </div>
            </div>
        `;
    };

    let candHtml = candidates.length > 0 
        ? `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:20px; margin-bottom:30px;">${candidates.map(renderMemberCard).join('')}</div>` 
        : `<p style="color:#888; font-style:italic; margin-bottom:30px; text-align:center;">No candidates registered for this organization yet.</p>`;

    const banner = org.bannerUrl ? `<img src="${org.bannerUrl}" style="width:100%; height:200px; object-fit:cover;">` : `<div style="width:100%; height:200px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); display:flex; align-items:center; justify-content:center; color:white; font-size:60px;"><i class="fa-solid fa-sitemap"></i></div>`;

    content.innerHTML = `
        ${banner}
        <div style="padding: 30px; background:#f8f9fa;">
            <div style="text-align:center; margin-top:-60px; margin-bottom:30px;">
                <div style="background:white; display:inline-block; padding:20px 40px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
                    <h1 style="color:var(--dark-blue); font-size:28px; margin:0;">${org.name}</h1>
                    <span style="color:#666; font-size:13px; text-transform:uppercase; letter-spacing:1px;">Official Organization Profile</span>
                </div>
            </div>

            <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 30px;">
                <button id="btnTabCandidates" style="padding: 10px 20px; border: none; background: var(--dark-blue); color: white; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <i class="fa-solid fa-user-tie"></i> Official Candidates
                </button>
                <button id="btnTabMembers" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: 0.3s;">
                    <i class="fa-solid fa-users"></i> General Members
                </button>
            </div>
            
            <div id="candidatesSection" style="animation: fadeIn 0.4s ease-in-out;">
                <h3 style="color:var(--dark-blue); margin-bottom:20px; font-size:20px; border-bottom:2px solid #e0e7ff; padding-bottom:10px;">Candidates Running</h3>
                ${candHtml}
            </div>

            <div id="membersSection" style="display: none; animation: fadeIn 0.4s ease-in-out; text-align: center; padding: 40px 20px; background: white; border-radius: 12px; border: 1px dashed #e2e8f0;">
                <i class="fa-solid fa-users-slash" style="font-size: 40px; color: #cbd5e1; margin-bottom: 15px;"></i>
                <h3 style="color: #64748b; margin-bottom: 5px;">Members List Unavailable</h3>
                <p style="color: #94a3b8; font-size: 14px;">The general membership roster for this organization is not publicly visible during the election period.</p>
            </div>
        </div>
    `;

    const btnTabCandidates = document.getElementById('btnTabCandidates');
    const btnTabMembers = document.getElementById('btnTabMembers');
    const candidatesSection = document.getElementById('candidatesSection');
    const membersSection = document.getElementById('membersSection');

    if(btnTabCandidates && btnTabMembers) {
        btnTabCandidates.addEventListener('click', () => {
            candidatesSection.style.display = 'block'; membersSection.style.display = 'none';
            btnTabCandidates.style.background = 'var(--dark-blue)'; btnTabCandidates.style.color = 'white'; btnTabCandidates.style.border = 'none';
            btnTabMembers.style.background = 'white'; btnTabMembers.style.color = '#475569'; btnTabMembers.style.border = '1px solid #cbd5e1';
        });
        btnTabMembers.addEventListener('click', () => {
            candidatesSection.style.display = 'none'; membersSection.style.display = 'block';
            btnTabMembers.style.background = 'var(--dark-blue)'; btnTabMembers.style.color = 'white'; btnTabMembers.style.border = 'none';
            btnTabCandidates.style.background = 'white'; btnTabCandidates.style.color = '#475569'; btnTabCandidates.style.border = '1px solid #cbd5e1';
        });
    }

    content.querySelectorAll('.btn-read-platform').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const memberObj = JSON.parse(decodeURIComponent(e.target.dataset.member));
            showCandidateProfile(memberObj, org);
        });
        btn.onmouseover = () => { btn.style.background = "var(--primary-blue)"; btn.style.color = "white"; };
        btn.onmouseout = () => { btn.style.background = "none"; btn.style.color = "var(--primary-blue)"; };
    });

    modal.classList.remove('hidden');
    modal.classList.add('active');

    if(closeBtn) closeBtn.onclick = () => { modal.classList.remove('active'); modal.classList.add('hidden'); };
}

async function showCandidateProfile(candidate, org) {
    const content = document.getElementById('publicOrgModalContent');
    const photo = candidate.photoUrl || "https://img.freepik.com/free-icon/user_318-159711.jpg";
    
    content.innerHTML = `<div style="padding: 100px 20px; text-align: center; color: var(--primary-blue);"><i class="fa-solid fa-spinner fa-spin fa-3x"></i></div>`;

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
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        calculatedAge--;
                    }
                    age = calculatedAge;
                }
            }
        } catch (error) { console.error(error); }
    } else {
        yearLevel = "N/A (Demo)";
    }

    content.innerHTML = `
        <div style="background: white; position: sticky; top: 0; z-index: 10; padding: 15px 20px; border-bottom: 1px solid #eee; display:flex; align-items:center; gap:15px;">
            <button id="btnBackToOrg" style="background:#f1f5f9; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; color:#475569; font-weight:600; transition:0.2s;"><i class="fa-solid fa-arrow-left"></i> Back to ${org.name}</button>
            <span style="color:#94a3b8; font-size:14px;">Candidate Profile</span>
        </div>
        <div style="padding: 40px 20px; text-align: center; background: linear-gradient(180deg, #f8fafc 0%, white 100%);">
            <img src="${photo}" style="width: 160px; height: 160px; border-radius: 50%; object-fit: cover; border: 5px solid white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); margin-bottom:20px;">
            <h1 style="color: var(--dark-blue); font-size: 32px; margin-bottom: 5px;">${candidate.name}</h1>
            <h3 style="color: #1976d2; font-weight: 600; margin-bottom: 10px;">Running for ${candidate.position}</h3>
            <span style="background:#e0e7ff; color:#4f46e5; padding:4px 15px; border-radius:20px; font-size:12px; font-weight:700; text-transform:uppercase;">${candidate.partylistName || 'Independent Candidate'}</span>
            
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 25px; flex-wrap: wrap;">
                <div style="background: white; padding: 12px 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02); min-width: 100px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Age</div><div style="font-weight: 700; color: #334155; font-size: 16px;">${age}</div></div>
                <div style="background: white; padding: 12px 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02); min-width: 100px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Year Level</div><div style="font-weight: 700; color: #334155; font-size: 16px;">${yearLevel}</div></div>
                <div style="background: white; padding: 12px 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02); min-width: 100px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Strand</div><div style="font-weight: 700; color: #334155; font-size: 16px;">${strand}</div></div>
            </div>

            <!-- NEW: Modified Profile View to display Achievements -->
            <div style="max-width: 700px; margin: 40px auto 0 auto; text-align: left; background: white; padding: 35px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
                <h3 style="color: var(--dark-blue); margin-bottom: 20px; font-size:20px;"><i class="fa-solid fa-bullhorn" style="color:var(--primary-blue);"></i> Campaign Platform</h3>
                <div style="line-height: 1.8; color: #475569; font-size: 15px; white-space: pre-wrap; padding:20px; background:#f8fafc; border-radius:8px; border-left:4px solid var(--primary-blue); margin-bottom: 25px;">${candidate.platform || "No details provided."}</div>

                <h3 style="color: var(--dark-blue); margin-bottom: 20px; font-size:20px;"><i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> Achievements & Awards</h3>
                <div style="line-height: 1.8; color: #475569; font-size: 15px; white-space: pre-wrap; padding:20px; background:#fffbeb; border-radius:8px; border-left:4px solid #f59e0b;">${candidate.achievements || "No achievements listed."}</div>
            </div>
        </div>
    `;

    document.getElementById('btnBackToOrg').onclick = () => openOrgModal(org);
}