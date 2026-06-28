# Audit Validitas Aturan Analitik dan Rekomendasi (Insight Engine)

Tabel berikut merupakan hasil audit sinkronisasi antara spesifikasi aturan di *Rule Catalog* dengan implementasi *Automated Tests* pada Playwright (`08-insight-engine.spec.ts` dan `09-insight-ui-e2e.spec.ts`).

| Kode Rule | Nama Rule / Notifikasi | Status Pengujian | Temuan (Isu Konkret) | Tindak Lanjut |
|---|---|---|---|---|
| **BG-00** | Penggunaan Anggaran Berjalan | ✅ Valid (Engine & UI) | Telah ditambahkan uji E2E di `10-notifications.spec.ts` untuk threshold 50%. | - |
| **BG-00b** | Anggaran Mulai Menipis | ✅ Valid (Engine & UI) | Telah ditambahkan uji E2E di `10-notifications.spec.ts` untuk threshold 80%. | - |
| **BG-00c** | Batas Anggaran Terlampaui | ✅ Valid (Engine & UI) | Telah ditambahkan uji E2E di `10-notifications.spec.ts` untuk threshold 100%. | - |
| **BG-01** | Anggaran Berisiko Habis Lebih Awal | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **BG-02** | Pemulihan Anggaran Berhasil | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **BG-03** | Pengeluaran Tanpa Anggaran | ✅ Valid (Engine & UI) | Berjalan lancar dan diverifikasi end-to-end pada skenario `AU-11-01_02`. | - |
| **BG-04** | Saran Anggaran Baru | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **BG-05** | Anggaran Mungkin Tidak Realistis | ✅ Valid | Terdapat potensi inkonsistensi minor: pada katalog tertulis "≥ 20%", namun di dalam kode menggunakan komparasi eksklusif (`> 20%`). | Merevisi kalimat di katalog spesifikasi untuk menggunakan kata "melebihi 20%" agar sejajar dengan `>`. |
| **SP-01** | Pengeluaran Awal Bulan | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **SP-02** | Pola Pengeluaran Akhir Pekan | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **SP-03** | Pola Pengeluaran Malam Hari | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **SP-04** | Lonjakan Pengeluaran Kategori | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **SP-05** | Frekuensi Pengeluaran Rutin | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **SP-06** | Evaluasi Langganan | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **PR-01** | Kamu Berhasil Berhemat! | ✅ Valid (Engine & UI) | **Diselesaikan:** Duplikasi SP-07 dihapus dari SKRIPSI_RULE_CATALOG.md. | - |
| **SP-08** | Kenaikan Transaksi Rutin | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **SP-09** | Pola Waktu Pengeluaran | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **SP-10** | Konsentrasi Pengeluaran | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-01** | Pola Pengeluaran Ditemukan | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-02** | Pengeluaran Kategori Merayap Naik | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-03** | Selisih Bersih Menipis | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-04** | Kategori Pengeluaran Baru | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-05** | Pergeseran Pengeluaran Terbesar | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-06** | Rasio Pengeluaran Tidak Konsisten | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-07** | Perubahan Pola Pengeluaran | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-08** | Pemasukan Tertinggal | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **AN-09** | Proyeksi Kebiasaan | ✅ Valid | Diimplementasikan secara generik sebagai opsi proyektif (`wantsProjection`). Berjalan lancar. | - |
| **AN-10** | Defisit / Rasio Pengeluaran Tinggi | ✅ Valid (Engine & UI) | Tervalidasi menyeluruh pada 3 skenario (*income=0*, *expense>income*, *ratio≥0.8*) dan skenario E2E `AU-11-01_01`. | - |
| **WL-01** | Saldo Dompet Turun Cepat | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **WL-02** | Saldo Dompet Menipis | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **WL-03** | Penggunaan Dompet Dominan | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **WL-04** | Pola Penggunaan Dompet | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **FT-01** | Target Belum Ada Progres | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **FT-02** | Pengeluaran vs Target Pemasukan | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **FT-03** | Konsistensi Target Terjaga | ✅ Valid | Berjalan sesuai ekspektasi. | - |
| **PR-02** | Pemasukan Meningkat | ✅ Valid | Berjalan sesuai ekspektasi. | - |
