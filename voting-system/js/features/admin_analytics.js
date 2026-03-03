/* js/features/admin_analytics.js */
import { db } from "../firebase-config.js";
import { 
    collection, onSnapshot, query, getDocs 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let chartInstance = null;
let allCandidates = []; 
let currentOrgFilter = 'all'; 
let currentPosFilter = 'President';

export async function initAdminAnalytics() {
    const ctx = document.getElementById('adminResultsChart');
    if (!ctx) return; 

    // Inject controls OUTSIDE the canvas wrapper so it doesn't break scaling
    setupAnalyticsControls(ctx);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Votes',
                data: [],
                backgroundColor: 'rgba(0, 91, 181, 0.7)', 
                borderColor: 'rgba(0, 91, 181, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Live Election Results' }
            }
        }
    });

    await loadOrgOptions();

    const q = query(collection(db, "candidates"));
    onSnapshot(q, (snapshot) => {
        allCandidates = [];
        snapshot.forEach(doc => allCandidates.push(doc.data()));
        updateChartDisplay();
    });
}

function setupAnalyticsControls(canvasElement) {
    // FIX: Insert controls BEFORE the chart wrapper (inside the Card container)
    // This ensures it expands the card height instead of squishing the chart
    const chartWrapper = canvasElement.parentElement;
    const cardContainer = chartWrapper.parentElement; 

    if (document.getElementById('adminAnalyticsControls')) return; 

    const controls = document.createElement('div');
    controls.id = 'adminAnalyticsControls';
    
    controls.style.cssText = `
        display: flex; 
        gap: 15px; 
        margin-bottom: 20px; 
        align-items: center; 
        background: #f8f9fa; 
        padding: 15px; 
        border-radius: 10px; 
        border: 1px solid #eee;
        flex-wrap: wrap;
    `;
    
    controls.innerHTML = `
        <div style="flex:1; min-width: 200px;">
            <h4 style="margin:0; color:var(--dark-blue); font-size:15px; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-filter" style="color:#888;"></i> Filter Results
            </h4>
            <p style="margin:0; font-size:12px; color:#666;">Customize the chart view</p>
        </div>
        
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <div style="position:relative;">
                <i class="fa-solid fa-sitemap" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#888; font-size:12px; pointer-events:none;"></i>
                <select id="adminAnalyticsOrgSelect" style="padding:10px 15px 10px 35px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:13px; color:#444; cursor:pointer; background:white; min-width:180px;">
                    <option value="all">Global (All Orgs)</option>
                </select>
            </div>

            <div style="position:relative;">
                <i class="fa-solid fa-user-tag" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#888; font-size:12px; pointer-events:none;"></i>
                <select id="adminAnalyticsPosSelect" style="padding:10px 15px 10px 35px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:13px; color:#444; cursor:pointer; background:white; min-width:150px;">
                    <option value="President">President</option>
                    <option value="Vice President">Vice President</option>
                    <option value="Secretary">Secretary</option>
                    <option value="Treasurer">Treasurer</option>
                    <option value="Auditor">Auditor</option>
                    <option value="P.R.O">P.R.O</option>
                </select>
            </div>
        </div>
    `;

    // Secure Insertion Logic
    if (cardContainer && cardContainer.classList.contains('card')) {
        cardContainer.insertBefore(controls, chartWrapper);
    } else {
        chartWrapper.insertBefore(controls, canvasElement);
    }

    document.getElementById('adminAnalyticsOrgSelect').addEventListener('change', (e) => {
        currentOrgFilter = e.target.value;
        updateChartDisplay();
    });
    document.getElementById('adminAnalyticsPosSelect').addEventListener('change', (e) => {
        currentPosFilter = e.target.value;
        updateChartDisplay();
    });
}

async function loadOrgOptions() {
    const select = document.getElementById('adminAnalyticsOrgSelect');
    if(!select) return;

    try {
        const snap = await getDocs(collection(db, "organizations"));
        snap.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = doc.data().name;
            select.appendChild(opt);
        });
    } catch(e) { console.error(e); }
}

function updateChartDisplay() {
    if (!chartInstance) return;

    let filtered = allCandidates;

    if (currentOrgFilter !== 'all') {
        filtered = filtered.filter(c => c.party === currentOrgFilter);
    }
    filtered = filtered.filter(c => c.position === currentPosFilter);
    filtered.sort((a, b) => b.voteCount - a.voteCount);

    chartInstance.data.labels = filtered.map(c => c.name);
    chartInstance.data.datasets[0].data = filtered.map(c => c.voteCount);
    
    let titleText = `${currentPosFilter} Race`;
    const orgSelect = document.getElementById('adminAnalyticsOrgSelect');
    if (orgSelect && currentOrgFilter !== 'all') {
        titleText = `${orgSelect.options[orgSelect.selectedIndex].text} - ${currentPosFilter}`;
    } else {
        titleText = `Overall ${currentPosFilter} Race`;
    }
    
    chartInstance.options.plugins.title.text = titleText;
    chartInstance.update();
}