# Laporan Audit Pemetaan Core Class DPPL

## Daftar Package Final
1. Package Antarmuka Pengguna (Presentation Layer)
2. Package Autentikasi
3. Package Kelola Kategori
4. Package Kelola Dompet
5. Package Kelola Transaksi
6. Package Kelola Anggaran
7. Package Kelola Target Finansial
8. Package Analisis dan Insight
9. Package Kelola Notifikasi
10. Package Sinkronisasi Offline-First
11. Package Akses Data Lokal
12. Package Akses Data Server

## Daftar Kelas Inti Per Package (Tahap 1 & 2)
Tabel di bawah ini difokuskan **hanya pada kelas inti** (_Boundary_, _Entity_, _Control_, dan _Data Access_ utama) untuk menyeimbangkan cakupan dokumen Tahap 1 & 2. Semua kelas pendukung (seperti _Utility_, _Validator_, _Mapper_, dan fungsionalitas turunan) akan dipisahkan secara eksklusif ke rincian **Tahap 3**.

| Nama Package | Kelas Inti | Jenis Class | Tanggung Jawab Singkat | Status Rincian DPPL |
| :--- | :--- | :--- | :--- | :--- |
| **1. Antarmuka Pengguna** | `HalamanBeranda` | Boundary | Menerima interaksi dan menampilkan dasbor ringkasan. | Ringkas |
| | `HalamanTransaksi` | Boundary | Menerima interaksi riwayat dan pencatatan kas. | Ringkas |
| | `HalamanAnggaran` | Boundary | Menerima interaksi pemantauan batas pengeluaran. | Ringkas |
| | `HalamanTarget` | Boundary | Menerima interaksi pemantauan sasaran pemasukan. | Ringkas |
| | `HalamanAnalisis` | Boundary | Menerima interaksi pemantauan performa keuangan bulanan. | Ringkas |
| | `HalamanNotifikasi` | Boundary | Menerima interaksi pembacaan dan pengelolaan pesan sistem. | Ringkas |
| | `HalamanDompet` | Boundary | Menerima interaksi pengaturan dompet atau rekening. | Ringkas |
| | `HalamanKategori` | Boundary | Menerima interaksi pengaturan kustomisasi klasifikasi keuangan. | Ringkas |
| | `HalamanPengaturan` | Boundary | Menerima interaksi pengelolaan konfigurasi aplikasi dan akun pengguna. | Ringkas |
| **2. Autentikasi** | `Pengguna` | Entity | Model data sesi pengguna lokal. | Ringkas |
| | `KelolaAutentikasi` | Control | Menangani alur masuk (_login_), keluar (_logout_), dan validasi sesi. | **Wajib Rinci** |
| **3. Kelola Kategori** | `Kategori` | Entity | Model identitas klasifikasi pemasukan/pengeluaran. | Ringkas |
| | `KelolaKategori` | Control | Mengelola alur penambahan, pengubahan, dan penghapusan kategori. | **Wajib Rinci** |
| **4. Kelola Dompet** | `Dompet` | Entity | Model identitas sumber dana atau rekening. | Ringkas |
| | `KelolaDompet` | Control | Mengelola sumber dana dan kalkulasi agregasi saldo akhir secara instan. | **Wajib Rinci** |
| **5. Kelola Transaksi** | `Transaksi` | Entity | Entitas representasi arus kas (`INCOME`, `EXPENSE`, `TRANSFER`). | **Wajib Rinci** |
| | `KelolaTransaksi` | Control | Menangani alur rekam, ubah, dan hapus transaksi. | **Wajib Rinci** |
| **6. Kelola Anggaran** | `Anggaran` | Entity | Entitas parameter batasan pengeluaran bulanan. | **Wajib Rinci** |
| | `KelolaAnggaran` | Control | Mengelola batas pengeluaran dan eksekusi realokasi antar-kategori. | **Wajib Rinci** |
| **7. Kelola Target Finansial**| `TargetFinansial` | Entity | Entitas parameter sasaran pemasukan (`INCOME_TARGET`). | **Wajib Rinci** |
| | `KelolaTargetFinansial`| Control | Mengelola pendaftaran dan penyuntingan tujuan finansial. | **Wajib Rinci** |
| **8. Analisis & Insight** | `RekapKeuangan` | Entity/DTO | Menyimpan hasil agregasi pemasukan, pengeluaran, saldo bersih, tren, distribusi kategori, dan ringkasan performa keuangan pengguna. | Ringkas |
| | `KelolaAnalisis` | Control | Menyusun laporan agregasi transaksi dan matriks performa per bulan. | **Wajib Rinci** |
| **9. Kelola Notifikasi** | `PengaturanNotifikasi` | Entity | Menyimpan preferensi pengguna terkait status aktif notifikasi, jenis notifikasi, izin notifikasi, dan konfigurasi penerimaan peringatan. | Ringkas |
| | `LogNotifikasi` | Entity | Model riwayat peringatan dan pesan sistem bagi pengguna. | Ringkas |
| | `KelolaNotifikasi` | Control | Mengelola pembaruan status baca dan pengambilan daftar notifikasi. | Ringkas |
| **10. Sinkronisasi** | `ItemAntreanSinkronisasi` | Entity/DTO | Merepresentasikan satu perubahan lokal yang menunggu proses sinkronisasi ke server, termasuk informasi entitas, jenis operasi, *payload*, status pengiriman, *retry count*, dan waktu perubahan. | Ringkas |
| | `ManajerSinkronisasi` | Control/Service| Mengorkestrasi _push/pull_ progresif dan rekonsiliasi data. | **Wajib Rinci** |
| | `PengaturAntreanSinkronisasi`| Control/Service| Mengatur penjadwalan _timer_, _retry_, dan pengosongan antrean data. | **Wajib Rinci** |
| **11. Akses Data Lokal** | `DALTransaksiLokal` | Data Access | Akses tabel *IndexedDB* untuk penyimpanan transaksi luring. | **Wajib Rinci** |
| | `DALAnggaranLokal` | Data Access | Akses tabel *IndexedDB* untuk penyimpanan batas anggaran. | **Wajib Rinci** |
| | `DALTargetFinansialLokal` | Data Access | Akses tabel *IndexedDB* untuk sasaran finansial. | Ringkas |
| | `DALKategoriLokal` | Data Access | Akses tabel *IndexedDB* untuk data kategori. | Ringkas |
| | `DALDompetLokal` | Data Access | Akses tabel *IndexedDB* untuk data sumber dana. | Ringkas |
| | `DALAntreanSinkronisasi` | Data Access | Akses tabel _IndexedDB_ khusus menyimpan *payload* antrean `sync_queue`. | **Wajib Rinci** |
| **12. Akses Data Server** | `DALServerSinkronisasi` | Data Access | Menangani komunikasi API asinkron (_endpoints_) ke sistem server utama. | Ringkas |
| | `DALServerAutentikasi` | Data Access | (Opsional) Menangani komunikasi API untuk login, logout, validasi sesi, atau pemulihan sesi pengguna. | Ringkas |
| | `DALServerNotifikasi` | Data Access | (Opsional) Menangani komunikasi API untuk pendaftaran, pembaruan, atau penghapusan _subscription web push_. | Ringkas |

