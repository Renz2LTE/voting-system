/* js/features/admin_reports.js */
import { db } from "../firebase-config.js";
import { collection, getDocs, orderBy, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export async function initReportsFeature() {
    console.log("Initializing Reports...");
    
    // Load the Audit Table immediately when this feature is called
    await loadAuditLog();
    
    // Setup Print Button
    const printBtn = document.getElementById('btnPrintReport');
    if(printBtn) {
        // Remove old listeners to prevent duplicates
        const newBtn = printBtn.cloneNode(true);
        printBtn.parentNode.replaceChild(newBtn, printBtn);
        newBtn.addEventListener('click', generatePrintableReport);
    }
}

async function loadAuditLog() {
    const tableBody = document.getElementById('auditTableBody');
    if(!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#888;">Loading audit logs...</td></tr>';

    try {
        // Fetch ALL users who have voted
        const q = query(collection(db, "users"), where("hasVoted", "==", true));
        const snapshot = await getDocs(q);

        tableBody.innerHTML = "";

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#888;">No votes cast yet.</td></tr>';
            return;
        }

        let count = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid #eee";
            
            // Note: In a real production app, you would save a 'votedAt' timestamp. 
            // For now, we list them to show they have successfully participated.
            
            row.innerHTML = `
                <td style="padding:12px;">${count++}</td>
                <td style="padding:12px;"><strong>${data.first_name} ${data.last_name}</strong></td>
                <td style="padding:12px;">${data.student_id}</td>
                <td style="padding:12px; color:green; font-weight:600;">Verified</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Audit error:", error);
        tableBody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error loading data.</td></tr>';
    }
}

async function generatePrintableReport() {
    // 1. Fetch Latest Results
    const qCands = query(collection(db, "candidates")); 
    const snap = await getDocs(qCands);
    
    let candidatesData = [];
    snap.forEach(d => candidatesData.push(d.data()));

    // 2. Group by Position
    const positions = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "P.R.O"];
    let resultsHtml = '';

    positions.forEach(pos => {
        const cands = candidatesData.filter(c => c.position === pos);
        // Sort by highest votes
        cands.sort((a,b) => b.voteCount - a.voteCount);

        if(cands.length > 0) {
            resultsHtml += `
                <div style="margin-bottom: 30px;">
                    <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">${pos}</h3>
                    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                        <tr style="background:#f0f0f0; text-align:left;">
                            <th style="padding:8px; border:1px solid #ddd;">Candidate</th>
                            <th style="padding:8px; border:1px solid #ddd;">Party</th>
                            <th style="padding:8px; border:1px solid #ddd; text-align:center;">Votes</th>
                        </tr>
            `;
            
            cands.forEach(c => {
                resultsHtml += `
                    <tr>
                        <td style="padding:8px; border:1px solid #ddd;">${c.name}</td>
                        <td style="padding:8px; border:1px solid #ddd;">${c.party}</td>
                        <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:bold;">${c.voteCount}</td>
                    </tr>
                `;
            });
            resultsHtml += `</table></div>`;
        }
    });

    // 3. Open Print Window
    const win = window.open('', '', 'height=800,width=1000');
    const date = new Date().toLocaleString();

    win.document.write(`
        <html>
        <head>
            <title>Official Election Report</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                h1 { text-align: center; margin-bottom: 5px; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px;}
            </style>
        </head>
        <body>
            <div class="header">
                <img src="1998832.webp" style="width: 60px; margin-bottom: 10px;">
                <h1>Informatics College Election Report</h1>
                <p>Official Results Generated on: ${date}</p>
            </div>
            
            ${resultsHtml}

            <div class="footer">
                <p>--- End of Official Report ---</p>
                <p>System Generated by Online Voting System | Certified Correct</p>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    
    win.document.close();
}