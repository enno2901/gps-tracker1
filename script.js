import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyAYIA6Z6IQzikee8yyfOQGHIJ9lmBu5sa8",
  authDomain: "gps-tracker-4d035.firebaseapp.com",
  projectId: "gps-tracker-4d035",
  storageBucket: "gps-tracker-4d035.appspot.com",
  messagingSenderId: "352979419131",
  appId: "1:352979419131:web:919031e09134ab2f13955e",
  measurementId: "G-8LY8TK9BHR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Globale Variablen
let lastPosition = null;
let totalDistance = 0;
let totalPoints = 0;
let username = localStorage.getItem("username");
let map, marker;

// Nach dem Laden der Seite
window.addEventListener("load", () => {
  document.getElementById("startBtn").addEventListener("click", startTracking);

  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.addEventListener("change", () => {
      username = usernameInput.value.trim();
      localStorage.setItem("username", username);
    });
  }

  const savedDistance = localStorage.getItem("totalDistance");
  const savedPoints = localStorage.getItem("totalPoints");

  if (savedDistance) totalDistance = parseFloat(savedDistance);
  if (savedPoints) totalPoints = parseInt(savedPoints);

  updateTotals();
  fetchTopScores();
});

window.addEventListener("beforeunload", () => {
  if (username) saveToFirebase(username, totalPoints);
});

function startTracking() {
  if (!navigator.geolocation) {
    alert("Geolocation wird nicht unterstützt.");
    return;
  }

  navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const current = { latitude, longitude };

    if (!map) {
    map = L.map('map').setView([latitude, longitude], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    marker = L.marker([latitude, longitude]).addTo(map)
      .bindPopup('Du bist hier')
      .openPopup();
  } else {
    // 💡 Update Marker-Position
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude]);
  }

    console.log("Neue Position:", current);

    if (lastPosition) {
      const distance = calculateDistance(lastPosition, current);
      console.log("Berechnete Distanz:", distance.toFixed(2));

      if (distance > 2.8 && distance < 10) {
        totalDistance += distance;
        const points = Math.round(distance);
        totalPoints += points;

        localStorage.setItem("totalDistance", totalDistance);
        localStorage.setItem("totalPoints", totalPoints);

        addPointsRow(distance, points);
        updateTotals();
        if (username) saveToFirebase(username, totalPoints);
      }
    }

    lastPosition = current;
  }, error => {
    console.error("Geolocation Fehler:", error.message);
    alert("GPS Fehler: " + error.message);
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  });
}

function calculateDistance(pos1, pos2) {
  const R = 6371e3;
  const φ1 = toRadians(pos1.latitude);
  const φ2 = toRadians(pos2.latitude);
  const Δφ = toRadians(pos2.latitude - pos1.latitude);
  const Δλ = toRadians(pos2.longitude - pos1.longitude);

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(deg) {
  return deg * (Math.PI / 180);
}

function addPointsRow(distance, points) {
  const table = document.getElementById("pointsTable");
  const row = table.insertRow();
  const timeCell = row.insertCell(0);
  const distCell = row.insertCell(1);
  const pointsCell = row.insertCell(2);

  timeCell.textContent = new Date().toLocaleTimeString();
  distCell.textContent = distance.toFixed(1);
  pointsCell.textContent = points;
}

function updateTotals() {
  document.getElementById("total_Count").textContent = totalDistance.toFixed(2) + " m";
  document.getElementById("total_Points").textContent = totalPoints;
}

function saveToFirebase(username, points) {
  const ref = doc(db, "highScores", username);
  setDoc(ref, {
    points: points,
    timestamp: serverTimestamp()
  }).then(() => {
    console.log("Punkte gespeichert.");
    fetchTopScores();
  }).catch(err => {
    console.error("Fehler beim Speichern:", err);
  });
}

function fetchTopScores() {
  const table = document.getElementById("leaderboardTable");
  table.innerHTML = "";

  const q = query(collection(db, "highScores"), orderBy("points", "desc"), limit(10));

  getDocs(q).then(snapshot => {
    snapshot.forEach(doc => {
      const row = table.insertRow();
      row.insertCell(0).textContent = doc.id;
      row.insertCell(1).textContent = doc.data().points;
    });
  }).catch(err => {
    console.error("Fehler beim Laden der Bestenliste:", err);
  });
}
