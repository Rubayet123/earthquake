let allQuakes = [];
let map, markerGroup;
let markers = new Map();
let timelineChart = null;
let zonesLayer = null;
let faultsLayer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('data/earthquakes.json');
  const data = await response.json();
  allQuakes = data.features.sort((a, b) => b.properties.time - a.properties.time);

  initMap();
  renderStats();
  renderQuakeList();
  setupFilters();
  createTimelineChart();
});

function initMap() {
  map = L.map('map').setView([23.7, 90.4], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  markerGroup = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
  });

  updateMap(allQuakes);
  map.addLayer(markerGroup);
}

function updateMap(quakes) {
  markerGroup.clearLayers();
  markers.clear();

  quakes.forEach(quake => {
    const p = quake.properties;
    const coords = quake.geometry.coordinates;
    const mag = p.mag || 0;

    const marker = L.circleMarker([coords[1], coords[0]], {
      radius: Math.max(6, mag * 3),
      fillColor: getColor(mag),
      color: '#000',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.8
    });

    const date = new Date(p.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    marker.bindPopup(`
      <div class="text-center font-semibold p-2">
        <div class="text-2xl font-bold ${mag >= 5 ? 'text-red-600' : 'text-orange-600'}">M ${mag.toFixed(1)}</div>
        <div class="text-lg">${p.place}</div>
        <div class="text-sm text-gray-600">${date}</div>
        ${p.felt ? `<div class="mt-2 text-xs bg-yellow-100 rounded-full px-3 py-1 inline-block">Felt by ${p.felt} people</div>` : ''}
      </div>
    `, { maxWidth: 400 });

    markerGroup.addLayer(marker);
    markers.set(quake.id, marker);
  });
}

function getColor(mag) {
  return mag >= 6 ? '#dc2626' :
         mag >= 5 ? '#ef4444' :
         mag >= 4 ? '#f97316' : '#60a5fa';
}

function focusOnQuake(quakeId) {
  const marker = markers.get(quakeId);
  if (marker) {
    map.setView(marker.getLatLng(), 11);
    setTimeout(() => marker.openPopup(), 600);
  }
}

function focusOnYear(year) {
  const quakesInYear = allQuakes.filter(q => new Date(q.properties.time).getFullYear() === year);
  if (quakesInYear.length > 0) {
    updateMap(quakesInYear);
    const avgLat = quakesInYear.reduce((sum, q) => sum + q.geometry.coordinates[1], 0) / quakesInYear.length;
    const avgLng = quakesInYear.reduce((sum, q) => sum + q.geometry.coordinates[0], 0) / quakesInYear.length;
    map.setView([avgLat, avgLng], 9);
  }
}

// Premium Dynamic Stats Cards
function renderStats() {
  const total = allQuakes.length;
  const maxMag = Math.max(...allQuakes.map(q => q.properties.mag || 0));
  const strongest = allQuakes.find(q => (q.properties.mag || 0) === maxMag);
  const latest = allQuakes[0];

  const strongDate = new Date(strongest.properties.time).toLocaleDateString('en-GB');
  const latestDate = new Date(latest.properties.time).toLocaleDateString('en-GB');
  const latestPlace = latest.properties.place.split(',')[0].trim();

  document.getElementById('stats').innerHTML = `
    <!-- Total Quakes -->
    <div class="group flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-default relative overflow-hidden">
        <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition"></div>
        <div class="flex items-center gap-3 relative z-10">
            <div class="w-11 h-11 flex items-center justify-center rounded-lg bg-white/20 backdrop-blur-md text-2xl">🌎</div>
            <div>
                <div class="text-xs opacity-90">Total Recorded</div>
                <div class="font-semibold">Earthquakes</div>
            </div>
        </div>
        <div class="text-3xl font-extrabold relative z-10">${total}</div>
    </div>

    <!-- Strongest Ever -->
    <div class="group flex items-center justify-between bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden"
         onclick="focusOnQuake('${strongest.id}')">
        <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition"></div>
        <div class="flex items-center gap-3 relative z-10">
            <div class="w-11 h-11 flex items-center justify-center rounded-lg bg-white/20 backdrop-blur-md text-2xl">⚡</div>
            <div>
                <div class="text-xs opacity-90">Strongest Ever</div>
                <div class="font-semibold text-sm">${strongDate}</div>
            </div>
        </div>
        <div class="text-3xl font-extrabold relative z-10">M ${maxMag.toFixed(1)}</div>
    </div>

    <!-- Latest Quake -->
    <div class="group flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden"
         onclick="focusOnQuake('${latest.id}')">
        <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition"></div>
        <div class="flex items-center gap-3 relative z-10">
            <div class="w-11 h-11 flex items-center justify-center rounded-lg bg-white/20 backdrop-blur-md text-2xl">🕒</div>
            <div>
                <div class="text-xs opacity-90">Latest Quake</div>
                <div class="font-semibold text-sm">${latestPlace}</div>
                <div class="text-xs opacity-80">${latestDate}</div>
            </div>
        </div>
        <div class="text-3xl font-extrabold relative z-10">M ${latest.properties.mag.toFixed(1)}</div>
    </div>
  `;
}

function renderQuakeList() {
  const strongQuakes = allQuakes.filter(q => q.properties.mag >= 4.5).slice(0, 15);
  const list = document.getElementById('quakeList');
  list.innerHTML = strongQuakes.map(q => {
    const date = new Date(q.properties.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const mag = q.properties.mag.toFixed(1);
    return `
      <div class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer transform hover:scale-105"
           onclick="focusOnQuake('${q.id}')">
        <div class="flex items-center space-x-4">
          <div class="text-2xl font-bold ${mag >= 6 ? 'text-red-600' : mag >= 5 ? 'text-orange-600' : 'text-amber-600'}">
            M ${mag}
          </div>
          <div>
            <div class="font-medium">${q.properties.place.split(',')[0]}</div>
            <div class="text-sm text-gray-500">${date}</div>
          </div>
        </div>
        ${q.properties.felt ? `<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Felt</span>` : ''}
      </div>
    `;
  }).join('');
}

function createTimelineChart() {
  const ctx = document.getElementById('timelineChart').getContext('2d');
  const yearly = {};
  allQuakes.forEach(q => {
    const year = new Date(q.properties.time).getFullYear();
    if (!yearly[year]) yearly[year] = { count: 0, maxMag: 0 };
    yearly[year].count++;
    yearly[year].maxMag = Math.max(yearly[year].maxMag, q.properties.mag || 0);
  });

  const years = Object.keys(yearly).map(Number).sort((a, b) => a - b);
  const counts = years.map(y => yearly[y].count);
  const maxMags = years.map(y => yearly[y].maxMag);

  if (timelineChart) timelineChart.destroy();

  timelineChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          type: 'bar',
          label: 'Number of Earthquakes',
          data: counts,
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgb(79, 70, 229)',
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Strongest Magnitude',
          data: maxMags,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          pointBackgroundColor: '#dc2626',
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.4,
          fill: false,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 14 }, padding: 20 } },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label.includes('Number')) {
                const plural = ctx.parsed.y === 1 ? '' : 's';
                return ` ${ctx.parsed.y} earthquake${plural} in ${ctx.label}`;
              }
              return ` Strongest: M ${ctx.parsed.y.toFixed(1)}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { maxTicksLimit: 12 }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Count' } },
        y1: { position: 'right', min: 2.5, max: 8, title: { display: true, text: 'Magnitude', color: '#ef4444' }, grid: { drawOnChartArea: false } }
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          focusOnYear(years[index]);
        }
      }
    }
  });
}

function setupFilters() {
  const magSlider = document.getElementById('magFilter');
  const magValue = document.getElementById('magValue');
  const yearSlider = document.getElementById('yearFilter');
  const yearValue = document.getElementById('yearValue');

  const applyFilters = () => {
    const minMag = parseFloat(magSlider.value);
    const minYear = parseInt(yearSlider.value);
    const filtered = allQuakes.filter(q => {
      const year = new Date(q.properties.time).getFullYear();
      return (q.properties.mag || 0) >= minMag && year >= minYear;
    });
    updateMap(filtered);
    magValue.textContent = `≥ ${minMag}`;
    yearValue.textContent = minYear === 1900 ? 'All time' : minYear + '+';
  };

  magSlider.addEventListener('input', applyFilters);
  yearSlider.addEventListener('input', applyFilters);

  // Reset Button — Resets Everything
  document.getElementById('resetBtn').addEventListener('click', () => {
    magSlider.value = 2.5;
    yearSlider.value = 1900;
    applyFilters();
    map.setView([23.7, 90.4], 7);

    // Turn off layers
    document.getElementById('toggleZones').checked = false;
    document.getElementById('toggleFaults').checked = false;
    removeSeismicZones();
    removeFaultLines();
  });

  applyFilters();
}

// ==================== EARTHQUAKE RISK ZONES ====================
const bangladeshSeismicZones = [
  { color: "#ef4444", opacity: 0.25, coords: [[[26.63,88.03],[26.63,90.45],[24.5,90.45],[24.5,88.03],[26.63,88.03]]] },
  { color: "#f97316", opacity: 0.25, coords: [[[25.0,91.0],[25.0,92.0],[23.7,92.0],[23.7,91.0],[25.0,91.0]], [[24.9,90.2],[24.9,91.8],[23.8,91.8],[23.8,90.2],[24.9,90.2]]] },
  { color: "#eab308", opacity: 0.2, coords: [[ [26.0,88.0],[26.0,90.5],[24.0,90.5],[24.0,88.0],[26.0,88.0] ]] },
  { color: "#22c55e", opacity: 0.2, coords: [[ [23.8,88.5],[23.8,90.5],[22.0,90.5],[22.0,88.5],[23.8,88.5] ]] }
];

function addSeismicZones() {
  if (zonesLayer) return;
  zonesLayer = L.layerGroup().addTo(map);
  bangladeshSeismicZones.forEach(zone => {
    zone.coords.forEach(polygon => {
      L.polygon(polygon, { color: zone.color, weight: 2, fillOpacity: zone.opacity, interactive: false }).addTo(zonesLayer);
    });
  });
}

function removeSeismicZones() {
  if (zonesLayer) { map.removeLayer(zonesLayer); zonesLayer = null; }
}

document.getElementById('toggleZones').addEventListener('change', function() {
  this.checked ? addSeismicZones() : removeSeismicZones();
});

// ==================== MAJOR FAULT LINES ====================
const majorFaultLines = [
  { coords: [[25.17,90.95],[25.18,91.85],[25.25,92.10]] }, // Dauki
  { coords: [[24.70,90.40],[24.10,90.45]] },              // Madhupur
  { coords: [[24.90,91.80],[25.20,92.00]] },              // Sylhet
  { coords: [[21.50,92.20],[22.80,92.40],[23.50,92.50]] }, // Plate Boundary
  { coords: [[23.00,91.30],[24.20,91.60]] },              // Tripura
  { coords: [[25.10,90.30],[25.15,90.50]] }               // Haluaghat
];

function addFaultLines() {
  if (faultsLayer) return;
  faultsLayer = L.layerGroup().addTo(map);

  majorFaultLines.forEach(fault => {
    L.polyline(fault.coords, {
      color: "#dc2626",
      weight: 4,
      opacity: 0.9,
      dashArray: "10, 10",
      lineCap: "round"
    }).addTo(faultsLayer)
      .bindTooltip("Major Fault Line", { permanent: false, direction: "center" });
  });

  if (!document.getElementById('fault-glow-style')) {
    const style = document.createElement('style');
    style.id = 'fault-glow-style';
    style.innerHTML = `.fault-line-glow { filter: drop-shadow(0 0 8px rgba(220,38,38,0.9)); }`;
    document.head.appendChild(style);
  }
}

function removeFaultLines() {
  if (faultsLayer) { map.removeLayer(faultsLayer); faultsLayer = null; }
}

document.getElementById('toggleFaults').addEventListener('change', function() {
  this.checked ? addFaultLines() : removeFaultLines();
});
