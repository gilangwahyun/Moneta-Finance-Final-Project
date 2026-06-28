# Rule-Based Insight Engine

Moneta Finance mengimplementasikan **Rule-Based Insight Engine** untuk melawan bias kognitif dalam pengelolaan keuangan. Sistem ini mengevaluasi data transaksi, anggaran, target, dan dompet yang tersimpan di IndexedDB secara lokal (Offline-First) dan menghasilkan *nudge* (dorongan) edukatif.

## Arsitektur

Insight Engine terbagi dalam dua mode pengiriman:
1. **Local Push Notifications** (`src/lib/notifications/local-engine.ts`): Memberikan intervensi instan saat pengguna melakukan transaksi berisiko (misal: Over-budget). Terdiri dari 4 rule kritis.
2. **Dashboard Analytics Insights** (`src/hooks/use-analytics.ts` & `src/lib/nudging.ts`): Menghasilkan kartu informasi analitik saat pengguna membuka halaman Analytics. Terdiri dari 35 rule dinamis.

## Kategori Aturan (Sesuai Draf Skripsi)

Sistem ini menjalankan **40 Aturan Aktif**, yang dikelompokkan ke dalam 6 area analitik utama:

### 1. Anggaran (Budgeting)
Berfokus pada pengawasan batas anggaran, peringatan dini (*early-warning system*), dan rekomendasi alokasi dana secara adaptif.
1. **[Push] Penggunaan Anggaran 50%** (Info): Peringatan dini setengah jalan.
2. **[Push] Penggunaan Anggaran 80%** (Warning): Peringatan menipisnya ruang pengeluaran.
3. **[Push] Batas Anggaran Terlampaui** (Critical): Over-budget.
4. **[Push] Rekomendasi Subsidi Silang** (Critical): Menyarankan menutupi defisit dari kategori bersisa.
5. **Pengeluaran Tanpa Anggaran** (Info - P1.5): Deteksi pengeluaran besar tanpa limit alokasi.
6. **Saran Anggaran Baru** (Info - P1.6): Rekomendasi besaran anggaran berdasarkan riwayat pengeluaran.
7. **Anggaran Berisiko Habis Lebih Awal** (Warning - P1.9): Perhitungan kecepatan kuras uang (*burn rate*).
8. **Anggaran Mungkin Tidak Realistis** (Warning - P3.2): Kritik jika over-budget terjadi 3 bulan berturut-turut.

### 2. Pola Pengeluaran (Spending Patterns)
Berfokus pada pendeteksian anomali atau pola pengeluaran dalam jangka pendek (1 bulan atau kurang).
9. **Payday Leak** (Critical - P1.0): Lonjakan pengeluaran pasca gajian.
10. **Data Pemasukan Kosong** (Critical - P1.1): Peringatan analitik buta karena belum ada catatan pemasukan.
11. **Defisit Arus Kas** (Critical - P1.1): Pengeluaran bulan ini melebihi pemasukan bulan ini.
12. **Rasio Pengeluaran Tinggi** (Warning - P1.1): Pengeluaran telah menyentuh batas kritis (>= 80% dari pemasukan).
13. **Pemasukan Tertinggal** (Warning - P1.7): Momentum pemasukan berjalan lambat dibanding rata-rata sebelumnya.
14. **Pola Pengeluaran Akhir Pekan** (Warning - P2.0): Mayoritas total pengeluaran terpusat pada hari libur.
15. **Pola Pengeluaran Malam Hari** (Warning - P2.1): Gaya hidup malam hari (*Night-owl*).
16. **Pengeluaran Melonjak** (Warning - P2.2): *Top expense category* naik drastis.
17. **Frekuensi Pengeluaran Rutin** (Info - P3.0): *Latte Factor* (banyak transaksi bernominal kecil dan impulsif).
18. **Evaluasi Langganan** (Warning - P3.1): Penumpukan *subscription* bulanan yang membahayakan rasio.
19. **Kenaikan Transaksi Rutin** (Info - P3.2): Terlalu sering jajan/belanja di merchant yang sama.

