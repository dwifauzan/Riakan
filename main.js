const API_URL = "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json";
const CORS_PROXY_URL = "https://corsproxy.io/?url=";

const state = {
    gempaList: [],
    userLocation: null,
    status: "loading"
};

const elements = {
    status: document.querySelector("#status"),
    list: document.querySelector("#gempa-list"),
    locationButton: document.querySelector("#btn-lokasi"),
    locationStatus: document.querySelector("#location-status"),
    resultCount: document.querySelector("#result-count")
};

function setStatus(message, type = "info", withRetry = false) {
    elements.status.className = `status status-${type}`;
    elements.status.textContent = message;

    if (withRetry) {
        const retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.className = "retry-button";
        retryButton.textContent = "Coba Lagi";
        retryButton.addEventListener("click", loadEarthquakeData);
        elements.status.append(" ", retryButton);
    }
}

function parseCoordinates(coordinateString) {
    const coordinates = String(coordinateString || "").split(",").map(Number);

    if (coordinates.length !== 2 || coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
        throw new Error("Koordinat gempa tidak valid.");
    }

    return { lat: coordinates[0], lon: coordinates[1] };
}

function parseDepth(depthString) {
    const depth = Number.parseFloat(String(depthString || "").replace(",", "."));
    return Number.isFinite(depth) ? depth : 0;
}

function transformEarthquake(rawEarthquake) {
    const { lat, lon } = parseCoordinates(rawEarthquake.Coordinates);
    const magnitude = Number.parseFloat(rawEarthquake.Magnitude);

    if (!Number.isFinite(magnitude)) {
        throw new Error("Magnitude gempa tidak valid.");
    }

    return {
        tanggal: rawEarthquake.Tanggal || "Tanggal tidak tersedia",
        jam: rawEarthquake.Jam || "Waktu tidak tersedia",
        dateTimeUTC: rawEarthquake.DateTime || "",
        lat,
        lon,
        magnitude,
        kedalamanKm: parseDepth(rawEarthquake.Kedalaman),
        wilayah: rawEarthquake.Wilayah || "Wilayah tidak tersedia",
        potensiTsunami: rawEarthquake.Potensi || "Informasi potensi tidak tersedia",
        jarakDariUser: null
    };
}

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Request gagal dengan status ${response.status}.`);
    }

    return response.json();
}

async function fetchEarthquakes() {
    try {
        return await fetchJson(API_URL);
    } catch (directError) {
        console.warn("Fetch langsung BMKG gagal, mencoba proxy CORS.", directError);
        return fetchJson(`${CORS_PROXY_URL}${encodeURIComponent(API_URL)}`);
    }
}

function getEarthquakeItems(response) {
    const items = response?.Infogempa?.gempa;

    if (!Array.isArray(items)) {
        throw new Error("Format data BMKG tidak sesuai.");
    }

    return items;
}

function getMagnitudeClass(magnitude) {
    if (magnitude >= 6) return "magnitude-high";
    if (magnitude >= 5) return "magnitude-medium";
    return "magnitude-low";
}

function formatDistance(distance) {
    if (distance < 1) return `${Math.round(distance * 1000)} m`;
    return `${distance.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

function getDistanceCategory(distance) {
    if (distance < 50) {
        return { label: "Dekat", className: "distance-near" };
    }
    if (distance < 200) {
        return { label: "Sedang", className: "distance-medium" };
    }
    if (distance < 500) {
        return { label: "Jauh", className: "distance-far" };
    }
    return { label: "Jauh banget", className: "distance-very-far" };
}

function createEarthquakeCard(earthquake) {
    const card = document.createElement("article");
    card.className = "gempa-card";

    const heading = document.createElement("div");
    heading.className = "card-heading";

    const magnitude = document.createElement("span");
    magnitude.className = `magnitude-badge ${getMagnitudeClass(earthquake.magnitude)}`;
    magnitude.textContent = `M ${earthquake.magnitude.toFixed(1)}`;

    const distance = document.createElement("span");
    distance.className = "distance-badge";
    distance.dataset.distance = "true";
    if (earthquake.jarakDariUser === null) {
        distance.textContent = "Jarak belum dihitung";
    } else {
        const category = getDistanceCategory(earthquake.jarakDariUser);
        distance.classList.add(category.className);
        distance.textContent = `${formatDistance(earthquake.jarakDariUser)} · ${category.label}`;
        distance.title = `Kategori jarak: ${category.label}`;
    }

    heading.append(magnitude, distance);

    const region = document.createElement("h3");
    region.textContent = earthquake.wilayah;

    const details = document.createElement("dl");
    details.className = "details";
    addDetail(details, "Waktu", `${earthquake.tanggal}, ${earthquake.jam}`);
    addDetail(details, "Kedalaman", `${earthquake.kedalamanKm} km`);
    addDetail(details, "Koordinat", `${earthquake.lat.toFixed(2)}, ${earthquake.lon.toFixed(2)}`);

    const potential = document.createElement("p");
    potential.className = "potential";
    potential.textContent = earthquake.potensiTsunami;

    card.append(heading, region, details, potential);
    return card;
}

function addDetail(list, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
}

function renderEarthquakes() {
    elements.list.replaceChildren();
    elements.resultCount.textContent = state.gempaList.length
        ? `${state.gempaList.length} data`
        : "";

    if (!state.gempaList.length) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-state";
        emptyMessage.textContent = "Tidak ada data gempa terkini saat ini.";
        elements.list.append(emptyMessage);
        return;
    }

    state.gempaList.forEach((earthquake) => {
        elements.list.append(createEarthquakeCard(earthquake));
    });
}

