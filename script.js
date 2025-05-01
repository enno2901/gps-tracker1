let lastPosition = null;
let totalDistance = 0;
let totalPoints = 0;
let username = localStorage.getItem("username");

// Firebase SDK importieren (falls nicht bereits erledigt)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

// Deine Firebase Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyAYIA6Z6IQzikee8yyfOQGHIJ9lmBu5sa8",
  authDomain: "gps-tracker-4d035.firebaseapp.com",
  projectId: "gps-tracker-4d035",
  storageBucket: "gps-tracker-4d035.firebasestorage.app",
  messagingSenderId: "352979419131",
  appId: "1:352979419131:web:919031e09134ab2f13955e",
  measurementId: "G-8LY8TK9BHR"
};

// Firebase-App initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Benutzername prüfen und ggf. setzen
window.addEventListener("load", () => {
  if (!username) {
    const usernameInput = document.getElementById("usernameInput");
    username = usernameInput ? usernameInput.value.trim() : "";

    if (username) {
      localStorage.setItem("username", username);
      saveToFirebase(username, totalPoints);
    } else {
      alert("Bitte gib deinen Namen im Feld oben ein, um deine Punkte zu speichern.");
    }
  }

  const savedDistance = localStorage.getItem("totalDistance");
  const savedPoints = localStorage.getItem("totalPoints");

  if (savedDistance) {
    totalDistance = parseFloat(savedDistance);
    totalPoints = parseInt(savedPoints);
    document.getElementById("total_Count").textContent = totalDistance.toFixed(2) + " m";
    document.getElementById("total_Points").textContent = totalPoints;
  }

  fetchTopScores();
});

// Punkte beim Verlassen der Seite speichern
window.addEventListener("beforeunload", () => {
  if (username) saveToFirebase(username, totalPoints);
});

document.getElementById("startBtn").addEventListener("click", () => {
  console.log("Tracking gestartet.");

  if (!navigator.geolocation) {
    alert("Geolocation wird nicht unterstützt.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      document.body.insertAdjacentHTML("beforeend", "<p>📍 GPS aktiviert</p>");
      startTracking();
    },
    err => {
      console.error("GPS-Fehler:", err.message);
      alert("GPS-Zugriff fehlgeschlagen: " + err.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
});

function startTracking() {
  navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const current = { latitude, longitude };

    if (lastPosition) {
      const distance = calculateDistance(lastPosition, current);
      if (distance > 2.8 && distance < 10) {
        totalDistance += distance;
        localStorage.setItem("totalDistance", totalDistance);
        addPointsRow(distance);
      }
    }

    lastPosition = current;
  }, error => {
    console.error("Tracking-Fehler:", error.message);
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  });
}

function addPointsRow(distance) {
  const table = document.getElementById("pointsTable");
  const row = table.insertRow();
  const timeCell = row.insertCell(0);
  const distCell = row.insertCell(1);
  const pointsCell = row.insertCell(2);

  const points = Math.round(distance);
  const now = new Date();
  totalPoints += points;
  localStorage.setItem("totalPoints", totalPoints);

  timeCell.textContent = now.toLocaleTimeString();
  distCell.textContent = distance.toFixed(1);
  pointsCell.textContent = points;

  document.getElementById("total_Count").textContent = totalDistance.toFixed(2) + " m";
  document.getElementById("total_Points").textContent = totalPoints;

  // 🔥 Punkte direkt nach jedem Schritt speichern
  saveToFirebase(username, totalPoints);
}


function saveToFirebase(username, points) {
  const userRef = doc(db, "highScores", username);
  setDoc(userRef, {
    points: points,
    timestamp: serverTimestamp(),
  }).then(() => {
    console.log("Gesamtpunktzahl gespeichert.");
    fetchTopScores();
  }).catch(error => {
    console.error("Fehler beim Speichern:", error);
  });
}

function fetchTopScores() {
  const table = document.getElementById("leaderboardTable");
  if (!table) return;
  table.innerHTML = '';

  const q = query(collection(db, "highScores"), orderBy("points", "desc"), limit(10));

  getDocs(q)
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const row = table.insertRow();
        row.insertCell(0).textContent = doc.id;
        row.insertCell(1).textContent = data.points;
      });
    })
    .catch(err => {
      console.error("Fehler beim Laden der Bestenliste:", err);
    });
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function calculateDistance(pos1, pos2) {
  const R = 6371e3; // Erdradius in Metern
  const φ1 = toRadians(pos1.latitude);
  const φ2 = toRadians(pos2.latitude);
  const Δφ = toRadians(pos2.latitude - pos1.latitude);
  const Δλ = toRadians(pos2.longitude - pos1.longitude);

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Entfernung in Metern
}