### 3. Analitik Pola (Pattern Analytics)
Berfokus pada analisis tren historis dan pergeseran gaya hidup jangka panjang (lebih dari 1 bulan).
20. **Proyeksi Kebiasaan** (Warning - P2.5): Proyeksi Snowball disetahunkan (*annualized*).
21. **Kategori Pengeluaran Baru** (Info - P2.6): Kategori yang tadinya mati, mendadak membengkak.
22. **Pergeseran Pengeluaran Terbesar** (Info - P2.7): Mahkota kategori pengeluaran terbesar berpindah tangan.
23. **Perubahan Pola Pengeluaran** (Neutral - P2.8): Rasio biaya gaya hidup / *Discretionary* perlahan merayap naik.
24. **Pengeluaran Kategori Merayap Naik** (Warning - P2.9): *Category Creep* atau inflasi gaya hidup terselubung.
25. **Selisih Bersih Menipis** (Warning - P3.1): Margin menabung terus menipis dalam periode 3 bulan terakhir.
26. **Lonjakan Pengeluaran Kategori** (Warning - P3.3): *Category Spike* tajam (1.5x) vs historis.
27. **Pola Waktu Pengeluaran** (Neutral - P3.3): Mayoritas pengeluaran ada di Pagi atau Malam hari.
28. **Konsentrasi Pengeluaran** (Neutral - P3.4): Kebiasaan menghabiskan uang secara masif pada beberapa hari spesifik (*Clustering*).
29. **Rasio Pengeluaran Tidak Konsisten** (Neutral - P3.75): Fluktuasi arus kas yang sangat drastis dan tak menentu.
30. **Pola Pengeluaran Ditemukan** (Neutral - P3.8): Penemuan Hari Dominan / *Peak Spending Day*.

### 4. Dompet (Wallets)
Berfokus pada kesehatan likuiditas dan kebiasaan pengguna terhadap metode pembayaran.
31. **[Push] Saldo Dompet Menipis** (Warning): Likuiditas dompet harian berada di level bahaya.
32. **Penggunaan Dompet Dominan** (Neutral - P3.9): Sindrom pemusatan satu dompet (*Single Point of Failure*).
33. **Pola Penggunaan Dompet** (Neutral - P3.8): Identifikasi pola "Kategori A selalu pakai Dompet B".

### 5. Target Finansial (Financial Targets)
Berfokus pada pengawalan mimpi finansial pengguna agar selaras dengan pola pengeluarannya.
34. **Target Belum Ada Progres** (Warning - P2.3): Jangka waktu target mendekat, tetapi belum ada uang yang disisihkan.
35. **Pengeluaran vs Target Pemasukan** (Info - P2.4): Menyadarkan pengguna bahwa pengeluaran harian mereka berisiko menyabotase impian finansial besar mereka.

### 6. Reinforcement Positif & Fallback
Berfokus pada pembangunan *habit* finansial, mitigasi demotivasi, serta kondisi netral saat tidak ada anomali terdeteksi.
36. **Pemulihan Anggaran Berhasil** (Positive - P3.4): Validasi positif karena bulan ini berhasil hemat dan pulih dari dosa bulan lalu.
37. **Konsistensi Target Terjaga** (Positive - P3.5): Penghargaan atas *streak* mencapai target.
38. **Kamu Berhasil Berhemat!** (Positive - P3.5): Valuasi singkat terhadap uang yang berhasil disisihkan minggu ini.
39. **Pemasukan Meningkat** (Positive - P3.6): Respons adaptif menabung paksa sesaat setelah gaji/pendapatan naik.
40. **Pola Pengeluaran Stabil** (Neutral - P4.0): *Fallback* / Jaring pengaman, menampilkan kalimat empati dan apresiatif saat semua matriks finansial berada dalam kendali sempurna.

## Mitigasi "Insight Fatigue"
Untuk mencegah kelelahan pengguna menerima nasihat finansial, halaman Analytics membatasi kartu yang ditampilkan:
- **Prioritas Berbobot (Weighted Sort):** Critical (Priority 1) akan naik ke atas, disusul Warning (2), Positive/Info (3), dan Netral (4).
- **Pembatasan (Smart Limit):** Selalu tampilkan kartu prioritas utama (*Critical*). Sisa slot hanya menampilkan 3 kartu terbaik di prioritas bawahnya. Sisanya akan dimasukkan dalam panel *Collapsible* sehingga otak tidak terbebani oleh puluhan metrik sekaligus.
