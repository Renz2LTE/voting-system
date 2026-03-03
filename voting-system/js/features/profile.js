/* js/features/profile.js */
import { db, auth, storage } from "../firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

export function initProfileFeature() {
    const btnEdit = document.getElementById('btnEditProfile');
    const btnSave = document.getElementById('btnSaveProfile');
    
    if(!btnEdit || !btnSave) return;

    // Reset Listeners
    const newEdit = btnEdit.cloneNode(true);
    const newSave = btnSave.cloneNode(true);
    btnEdit.parentNode.replaceChild(newEdit, btnEdit);
    btnSave.parentNode.replaceChild(newSave, btnSave);

    newEdit.addEventListener('click', enableEditMode);
    newSave.addEventListener('click', saveProfileChanges);
}

function enableEditMode() {
    const inputs = document.querySelectorAll('.profile-input');
    const btnEdit = document.getElementById('btnEditProfile');
    const btnSave = document.getElementById('btnSaveProfile');
    const imgGroup = document.getElementById('imgUploadGroup');

    const editableIds = ['p_phone', 'p_email', 'p_address', 'p_birthday', 'p_image_upload'];
    inputs.forEach(input => {
        if(editableIds.includes(input.id)) {
            input.disabled = false;
            input.style.border = "1px solid var(--primary-blue)";
            input.style.backgroundColor = "#fff";
        }
    });

    if(imgGroup) imgGroup.classList.remove('hidden');
    btnEdit.classList.add('hidden');
    btnSave.classList.remove('hidden');
}

async function saveProfileChanges() {
    const user = auth.currentUser;
    if(!user) return;

    const btnSave = document.getElementById('btnSaveProfile');
    const btnEdit = document.getElementById('btnEditProfile');
    const inputs = document.querySelectorAll('.profile-input');
    const fileInput = document.getElementById('p_image_upload');
    const imgGroup = document.getElementById('imgUploadGroup');

    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btnSave.disabled = true;

    try {
        let updates = {
            phone: document.getElementById('p_phone').value,
            email: document.getElementById('p_email').value,
            address: document.getElementById('p_address').value,
            birthday: document.getElementById('p_birthday').value
        };

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            updates.photoUrl = downloadURL;
            
            // Update UI
            document.getElementById('topAvatar').src = downloadURL;
            document.getElementById('settingsProfileImg').src = downloadURL;
            document.getElementById('sidebarAvatarImg').src = downloadURL;
            document.getElementById('sidebarAvatarImg').style.display = 'block';
            document.getElementById('sidebarAvatarIcon').style.display = 'none';
        }

        await updateDoc(doc(db, "users", user.uid), updates);
        alert("Profile updated!");

        // Reset UI
        inputs.forEach(input => {
            input.disabled = true;
            input.style.border = "1px solid #e0e0e0";
            input.style.backgroundColor = "#fdfdfd";
        });
        if(imgGroup) imgGroup.classList.add('hidden');

        btnSave.classList.add('hidden');
        btnSave.innerHTML = '<i class="fa-solid fa-check"></i> Save';
        btnSave.disabled = false;
        btnEdit.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        alert("Update failed. Check console.");
        btnSave.disabled = false;
    }
}