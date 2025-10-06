// === Inisialisasi Peta ===
const map = L.map("map").setView([-5.1356, 119.4588], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// === Sumber Data GeoJSON (Raw dari GitHub) ===
const urls = {
    bangunan: "https://raw.githubusercontent.com/aqiyahzh/petamentahMP2SIG/main/bangunan.geojson",
    jalan: "https://raw.githubusercontent.com/aqiyahzh/petamentahMP2SIG/main/jalan.geojson",
    sungai: "https://raw.githubusercontent.com/aqiyahzh/petamentahMP2SIG/main/sungai.geojson",
    kecamatan: "https://raw.githubusercontent.com/aqiyahzh/petamentahMP2SIG/main/kecamatan.geojson"
};

// === Variabel Statistik ===
let totalBangunan = 0;
let totalJalan = 0;
let totalSungai = 0;
let totalKecamatan = 0;
let bangunanPerKecamatan = {};
let perumahanRows = []; // Untuk tabel & search

// === Style untuk Layer ===
const styleKecamatan = {
    color: "#9b59b6",
    weight: 2,
    fillOpacity: 0
};
const styleJalan = {
    color: "#f9ca24",
    weight: 2
};
const styleSungai = {
    color: "#3498db",
    weight: 2
};
const iconBangunan = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
    iconSize: [18, 18]
});

// === Muat Semua Layer GeoJSON ===
Promise.all([
    fetch(urls.kecamatan).then(res => res.json()),
    fetch(urls.bangunan).then(res => res.json()),
    fetch(urls.jalan).then(res => res.json()),
    fetch(urls.sungai).then(res => res.json())
])
.then(([dataKec, dataBang, dataJalan, dataSungai]) => {
    // --- Kecamatan ---
    totalKecamatan = dataKec.features.length;
    L.geoJSON(dataKec, {
        style: styleKecamatan,
        onEachFeature: (feature, layer) => {
            const nama = feature.properties.NAMOBJ || "Tidak diketahui";
            layer.bindPopup(`<b>Kecamatan:</b> ${nama}`);
            bangunanPerKecamatan[nama] = 0; // Persiapan hitung per kecamatan
        }
    }).addTo(map);

    // --- Bangunan (Perumahan) ---
    totalBangunan = dataBang.features.length;
    L.geoJSON(dataBang, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: iconBangunan }),
        onEachFeature: (feature, layer) => {
            const nama = feature.properties.NAMOBJ || "Tidak diketahui";
            const ket = feature.properties.REMARK || "-";
            let namaKecamatan = "-";
            for (const kec of dataKec.features) {
                if (turf.booleanPointInPolygon(feature, kec)) {
                    namaKecamatan = kec.properties.NAMOBJ || "-";
                    if (bangunanPerKecamatan[namaKecamatan] !== undefined) {
                        bangunanPerKecamatan[namaKecamatan]++;
                    }
                    break;
                }
            }
            layer.bindPopup(`<b>Nama Perumahan:</b> ${nama}<br><b>Keterangan:</b> ${ket}<br><b>Kecamatan:</b> ${namaKecamatan}`);
            perumahanRows.push({ nama, namaKecamatan, ket });
        }
    }).addTo(map);

    // === Tabel Data: Pagination & Search ===
    function renderTable(page = 1, search = "") {
        const rowsPerPage = 10;
        let filtered = perumahanRows;
        if (search) {
            const s = search.toLowerCase();
            filtered = perumahanRows.filter(r =>
                r.nama.toLowerCase().includes(s) ||
                r.namaKecamatan.toLowerCase().includes(s) ||
                r.ket.toLowerCase().includes(s)
            );
        }
        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const rows = filtered.slice(start, end);

        // Isi tabel
        const tbody = document.getElementById("tableBody");
        tbody.innerHTML = "";
        rows.forEach(r => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${r.nama}</td><td>${r.namaKecamatan}</td><td>${r.ket}</td>`;
            tbody.appendChild(tr);
        });

        // Pagination
        const pag = document.getElementById("pagination");
        pag.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = (i === page) ? "active" : "";
            btn.style.cssText = "padding:4px 10px;border-radius:4px;border:1px solid #45a29e;background:" + (i === page ? "#45a29e" : "#1f2833") + ";color:" + (i === page ? "#0b0c10" : "#66fcf1") + ";cursor:pointer;";
            btn.onclick = () => renderTable(i, document.getElementById("searchInput").value);
            pag.appendChild(btn);
        }
    }

    // Event search
    document.getElementById("searchInput").addEventListener("input", function() {
        renderTable(1, this.value);
    });

    // Render pertama kali setelah data siap
    setTimeout(() => renderTable(1, ""), 500);

    // --- Jalan ---
    totalJalan = dataJalan.features.length;
    L.geoJSON(dataJalan, {
        style: styleJalan,
        onEachFeature: (feature, layer) => {
            layer.bindPopup(`<b>Nama Jalan:</b> ${feature.properties.NAMOBJ || "Tidak diketahui"}`);
        }
    }).addTo(map);

    // --- Sungai ---
    totalSungai = dataSungai.features.length;
    L.geoJSON(dataSungai, {
        style: styleSungai,
        onEachFeature: (feature, layer) => {
            layer.bindPopup(`<b>Nama Sungai:</b> ${feature.properties.NAMOBJ || "Tidak diketahui"}`);
        }
    }).addTo(map);

    // === Update Statistik ===
    document.getElementById("totalKecamatan").textContent = totalKecamatan;
    document.getElementById("totalBangunan").textContent = totalBangunan;
    document.getElementById("totalJalan").textContent = totalJalan;
    document.getElementById("totalSungai").textContent = totalSungai;

    // === Chart Jumlah Bangunan per Kecamatan ===
    const ctx = document.getElementById("chartBangunan");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(bangunanPerKecamatan),
            datasets: [{
                label: "Jumlah Bangunan per Kecamatan",
                data: Object.values(bangunanPerKecamatan),
                backgroundColor: "#66fcf1"
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: "#f5f5f5" } },
                y: { ticks: { color: "#f5f5f5" } }
            }
        }
    });
})
.catch(err => console.error("Gagal memuat data:", err));