function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const differenceLat = toRadians(lat2 - lat1);
    const differenceLon = toRadians(lon2 - lon1);
    const value = Math.sin(differenceLat / 2) ** 2
        + Math.cos(toRadians(lat1))
        * Math.cos(toRadians(lat2))
        * Math.sin(differenceLon / 2) ** 2;
    const arc = 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));

    return earthRadiusKm * arc;
}

function updateDistances(latitude, longitude) {
    state.gempaList.forEach((earthquake) => {
        earthquake.jarakDariUser = haversineDistance(
            latitude,
            longitude,
            earthquake.lat,
            earthquake.lon
        );
    });
    renderEarthquakes();
}

function handleLocationError(error) {
    const messages = {
        1: "Izin lokasi ditolak. Data gempa tetap tersedia tanpa badge jarak.",
        2: "Lokasi tidak tersedia. Silakan coba lagi.",
        3: "Permintaan lokasi timeout. Silakan coba lagi."
    };
    const message = messages[error.code] || "Gagal mendapatkan lokasi. Silakan coba lagi.";

    state.userLocation = null;
    elements.locationButton.disabled = false;
    elements.locationStatus.textContent = message;
    setStatus(message, "warning");
}

function requestUserLocation() {
    if (!navigator.geolocation) {
        const message = "Browser ini tidak mendukung fitur lokasi.";
        elements.locationStatus.textContent = message;
        setStatus(message, "error");
        return;
    }

    elements.locationButton.disabled = true;
    elements.locationStatus.textContent = "Meminta izin lokasi...";
    setStatus("Meminta izin lokasi...", "info");

    navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
            state.userLocation = { lat: coords.latitude, lon: coords.longitude };
            updateDistances(coords.latitude, coords.longitude);
            elements.locationButton.disabled = false;
            elements.locationStatus.textContent = `Lokasi ditemukan: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
            setStatus("Jarak dari lokasi kamu berhasil dihitung.", "success");
        },
        handleLocationError,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
}

async function loadEarthquakeData() {
    state.status = "loading";
    elements.locationButton.disabled = true;
    setStatus("Memuat data gempa dari BMKG...", "info");

    try {
        const response = await fetchEarthquakes();
        state.gempaList = getEarthquakeItems(response).map(transformEarthquake);
        state.status = "ready";
        renderEarthquakes();

        if (state.gempaList.length) {
            setStatus("Data gempa berhasil dimuat.", "success");
        } else {
            setStatus("Tidak ada data gempa terkini saat ini.", "warning");
        }
    } catch (error) {
        state.status = "error";
        state.gempaList = [];
        renderEarthquakes();
        setStatus("Gagal memuat data gempa. Periksa koneksi lalu coba lagi.", "error", true);
        console.error("Gagal memuat data gempa:", error);
    } finally {
        elements.locationButton.disabled = false;
    }
}

elements.locationButton.addEventListener("click", requestUserLocation);
loadEarthquakeData();