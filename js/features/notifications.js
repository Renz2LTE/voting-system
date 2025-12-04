/* js/features/notifications.js */
import { db, auth } from "../firebase-config.js";
import { 
    collection, query, where, onSnapshot, orderBy, updateDoc, doc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function initNotificationFeature() {
    const user = auth.currentUser;
    if (!user) return;

    const bellBtn = document.getElementById('notificationBtn');
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    const dropdown = document.getElementById('notificationDropdown');

    if (!bellBtn || !badge || !list || !dropdown) return;

    // 1. Listen for Broadcast Notifications
    const qGlobal = query(
        collection(db, "notifications"), 
        where("type", "==", "global"),
        orderBy("timestamp", "desc")
    );

    onSnapshot(qGlobal, (snapshot) => {
        const notifications = [];
        let unreadCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            
            const isRead = data.readBy && data.readBy.includes(user.uid);
            if (!isRead) unreadCount++;

            notifications.push({ id, ...data, isRead });
        });

        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        renderNotifications(notifications, list);
    });

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            badge.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function renderNotifications(items, container) {
    if (items.length === 0) {
        container.innerHTML = `<li style="padding:15px; text-align:center; color:#888;">No notifications</li>`;
        return;
    }

    container.innerHTML = "";
    items.forEach(item => {
        const li = document.createElement('li');
        li.style.cssText = `
            padding: 12px 15px; border-bottom: 1px solid #eee; cursor: pointer;
            background: ${item.isRead ? 'white' : '#f0f9ff'};
            opacity: ${item.isRead ? '0.7' : '1'};
        `;
        
        li.innerHTML = `
            <div style="font-weight: 600; font-size: 14px; color: var(--dark-blue); margin-bottom: 3px; display: flex; justify-content: space-between;">
                <span>${item.title}</span>
                ${!item.isRead ? '<span style="width:8px; height:8px; background:red; border-radius:50%; display:inline-block;"></span>' : ''}
            </div>
            <div style="font-size: 13px; color: #555; line-height: 1.4;">${item.message}</div>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">Just now</div>
        `;

        li.addEventListener('click', () => markOneAsRead(item.id));
        container.appendChild(li);
    });
}

async function markOneAsRead(notifId) {
    const user = auth.currentUser;
    if(!user) return;
    try {
        const ref = doc(db, "notifications", notifId);
        await updateDoc(ref, { readBy: arrayUnion(user.uid) });
    } catch (e) { console.error(e); }
}