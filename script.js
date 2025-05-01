let lastPosition = null;
let totalDistance = 0;
let totalPoints = 0;

const savedDistance = localStorage.getItem("totalDistance");
const savedPoints = localStorage.getItem("totalPoints")

if (savedDistance) {
  totalDistance = parseFloat(savedDistance);
  totalPoints = parseInt(savedPoints);

  document.getElementById("total_Count").textContent = totalDistance.toFixed(2) + " m";
  document.getElementById("total_Points").textContent = totalPoints;
}

//TODO: localStorage für Punkte auch
//TODO: Bonuspunkte bei gleichbleibender Geschwindigkeit oder so (sicheres fahren..lol)


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

  return R * c; // Distanz in Metern
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
  localStorage.setItem("totalPoints",totalPoints);

  timeCell.textContent = now.toLocaleTimeString();
  distCell.textContent = distance.toFixed(1);
  pointsCell.textContent = points;

  document.getElementById("total_Count").textContent = totalDistance.toFixed(2) + "m"; //Isgesamt Distanz anzeigen
  document.getElementById("total_Points").textContent = totalPoints; //gibt insgesamte Anzahl Punkte

}

document.getElementById("startBtn").addEventListener("click", () => {
  console.log("Tracking-Button gedrückt.");

  if (!navigator.geolocation) {
    alert("Geolocation wird von diesem Browser nicht unterstützt.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      console.log("Erste Position erhalten:", pos.coords);
      document.body.insertAdjacentHTML("beforeend", "<p>📍 GPS freigegeben!</p>");
      startTracking();
    },
    err => {
      console.error("Fehler beim GPS:", err);
      alert("GPS-Zugriff fehlgeschlagen: " + err.message);
      document.body.insertAdjacentHTML("beforeend", `<p style="color:red;">❌ Fehler: ${err.message}</p>`);
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
    console.log("Neue Position:", latitude, longitude);

    const current = { latitude, longitude };

    if (lastPosition) {
      const distance = calculateDistance(lastPosition, current);  //Distanz pro Sekunde ausgerechnet
      if (distance > 2.8 && distance < 10) {  //es wird nur gezählt wenn man zwischen 2.8 und 10 Meter pro Sekunde fährt (10-36km/h)
        totalDistance += distance;

        localStorage.setItem("totalDistance", totalDistance);
        
      
        addPointsRow(distance);
      }
    }
    lastPosition = current;
  }, error => {
    console.error("Fehler beim Tracking:", error.message);
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  });
}
