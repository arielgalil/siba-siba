// adminApp.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  GoogleAuthProvider, signInWithPopup,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// במקום esm.sh – משתמשים בסקייפאק:
import React, { useState, useEffect } from "https://cdn.skypack.dev/react@18.2.0";
import { createRoot }                   from "https://cdn.skypack.dev/react-dom@18.2.0/client";

const firebaseConfig = { /* ...כמו שהיתה לך... */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

function AdminApp() {
  const [user, setUser]   = useState(null);
  const [admin, setAdmin] = useState(false);
  const [status, setStatus] = useState("טוען...");

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => onAuthStateChanged(auth, async (u) => {
        if (u) { setUser(u); await checkAdmin(u.uid); }
        else  { signInAnonymously(auth).catch(e=>setStatus("שגיאה אנונימית")); }
      }))
      .catch(() => setStatus("שגיאה בהגדרת Persistence"));
  }, []);

  async function checkAdmin(uid) {
    try {
      const snap = await get(ref(db, `admins/${uid}`));
      if (snap.exists() && snap.val()===true) {
        setAdmin(true); setStatus("ברוך הבא מנהל!");
      } else {
        setStatus("אין לך הרשאה לצפות");  
      }
    } catch {
      setStatus("שגיאה בבדיקת הרשאה");
    }
  }

  async function login() {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setStatus("שגיאה בהתחברות");
    }
  }

  if (!user) {
    return <main><h1>ניהול</h1><p>{status}</p></main>;
  }
  if (user && !admin) {
    return (
      <main>
        <h1>ניהול</h1>
        <p>{status}</p>
        <button onClick={login}>כניסת מנהל</button>
      </main>
    );
  }
  return (
    <main>
      <h1>ניהול</h1>
      <p>{status}</p>
      <p>כאן נוסיף בקרוב תצוגת קבוצות</p>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<AdminApp />);