---

## Catatan Tambahan (Pemisahan Kelas Pendukung ke Tahap 3)
Sesuai hasil audit, revisi ini difokuskan **hanya melengkapi core class yang hilang atau kurang direpresentasikan** dalam daftar inti Tahap 1 & 2. 

Revisi pelengkap ini **sama sekali tidak mengubah prinsip** pemisahan fungsionalitas pendukung. Oleh karena itu, **semua kelas utilitas, kalkulator, dan validator** tetap ditarik dari daftar inti dan dipindahkan penyajian rinciannya ke Tahap 3.

Daftar kelas pendukung yang akan dirinci secara eksklusif pada **Tahap 3** meliputi:
- `PenghitungRitmeAnggaran` (_Utility_ pada Kelola Anggaran)
- `PenghitungProgressTarget` (_Utility_ pada Kelola Target Finansial)
- `PembentukInsight` (_Utility_ pada Analisis dan Insight)
- `PenyelesaiKonflik` (_Utility_ pada Sinkronisasi Offline-First)
- (Serta *Helpers*, *Validators*, *Evaluators*, atau *Mappers* lain jika diperlukan di masa mendatang).

Dengan pemetaan audit ini, DPPL memiliki struktur tulang punggung (_core_) yang proporsional di seluruh 12 *packages* sebelum masuk ke kalkulasi sekunder.
