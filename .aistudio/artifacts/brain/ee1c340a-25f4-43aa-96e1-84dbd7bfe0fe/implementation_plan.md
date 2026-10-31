# Rencana Implementasi: Penggabungan Seluruh Genre & Hot Words untuk Katalog Ribuan Drama

Rencana ini merealisasikan penjelajahan drama tanpa batas dengan menggabungkan seluruh taksonomi genre resmi dari FreeReels (`/homepage/v3/tab/list`), tren pencarian *hot words* Indonesia secara real-time (`/search/hot_words`), dan mesin *multi-vector crawling* dengan pagination bertingkat hingga batas maksimal database server upstream.

---

## 1. Analisis Kebutuhan & Arsitektur Solusi

1. **Integrasi Hot Words Real-time (`GET /search/hot_words`)**:
   - Mengambil judul-judul drama dan kata kunci yang sedang paling banyak dicari/ditonton di Indonesia secara *live* dari server penyedia.
   - Memasukkan judul-judul ini ke dalam kumpulan (*pool*) katalog utama sekaligus menampilkannya sebagai *trending chips* interaktif di penjelajahan.

2. **Integrasi Kategori Resmi (`GET /homepage/v3/tab/list`)**:
   - Mengambil seluruh taksonomi alur cerita resmi: *Balas Dendam, Identitas Rahasia, Pernikahan Kontrak, Intrik Istana, Terlahir Kembali, Konglomerat, Dewa Perang / Naga, Manusia Super, Drama Keluarga, Cinta pada Pandangan Pertama*, dll.

3. **Multi-Vector Deep Catalog Crawler (`server/freeReelsApi.ts`)**:
   - Menggabungkan 30+ kata kunci genre resmi + daftar *hot words* terkini ke dalam generator katalog terpadu.
   - Menerapkan *dynamic pagination expansion*: saat penonton menggulir hingga ke halaman dalam (halaman 5, 10, 15, dst.), server secara otomatis melakukan *crawling* ke halaman lanjutan (`searchPage 2, 3, 4, 5...`) dari berbagai vektor secara paralel.
   - Menghilangkan batas buatan (*artificial ceiling*), mendeduplikasi drama berdasarkan ID unik, dan mempertahankan `hasMore: true` selama upstream API masih menyediakan drama baru.

4. **Tampilan Penjelajahan Komprehensif (`src/components/BrowseView.tsx`)**:
   - Menampilkan baris chip *"Pencarian Tren Hari Ini (Hot Words)"* yang dapat diklik langsung.
   - Pilihan kategori lengkap dengan live filter dan pagination tak terbatas.
   - Menyediakan tombol manual *"Muat Lebih Banyak Drama"* beserta *infinite scroll* otomatis dan penghitung jumlah drama yang telah dimuat.

---

## 2. Rincian Perubahan File

### A. `server/freeReelsApi.ts`
- Tambahkan fungsi `getHotWords(options)` untuk mengambil daftar kata kunci tren real-time dari `/search/hot_words`.
- Perbarui `buildCatalogPool` dan `expandCatalogPool`:
  - Sertakan kata kunci dari `getHotWords` dan seluruh genre resmi.
  - Perluas jangkauan pencarian hingga halaman lanjutan (`searchPage` hingga 10+) untuk mengumpulkan ratusan hingga ribuan drama unik.
- Perbarui `getCatalog`:
  - Jika `endIndex` mendekati atau melampaui jumlah item saat ini, picu `expandCatalogPool` untuk menambah kumpulan drama dari vektor-vektor lainnya secara otomatis.
- Perbarui `search`:
  - Pastikan perhitungan `hasMore` mengalirkan status akurat dari `page_info` FreeReels.

### B. `server.ts`
- Tambahkan rute API baru:
  - `GET /api/hot-words`: Mengembalikan daftar tren terkini sesuai negara dan bahasa yang dipilih.

### C. `src/lib/api.ts`
- Tambahkan fungsi klien:
  - `fetchHotWords(language?: string, country?: string): Promise<string[]>`

### D. `src/components/BrowseView.tsx`
- Tambahkan baris tren *"Top Pencarian Trending"* di atas filter kategori menggunakan data dari `fetchHotWords`.
- Pengguna dapat mengeklik judul yang sedang tren untuk langsung menjelajahi drama tersebut.
- Pastikan logika penambahan data (*handleLoadMore*) tidak pernah menghentikan pagination sebelum server benar-benar kehabisan item.

### E. `src/App.tsx`
- Pastikan feed beranda juga menikmati katalog yang diperluas ini tanpa batas halaman awal.

---

## 3. Rencana Verifikasi & Uji Coba

1. **Uji Endpoint Server**:
   - Jalankan uji mandiri pada `/api/hot-words` untuk memastikan data tren Indonesia berhasil ditarik.
   - Uji pemanggilan `/api/feed` untuk halaman 1 sampai 10 dan verifikasi bahwa jumlah drama unik bertambah ratusan judul tanpa duplikasi.
2. **Kompilasi & Validasi Kode**:
   - Jalankan `compile_applet` untuk memastikan tidak ada kesalahan TypeScript.
   - Jalankan `lint_applet` untuk memastikan kebersihan kode.
3. **Uji Tampilan & Pengalaman Pengguna**:
   - Buka tab Penjelajahan, verifikasi chip kata kunci *hot words* tampil dan dapat diklik.
   - Coba gulir atau klik "Muat Lebih Banyak" beberapa kali untuk memastikan katalog terus memuat drama-drama baru hingga kapasitas maksimal API.
