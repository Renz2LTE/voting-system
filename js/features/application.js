/* js/features/application.js */
import { db, auth } from "../firebase-config.js";
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export async function initApplicationFeature() {
    
    // 1. CHECK IF REGISTRATION IS OPEN
    // We check a specific document in the database called 'settings/election_controls'
    try {
        const settingsRef = doc(db, "settings", "election_controls");
        const settingsSnap = await getDoc(settingsRef);

        // Note: If the document doesn't exist yet, we assume it's closed
        if (!settingsSnap.exists() || !settingsSnap.data().isRegistrationOpen) {
            console.log("Candidacy Registration is currently CLOSED.");
            return; // Stop here, don't show the tab
        }

        // 2. IF OPEN, SHOW THE TAB
        const navItem = document.getElementById('nav-item-application');
        navItem.classList.remove('hidden');

        // 3. LOAD ORGANIZATIONS (to fill the dropdown)
        await loadOrganizations();

        // 4. SETUP EVENT LISTENERS
        setupFormListeners();

    } catch (error) {
        console.error("Error checking registration status:", error);
    }
}

async function loadOrganizations() {
    const orgSelect = document.getElementById('apply_org');
    
    // Clear current options (keep the first two: Select & Independent)
    // We rebuild the options to avoid duplicates if this runs twice
    orgSelect.innerHTML = `
        <option value="" disabled selected>Select Organization</option>
        <option value="Independent">Independent</option>
    `;

    try {
        const querySnapshot = await getDocs(collection(db, "organizations"));
        
        querySnapshot.forEach((doc) => {
            const org = doc.data();
            const option = document.createElement("option");
            option.value = doc.id; // The ID of the document
            option.textContent = org.name;
            orgSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Error loading organizations:", error);
    }
}

function setupFormListeners() {
    const positionSelect = document.getElementById('apply_position');
    const orgSelect = document.getElementById('apply_org');
    const newOrgGroup = document.getElementById('newOrgGroup');

    // Listener 1: Watch Position Selection
    // If they select "President", we allow them to Create a New Org
    positionSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        
        // Remove "Create New" option if it exists, so we don't add it twice
        const existingOption = orgSelect.querySelector('option[value="CREATE_NEW"]');
        if (existingOption) existingOption.remove();

        if (val === 'President') {
            const createOpt = document.createElement("option");
            createOpt.value = "CREATE_NEW";
            createOpt.textContent = "➕ Create New Organization";
            createOpt.style.fontWeight = "bold";
            createOpt.style.color = "#0099ff";
            orgSelect.appendChild(createOpt);
        } else {
            // If they change away from President, hide the input box
            newOrgGroup.classList.add('hidden');
            document.getElementById('new_org_name').value = ""; // clear it
        }
    });

    // Listener 2: Watch Org Selection
    orgSelect.addEventListener('change', (e) => {
        if (e.target.value === "CREATE_NEW") {
            newOrgGroup.classList.remove('hidden');
            document.getElementById('new_org_name').required = true;
        } else {
            newOrgGroup.classList.add('hidden');
            document.getElementById('new_org_name').required = false;
        }
    });

    // Listener 3: Form Submit
    document.getElementById('candidacyForm').addEventListener('submit', handleApplicationSubmit);
}

async function handleApplicationSubmit(e) {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return alert("You are not logged in!");

    const position = document.getElementById('apply_position').value;
    let orgId = document.getElementById('apply_org').value;
    const newOrgName = document.getElementById('new_org_name').value;

    if (!position || !orgId) return alert("Please fill all fields.");

    try {
        // Step A: If creating a new org, save it first
        if (orgId === "CREATE_NEW") {
            const orgRef = await addDoc(collection(db, "organizations"), {
                name: newOrgName,
                founderId: user.uid,
                status: "Pending", // Admin must approve the org too
                createdAt: new Date().toISOString()
            });
            orgId = orgRef.id; // Use the new ID
        }

        // Step B: Save the Application
        // We use the User's UID as the document ID so they can only apply once
        await setDoc(doc(db, "applications", user.uid), {
            uid: user.uid,
            applicantName: document.getElementById('topName').textContent, // Grab name from UI
            position: position,
            organizationId: orgId,
            status: "Pending", // Needs Admin Approval
            appliedAt: new Date().toISOString()
        });

        alert("Application Submitted! Please wait for admin approval.");
        document.getElementById('candidacyForm').reset();
        document.getElementById('newOrgGroup').classList.add('hidden');

    } catch (error) {
        console.error("Error submitting application:", error);
        alert("Submission failed. Check console for details.");
    }
}