# Riakan — menghitung jarak dirimu dengan lokasi terjadinya gempa bumi

# Goals dari repo ini adalah:
1. Menampilkan data gempa bumi secara real time dari sumber resmi (BMKG).
2. Menghitung seberapa jauh jarak antara pengguna dengan lokasi terjadinya gempa.

Catatan:
Project ini dibuat hanya untuk memenuhi tugas mata kuliah dan tidak ada maksud lain

# Spesifikasi
- **HTML5** — semantik, tanpa framework.
- **CSS native** — plain CSS, Grid/Flexbox, responsive.
- **Vanilla JavaScript (ES6+)** — Fetch API dan DOM manipulation, tanpa library eksternal.

```
/project
  index.html
  style.css
  main.js
  README.md
```

## Cara menjalankan

Buka `index.html` melalui localhost (misalnya Live Server). Deployment production harus menggunakan HTTPS agar Geolocation API dapat digunakan.

## Fitur frontend

- Menampilkan hingga 15 gempa M5.0+ dari BMKG.
- Badge warna berdasarkan magnitude.
- Perhitungan jarak dari lokasi pengguna menggunakan Geolocation API dan Haversine Distance.
- Penanganan loading, data kosong, kegagalan fetch, fallback CORS, dan kegagalan geolocation.

## Sumber API

Endpoint resmi, gratis, tanpa API key:

```
https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json      → 1 gempa terbaru
https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json   → 15 gempa M5.0+ terakhir (dipakai untuk MVP)
```

Struktur response:

```json
{
  "Infogempa": {
    "gempa": [
      {
        "Tanggal": "19 Sep 2026",
        "Jam": "11:18:36 WIB",
        "DateTime": "2026-09-19T04:18:36+00:00",
        "Coordinates": "-1.60,138.88",
        "Lintang": "1.60 LS",
        "Bujur": "138.88 BT",
        "Magnitude": "5.1",
        "Kedalaman": "10 km",
        "Wilayah": "33 km TimurLaut SARMI-PAPUA",
        "Potensi": "Tidak berpotensi tsunami"
      }
    ]
  }
}
```

Request mencoba endpoint BMKG secara langsung terlebih dahulu. Jika browser gagal mengambil data karena jaringan atau CORS, aplikasi mencoba `corsproxy.io` sebagai fallback.

## Algoritma inti

- Haversine Distance menghitung jarak antara dua titik koordinat di permukaan bumi dalam kilometer.
