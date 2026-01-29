// ===============================
// 1. CAMPUS BOUNDS
// ===============================
const campusBounds = [
  [13.0442, 80.2518],
  [13.0482, 80.2552]
];



// ===============================
// 2. MAP
// ===============================
const map = L.map('map', {
  minZoom: 18,
  maxZoom: 23,
  maxBounds: campusBounds,
  maxBoundsViscosity: 1.0,
  zoomControl: false,
  /*rotate: true,
  bearing: -50,
  touchRotate: true,*/
  rotateControl: false
}).setView([13.0482, 80.2552], 18);

// Add zoom control
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ===============================
// MAP LAYERS (STREET + SATELLITE)
// ===============================

// street view 
const streetLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    minZoom: 18,
    maxZoom: 23,
    maxNativeZoom: 19,
    attribution: '© OpenStreetMap'
  }
);

// Satellite view 
const satelliteLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    minZoom: 18,
    maxZoom: 23,
    maxNativeZoom: 19,
    attribution: '© Esri'
  }
);

// Load DEFAULT view
streetLayer.addTo(map);

// Layer switch control 
const baseMaps = {
  "Street View": streetLayer,
  "Satellite View": satelliteLayer
};

L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(map);

/*
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 23,
  maxNativeZoom: 19,
  minZoom: 18
}).addTo(map);
*/

// Lock dragging
map.on('drag', function () {
  map.panInsideBounds(campusBounds, { animate: false });
});



// ===============================
// 3. ICONS
// ===============================
const icons = {
  palm: L.icon({ iconUrl: 'palm.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  neem: L.icon({ iconUrl: 'neem.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  fruit: L.icon({ iconUrl: 'fruit.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  avenue: L.icon({ iconUrl: 'tall.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  flower: L.icon({ iconUrl: 'flower.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  coconut: L.icon({ iconUrl: 'coconut.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]}),
  other: L.icon({ iconUrl: 'treee.png', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-32]})
};

// ===============================
// 4. CATEGORY DETECTION
// ===============================
function getTreeCategory(name) {
  name = name.toLowerCase();

  if (name.includes("coconut") || name.includes("thennai"))
    return "coconut";

  if (name.includes("palm"))
    return "palm";

  if (name.includes("neem"))
    return "neem";

  if (name.includes("mango") || name.includes("jack") || name.includes("guava") || name.includes("tamarind") || name.includes("cashew"))
    return "fruit";

  if (name.includes("ashoka") || name.includes("polyalthia") || name.includes("christmas"))
    return "avenue";

  if (name.includes("gulmohar") || name.includes("jacaranda") || name.includes("peepal"))
    return "flower";

  return "other";
}

// ===============================
// 5. DOT STYLE
// ===============================
function createDot(lat, lon, popupContent) {
  return L.circleMarker([lat, lon], {
    radius: 3,
    color: "#0a7d00",
    fillColor: "#4caf50",
    fillOpacity: 0.9
  }).bindPopup(popupContent);
}

// ===============================
// 6. LAYERS
// ===============================
const treeLayer = L.layerGroup().addTo(map);
const allTrees = [];


//for search

let searchText = ""; 
let selectedCategory = "all";

// ===============================
// 7. REFRESH LOGIC (for search)
// ===============================
function refreshMarkers() {
  treeLayer.clearLayers();

  allTrees.forEach(t => {
    const textMatch =
      t.marker.treeName.includes(searchText) ||
      t.marker.botanicalName.includes(searchText);

    const categoryMatch =
      selectedCategory === "all" || t.category === selectedCategory;

    if (textMatch && categoryMatch) {
      treeLayer.addLayer(map.getZoom() <= 18 ? t.dot : t.marker);
    }
  });
}

map.on("zoomend", refreshMarkers);

// ===============================
// 8. LOAD CSV
// ===============================
Papa.parse("trees.csv", {
  download: true,
  header: true,
  complete: function (results) {

    results.data.forEach(tree => {
      if (!tree.Latitude || !tree.Longitude) return;

      const lat = parseFloat(tree.Latitude);
      const lon = parseFloat(tree.Longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const popupContent = `
        <div class="popup-card">
          <img src="${tree.Image || 'default_tree.png'}">
          <div class="popup-content">
            <p><span class="label">Name:</span> ${tree.TreeName}</p>
            <p><span class="label">Botanical Name:</span> ${tree.BotanicalName}</p>
            <a href="${tree.Link}" target="_blank">Tree Tales</a>
          </div>
        </div>
      `;

      const category = getTreeCategory(tree.TreeName || "");

      const marker = L.marker([lat, lon], { icon: icons[category] }).bindPopup(popupContent);
      const dot = createDot(lat, lon, popupContent);
      //for search
      marker.treeName = (tree.TreeName || "").toLowerCase();
      marker.botanicalName = (tree.BotanicalName || "").toLowerCase();

      allTrees.push({ marker, dot, category });
    });

    refreshMarkers();
  }
});

// ===============================
// 9. SEARCH BAR
// ===============================
const searchControl = L.control({ position: "topleft" });

searchControl.onAdd = function () {
  const div = L.DomUtil.create("div", "leaflet-control custom");
  div.innerHTML = `
    <div class="search-wrapper">
      <input
        id="treeSearch"
        type="text"
        placeholder="Search tree or botanical name">
    </div>
  `;
  L.DomEvent.disableClickPropagation(div);
  return div;
};

searchControl.addTo(map);

let debounceTimer;
document.getElementById("treeSearch").addEventListener("input", e => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchText = e.target.value.toLowerCase();
    refreshMarkers();
  }, 300);
});
