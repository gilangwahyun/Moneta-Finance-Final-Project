# Dokumen Rincian Class DPPL - Tahap 1 & 2

## Bagian 1 — Ringkasan Revisi Kecil yang Diterapkan

Sesuai arahan sebelumnya, beberapa penyesuaian telah dibekukan dalam pemetaan ini:

1. **KelolaAnggaran**: Deskripsi diubah menjadi “Logika pengelolaan batas pengeluaran, realokasi anggaran, dan evaluasi penggunaan anggaran.”
2. **PenghitungRitmeAnggaran**: Deskripsi diubah menjadi “Menghitung batas ideal penggunaan anggaran, proyeksi penggunaan, dan status ritme pengeluaran.”
3. **ManajerSinkronisasi**: Jenis class diklasifikasikan sebagai **Control/Service**, karena mengorkestrasi alur _push/pull_ dan eksekutor penyelesaian konflik.
4. **DALServerSinkronisasi**: Dipertahankan dengan deskripsi spesifik namun ringkas sebagai antarmuka _endpoints_ _push/pull_ asinkron untuk menerima dan mengirim data sinkronisasi massal.
5. **Catatan Konsistensi**: Pemetaan dipastikan **tidak menggunakan istilah CRDT**, melainkan algoritma **Last-Write-Wins berbasis `updatedAt`**. Transfer murni sebagai enumerasi tipe dalam `Transaksi`, dan domain target difokuskan pada `INCOME_TARGET`.

---

## Bagian 2 — Bekukan Package dan Kandidat Class Final

### Daftar Package Final

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

### Dependency Sederhana Antarpackage

- **Kelola Transaksi** bergantung pada _Kelola Kategori_ dan _Kelola Dompet_.
- **Kelola Anggaran** bergantung pada _Kelola Transaksi_ dan _Kelola Kategori_.
- **Kelola Target Finansial** bergantung pada _Kelola Transaksi_ dan _Kelola Kategori_.
- **Analisis dan Insight** bergantung pada _Kelola Transaksi_, _Kelola Kategori_, _Kelola Anggaran_, dan _Kelola Target Finansial_.
- **Kelola Notifikasi** bergantung pada _Kelola Anggaran_, _Kelola Target Finansial_, dan _Analisis dan Insight_.
- **Sinkronisasi Offline-First** digunakan oleh semua _package_ Business Logic yang melakukan mutasi data.
- **Autentikasi** menjadi prasyarat akses data pengguna bagi _package_ lainnya.
- **Antarmuka Pengguna** bergantung pada semua _package Business Logic_ melalui Boundary/Control.
- **Business Logic Layer** dan **Sinkronisasi** bergantung pada _Akses Data Lokal_.
- **Sinkronisasi** bergantung pada _Akses Data Server_ untuk sinkronisasi massal.

### Tabel Kandidat Class Final per Package

Tabel di bawah ini difokuskan **hanya pada kelas inti** (_Boundary_, _Entity_, _Control_, dan _Data Access_ utama) untuk menyeimbangkan cakupan dokumen Tahap 1 & 2. Semua kelas pendukung (seperti _Utility_, _Validator_, _Mapper_, dan fungsionalitas turunan) akan dipisahkan secara eksklusif ke rincian **Tahap 3**.

| Nama Package                   | Kelas Inti                    | Jenis Class     | Tanggung Jawab Singkat                                                                                                                                                                           | Status Rincian DPPL |
| :----------------------------- | :---------------------------- | :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ |
| **1. Antarmuka Pengguna**      | `HalamanBeranda`              | Boundary        | Menerima interaksi dan menampilkan dasbor ringkasan.                                                                                                                                             | Ringkas             |
|                                | `HalamanTransaksi`            | Boundary        | Menerima interaksi riwayat dan pencatatan kas.                                                                                                                                                   | Ringkas             |
|                                | `HalamanAnggaran`             | Boundary        | Menerima interaksi pemantauan batas pengeluaran.                                                                                                                                                 | Ringkas             |
|                                | `HalamanTarget`               | Boundary        | Menerima interaksi pemantauan sasaran pemasukan.                                                                                                                                                 | Ringkas             |
|                                | `HalamanAnalisis`             | Boundary        | Menerima interaksi pemantauan performa keuangan bulanan.                                                                                                                                         | Ringkas             |
|                                | `HalamanNotifikasi`           | Boundary        | Menerima interaksi pembacaan dan pengelolaan pesan sistem.                                                                                                                                       | Ringkas             |
|                                | `HalamanDompet`               | Boundary        | Menerima interaksi pengaturan dompet atau rekening.                                                                                                                                              | Ringkas             |
|                                | `HalamanKategori`             | Boundary        | Menerima interaksi pengaturan kustomisasi klasifikasi keuangan.                                                                                                                                  | Ringkas             |
|                                | `HalamanPengaturan`           | Boundary        | Menerima interaksi pengelolaan konfigurasi aplikasi dan akun pengguna.                                                                                                                           | Ringkas             |
| **2. Autentikasi**             | `Pengguna`                    | Entity          | Model data sesi pengguna lokal.                                                                                                                                                                  | Ringkas             |
|                                | `KelolaAutentikasi`           | Control         | Menangani alur masuk (_login_), keluar (_logout_), dan validasi sesi.                                                                                                                            | **Wajib Rinci**     |
| **3. Kelola Kategori**         | `Kategori`                    | Entity          | Model identitas klasifikasi pemasukan/pengeluaran.                                                                                                                                               | Ringkas             |
|                                | `KelolaKategori`              | Control         | Mengelola alur penambahan, pengubahan, dan penghapusan kategori.                                                                                                                                 | **Wajib Rinci**     |
| **4. Kelola Dompet**           | `Dompet`                      | Entity          | Model identitas sumber dana atau rekening.                                                                                                                                                       | Ringkas             |
|                                | `KelolaDompet`                | Control         | Mengelola sumber dana dan kalkulasi agregasi saldo akhir secara instan.                                                                                                                          | **Wajib Rinci**     |
| **5. Kelola Transaksi**        | `Transaksi`                   | Entity          | Entitas representasi arus kas (`INCOME`, `EXPENSE`, `TRANSFER`).                                                                                                                                 | **Wajib Rinci**     |
|                                | `KelolaTransaksi`             | Control         | Menangani alur rekam, ubah, dan hapus transaksi.                                                                                                                                                 | **Wajib Rinci**     |
| **6. Kelola Anggaran**         | `Anggaran`                    | Entity          | Entitas parameter batasan pengeluaran bulanan.                                                                                                                                                   | **Wajib Rinci**     |
|                                | `KelolaAnggaran`              | Control         | Mengelola batas pengeluaran dan eksekusi realokasi antar-kategori.                                                                                                                               | **Wajib Rinci**     |
| **7. Kelola Target Finansial** | `TargetFinansial`             | Entity          | Entitas parameter sasaran pemasukan (`INCOME_TARGET`).                                                                                                                                           | **Wajib Rinci**     |
|                                | `KelolaTargetFinansial`       | Control         | Mengelola pendaftaran dan penyuntingan tujuan finansial.                                                                                                                                         | **Wajib Rinci**     |
| **8. Analisis & Insight**      | `RekapKeuangan`               | Entity/DTO      | Menyimpan hasil agregasi pemasukan, pengeluaran, saldo bersih, tren, distribusi kategori, dan ringkasan performa keuangan pengguna.                                                              | Ringkas             |
|                                | `KelolaAnalisis`              | Control         | Menyusun laporan agregasi transaksi dan matriks performa per bulan.                                                                                                                              | **Wajib Rinci**     |
| **9. Kelola Notifikasi**       | `PengaturanNotifikasi`        | Entity          | Menyimpan preferensi pengguna terkait status aktif notifikasi, jenis notifikasi, izin notifikasi, dan konfigurasi penerimaan peringatan.                                                         | Ringkas             |
|                                | `LogNotifikasi`               | Entity          | Model riwayat peringatan dan pesan sistem bagi pengguna.                                                                                                                                         | Ringkas             |
|                                | `KelolaNotifikasi`            | Control         | Mengelola pembaruan status baca dan pengambilan daftar notifikasi.                                                                                                                               | Ringkas             |
| **10. Sinkronisasi**           | `ItemAntreanSinkronisasi`     | Entity/DTO      | Merepresentasikan satu perubahan lokal yang menunggu proses sinkronisasi ke server, termasuk informasi entitas, jenis operasi, _payload_, status pengiriman, _retry count_, dan waktu perubahan. | Ringkas             |
|                                | `ManajerSinkronisasi`         | Control/Service | Mengorkestrasi _push/pull_ progresif dan rekonsiliasi data.                                                                                                                                      | **Wajib Rinci**     |
|                                | `PengaturAntreanSinkronisasi` | Control/Service | Mengatur penjadwalan _timer_, _retry_, dan pengosongan antrean data.                                                                                                                             | **Wajib Rinci**     |
| **11. Akses Data Lokal**       | `DALTransaksiLokal`           | Data Access     | Akses tabel _IndexedDB_ untuk penyimpanan transaksi luring.                                                                                                                                      | **Wajib Rinci**     |
|                                | `DALAnggaranLokal`            | Data Access     | Akses tabel _IndexedDB_ untuk penyimpanan batas anggaran.                                                                                                                                        | **Wajib Rinci**     |
|                                | `DALTargetFinansialLokal`     | Data Access     | Akses tabel _IndexedDB_ untuk sasaran finansial.                                                                                                                                                 | Ringkas             |
|                                | `DALKategoriLokal`            | Data Access     | Akses tabel _IndexedDB_ untuk data kategori.                                                                                                                                                     | Ringkas             |
|                                | `DALDompetLokal`              | Data Access     | Akses tabel _IndexedDB_ untuk data sumber dana.                                                                                                                                                  | Ringkas             |
|                                | `DALAntreanSinkronisasi`      | Data Access     | Akses tabel _IndexedDB_ khusus menyimpan _payload_ antrean `sync_queue`.                                                                                                                         | **Wajib Rinci**     |
| **12. Akses Data Server**      | `DALServerSinkronisasi`       | Data Access     | Menangani komunikasi API asinkron (_endpoints_) ke sistem server utama.                                                                                                                          | Ringkas             |
|                                | `DALServerAutentikasi`        | Data Access     | (Opsional) Menangani komunikasi API untuk login, logout, validasi sesi, atau pemulihan sesi pengguna.                                                                                            | Ringkas             |
|                                | `DALServerNotifikasi`         | Data Access     | (Opsional) Menangani komunikasi API untuk pendaftaran, pembaruan, atau penghapusan _subscription web push_.                                                                                      | Ringkas             |

---

## Bagian 3 — Rincian Boundary Class Inti

### 1. Class `HalamanBeranda` (Ringkas)

**Deskripsi:** Menerima interaksi pengguna dan menampilkan dasbor ringkasan performa keuangan harian.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isLoading` | Boolean | Indikator proses pemuatan data ringkasan. |
| `error` | String | Status penyimpan keterangan galat teknis. |
| `displayData` | Object | Data agregasi ringkas untuk ditampilkan di dasbor. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Menampilkan komponen visual antarmuka beranda. |
| `handleRefresh()` | - | Void | Meminta pembaruan data secara manual. |
| `handleNavigation()` | `path: String` | Void | Memfasilitasi navigasi ke halaman spesifik lainnya. |

### 2. Class `HalamanTransaksi` (Ringkas)

**Deskripsi:** Menerima interaksi riwayat dan form pencatatan arus kas pengguna.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isLoading` | Boolean | Indikator proses penarikan data transaksi. |
| `selectedFilter` | Object | Parameter penyaringan riwayat berdasarkan waktu atau kategori. |
| `transactionsList`| Array | Koleksi data mutasi kas yang akan dirender. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Merender daftar transaksi ke layar pengguna. |
| `handleFilterChange()` | `period: String?, type: String?, categoryId: String?, walletId: String?` | Void | Mengubah kriteria filter daftar riwayat. |
| `handleOpenForm()` | - | Void | Membuka antarmuka pencatatan transaksi baru. |

### 3. Class `HalamanAnggaran` (Ringkas)

**Deskripsi:** Menerima interaksi pemantauan batas pengeluaran dan pengaturan realokasi dana.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isLoading` | Boolean | Status memuat data limit pengeluaran. |
| `budgetData` | Array | Kumpulan data anggaran dan status penggunaannya. |
| `selectedPeriod` | String | Bulan yang sedang ditinjau. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Menampilkan indikator visual pagu anggaran. |
| `handlePeriodChange()` | `period: String` | Void | Memperbarui daftar anggaran sesuai bulan yang dipilih. |
| `handleReallocate()` | `sourceClientId: String, destinationClientId: String, amount: Number` | Void | Membuka interaksi pemindahan dana antarkategori. |

### 4. Class `HalamanTarget` (Ringkas)

**Deskripsi:** Menerima interaksi pemantauan sasaran pemasukan yang ingin dicapai pengguna.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isLoading` | Boolean | Penanda status penarikan data target. |
| `targetsList` | Array | Daftar target finansial beserta persentase capaiannya. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Merender kartu pemantauan progres sasaran. |
| `handleOpenForm()` | - | Void | Membuka modal pengaturan target baru. |
| `handleSubmit()` | `name: String, targetAmount: Number, period: String, startDate: String, endDate: String?, categoryId: String` | Void | Meneruskan input form ke kontroler untuk disimpan. |

### 5. Class `HalamanAnalisis` (Ringkas)

**Deskripsi:** Menerima interaksi pemantauan performa keuangan bulanan dan wawasan analitik.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isLoading` | Boolean | Indikator proses pemrosesan wawasan analitik. |
| `analysisData` | Object | Matriks agregasi dan tren grafik. |
| `selectedPeriod` | String | Rentang waktu analisis yang sedang aktif. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Menampilkan diagram dan ringkasan _insight_. |
| `handlePeriodChange()` | `period: String` | Void | Mengubah rentang waktu data laporan yang dirender. |

### 6. Class `HalamanNotifikasi` (Ringkas)

**Deskripsi:** Menerima interaksi pembacaan dan pengelolaan log pesan sistem atau peringatan.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isLoading` | Boolean | Status penarikan riwayat pemberitahuan. |
| `notificationsList`| Array | Kumpulan daftar pesan aktif bagi pengguna. |
| `unreadCount` | Number | Jumlah pesan yang belum dibuka. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Menampilkan urutan pesan notifikasi terbaru. |
| `handleMarkAsRead()` | `notificationId: String` | Void | Menginisiasi perintah mengubah status notifikasi menjadi telah dibaca. |

### 7. Class `HalamanDompet` (Ringkas)

**Deskripsi:** Menerima interaksi pengaturan dompet atau sumber pendanaan pengguna.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isLoading` | Boolean | Status saat menarik daftar dompet. |
| `walletsList` | Array | Kumpulan identitas sumber dana pengguna. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Merender daftar dompet beserta saldo instannya. |
| `handleOpenForm()` | - | Void | Membuka antarmuka untuk mendaftarkan dompet baru. |

### 8. Class `HalamanKategori` (Ringkas)

**Deskripsi:** Menerima interaksi pengaturan kustomisasi klasifikasi transaksi keuangan.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isLoading` | Boolean | Status pengambilan daftar kategori aktif. |
| `categoriesList`| Array | Daftar referensi klasifikasi kas. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Merender kumpulan kategori pemasukan dan pengeluaran. |
| `handleOpenForm()` | - | Void | Membuka antarmuka pembuatan kategori baru. |

### 9. Class `HalamanPengaturan` (Ringkas)

**Deskripsi:** Menerima interaksi pengelolaan konfigurasi aplikasi secara umum dan opsi akun pengguna.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `userProfile` | Object | Identitas dan status profil saat ini. |
| `preferences` | Object | Status opsi sinkronisasi dan peringatan lokal. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `renderData()` | - | Void | Menampilkan panel preferensi dan identitas profil. |
| `handleToggleAlerts()` | `alertType: String, isEnabled: Boolean` | Void | Mengubah preferensi peringatan notifikasi. |
| `handleLogout()` | - | Void | Memicu alur keluar sesi aplikasi. |

---

## Bagian 4 — Rincian Entity Class Inti

### 1. Class `Pengguna` (Ringkas)

**Deskripsi:** Model data sesi identitas yang digunakan untuk memverifikasi hak akses klien.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | String | Pengenal unik (_UUID_) pengguna di server utama. |
| `email` | String | Alamat surel identitas pengguna. |
| `name` | String | Nama tampilan profil pengguna. |
| `token` | String | (Opsional) Kunci kredensial sesi lokal yang aman. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `Pengguna()` | - | Pengguna | Konstruktor dasar untuk memetakan sesi profil baru. |
| `isLoggedIn()` | - | Boolean | Mengonfirmasi ketersediaan dan validitas identitas. |
| `hasToken()` | - | Boolean | Mengecek eksistensi instrumen otorisasi. |

### 2. Class `Kategori` (Ringkas)

**Deskripsi:** Model identitas klasifikasi untuk transaksi agar analisis pengeluaran lebih terstruktur.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `clientId` | String | _Primary key_ UUID unik sisi klien. |
| `userId` | String | ID pemilik entitas kategori ini. |
| `name` | String | Penamaan klasifikasi keuangan. |
| `type` | Enum / String| Jenis kategori (`INCOME` atau `EXPENSE`). |
| `color` | String | Kode heksadesimal warna representasi visual. |
| `icon` | String | Penanda visual spesifik antarmuka. |
| `syncStatus` | Enum / String| Status sinkronisasi objek. |
| `updatedAt` | DateTime | Penanda waktu modifikasi terakhir untuk algoritma penentu konflik. |
| `deletedAt` | DateTime | (Opsional) Penanda penghapusan lunak (_soft-delete_). |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `Kategori()` | - | Kategori | Membentuk instansiasi objek kategori baru. |
| `isIncome()` | - | Boolean | Mengembalikan _true_ jika tipe adalah `INCOME`. |
| `isDeleted()` | - | Boolean | Mengembalikan _true_ bila memiliki penanda `deletedAt`. |

### 3. Class `Dompet` (Ringkas)

**Deskripsi:** Model identitas sumber dana atau rekening fisik dan virtual pengguna.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `clientId` | String | Pengenal primer sisi klien. |
| `userId` | String | Kepemilikan akun dompet. |
| `name` | String | Label penyebutan dompet (mis. "Kas Utama"). |
| `balance` | Float / Number | Nilai saldo awal mutlak yang tidak direkalkulasi berulang kali. |
| `syncStatus` | Enum / String| Indikasi penyelerasan terhadap server. |
| `updatedAt` | DateTime | Basis acuan waktu pada algoritma LWW. |
| `deletedAt` | DateTime | (Opsional) Penanda dihapus dari pantauan antarmuka. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `Dompet()` | - | Dompet | Konstruktor instansiasi sumber dana baru. |
| `hasBalance()` | - | Boolean | Mengembalikan _true_ jika saldo tidak sama dengan nol. |
| `isDeleted()` | - | Boolean | Memeriksa ketiadaan eksistensi objek secara logis. |

### 4. Class `Transaksi` (Wajib Rinci)

**Deskripsi:** Class `Transaksi` merepresentasikan data arus kas pengguna, yang terdiri dari pemasukan, pengeluaran, maupun pemindahan dana antar dompet (transfer). Transfer direpresentasikan menggunakan nilai tipe (`type`) dan bukan instansiasi class terpisah, karena ia tidak dikalkulasikan sebagai bagian dari _income_ maupun _expense_ dalam evaluasi anggaran.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `clientId` | String | UUID unik yang digenerasi di sisi klien (IndexedDB) sebagai _primary key_ lokal. |
| `id` | String | (Opsional) ID yang diberikan oleh server pasca sinkronisasi (_server ID_). |
| `userId` | String | ID kepemilikan akun pengguna yang menginput transaksi. |
| `walletId` | String | ID dompet sumber dari mana saldo dipotong atau dimasukkan. |
| `targetWalletId` | String | (Opsional) ID dompet tujuan. Hanya diisi apabila `type` bernilai `TRANSFER`. |
| `categoryId` | String | (Opsional) ID klasifikasi transaksi. Kosong jika tipe transaksi adalah `TRANSFER`. |
| `type` | Enum / String | Jenis dari transaksi: `INCOME`, `EXPENSE`, atau `TRANSFER`. |
| `amount` | Float / Number | Nilai uang yang diproses dalam transaksi. |
| `note` | String | Catatan keterangan opsional yang diinput oleh pengguna secara langsung. |
| `description` | String | (Opsional) Rincian tambahan terpisah yang mendeskripsikan transaksi. |
| `date` | Date / String | Tanggal kejadian transaksi berformat (YYYY-MM-DD). |
| `syncStatus` | Enum / String | Status asinkronisasi objek: `SYNCED`, `PENDING`, atau `CONFLICT`. |
| `createdAt` | DateTime | Penanda waktu kapan record pertama kali dibuat (ISO 8601). |
| `updatedAt` | DateTime | Penanda waktu perubahan terakhir. Menjadi dasar algoritma resolusi _Last-Write-Wins_. |
| `deletedAt` | DateTime | (Opsional) Penanda _soft delete_ transaksi. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `Transaksi()` | - | Transaksi | Konstruktor dasar untuk menginisialisasi entitas transaksi baru. |
| `isIncome()` | - | Boolean | Mengembalikan _true_ apabila nilai atribut `type` adalah `INCOME`. |
| `isExpense()` | - | Boolean | Mengembalikan _true_ apabila nilai atribut `type` adalah `EXPENSE`. |
| `isTransfer()` | - | Boolean | Mengembalikan _true_ apabila nilai atribut `type` adalah `TRANSFER`. |
| `isDeleted()` | - | Boolean | Mengembalikan _true_ jika atribut `deletedAt` tidak kosong/null. |

### 5. Class `Anggaran` (Wajib Rinci)

**Deskripsi:** Class `Anggaran` merepresentasikan batas limit pengeluaran bulanan yang ditetapkan oleh pengguna berdasarkan kategori pengeluaran tertentu. Class ini bertindak secara eksklusif dalam domain proteksi kas, sehingga sama sekali tidak mengintervensi kalkulasi target pemasukan.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `clientId` | String | UUID unik klien (_primary key_ lokal) penyimpan nilai limit anggaran. |
| `id` | String | (Opsional) ID turunan dari pengikatan Server (jika telah _Synced_). |
| `userId` | String | ID pemilik anggaran. |
| `categoryId` | String | ID kategori referensi ke mana limit pengeluaran ini dikenakan. |
| `amount` | Float / Number | Nilai batas nominal pengeluaran bulanan yang dianggarkan. |
| `period` | String | Rentang bulan berlaku dalam format "YYYY-MM". |
| `syncStatus` | Enum / String | Status antrean pengunggahan (`SYNCED`, `PENDING`, `CONFLICT`). |
| `createdAt` | DateTime | Penanda waktu anggaran dibuat. |
| `updatedAt` | DateTime | Waktu perubahan terakhir untuk kebutuhan cek konflik resolusi. |
| `deletedAt` | DateTime | (Opsional) Indikasi _soft-delete_ riwayat anggaran. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `Anggaran()` | - | Anggaran | Konstruktor dasar untuk membentuk instansiasi parameter anggaran baru. |
| `isActive()` | - | Boolean | Memeriksa bahwa anggaran belum dihapus dan masih sesuai dengan periode yang sedang dievaluasi. |
| `isDeleted()` | - | Boolean | Mengecek eksistensi penanda `deletedAt`. |
| `belongsToCategory()` | `categoryId: String` | Boolean | Membandingkan input argumen dengan parameter _foreign_ `categoryId`. |
| `isForPeriod()` | `period: String` | Boolean | Memastikan apakah anggaran berlaku untuk bulan (YYYY-MM) yang diminta. |

### 6. Class `TargetFinansial` (Wajib Rinci)

**Deskripsi:** Class `TargetFinansial` menampung metrik sasaran capaian moneter yang diinginkan pengguna. Pada versi implementasi saat ini, target yang aktif difokuskan pada target pemasukan (`INCOME_TARGET`), di mana transaksi bertipe pengeluaran (`EXPENSE`) maupun `TRANSFER` tidak akan memengaruhi kemajuan progres target.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `clientId` | String | ID _Client_ penanda parameter tabel lokal. |
| `id` | String | (Opsional) _Foreign ID_ pasca rekonsiliasi _cloud_ server. |
| `userId` | String | ID pengikatan kepemilikan sasaran target. |
| `name` | String | Penamaan identitas (judul) target pengguna. |
| `type` | Enum / String | Klasifikasi sasarannya. Secara efektif saat ini adalah `INCOME_TARGET`. |
| `targetAmount` | Float / Number| Nilai angka (nominal) target yang ingin dikejar oleh pengguna. |
| `period` | Enum / String | Durasi masa evaluasi pencapaian (`DAILY`, `WEEKLY`, `MONTHLY`, `CUSTOM`). |
| `startDate` | Date / String | Tanggal awal dimulainya pemantauan poin target (YYYY-MM-DD). |
| `endDate` | Date / String | (Opsional) Tanggal ekspektasi berakhirnya/jatuh temponya target. |
| `categoryId` | String | (Opsional) ID kategori referensi. Antarmuka mewajibkan parameter ini untuk pemantauan target secara spesifik. |
| `walletId` | String | (Opsional) ID kapabilitas dukungan masa depan. |
| `isActive` | Boolean | _Flag_ penanda apakah target sedang berjalan aktif atau ditunda. |
| `note` | String | Rincian atau catatan ekstra. |
| `syncStatus` | Enum / String | Marker keadaan sinkronisasi lokal dan server. |
| `createdAt` | DateTime | Penanda pembuatan target. |
| `updatedAt` | DateTime | Basis penentuan intervensi _Last-Write-Wins_ jika diperbarui secara luring. |
| `deletedAt` | DateTime | (Opsional) Penanda dihapus dari pantauan antarmuka (_soft-delete_). |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `TargetFinansial()` | - | TargetFinansial | Inisiator pembuatan konfigurasi obyek sasaran target baru. |
| `isIncomeTarget()` | - | Boolean | Memvalidasi bahwa objek saat ini memang bertipe `INCOME_TARGET`. |
| `isActiveOnDate()` | `date: String` | Boolean | Mengecek keselarasan tanggal evaluasi agar berada di antara rentang `startDate` dan `endDate`. |
| `isDeleted()` | - | Boolean | Memeriksa validitas bahwa objek bukan peninggalan _soft-delete_. |
| `belongsToCategory()` | `categoryId: String` | Boolean | Memeriksa apakah target ini diperuntukkan secara eksklusif bagi pemantauan ID kategori tersebut. |

### 7. Class `RekapKeuangan` (Ringkas)

**Deskripsi:** Objek transfer data (DTO) murni yang menyimpan paket hasil agregasi pemasukan, pengeluaran, saldo bersih, tren, distribusi kategori, dan ringkasan performa pengguna untuk ditampilkan.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `period` | String | Rentang bulan data rekapitulasi dikalkulasi. |
| `totalIncome` | Number | Akumulasi total seluruh pemasukan. |
| `totalExpense` | Number | Akumulasi total seluruh pengeluaran. |
| `netBalance` | Number | Diferensiasi antara pemasukan dikurangi pengeluaran. |
| `categoryDistribution`| Array | Rincian rasio konsumsi dana berdasarkan klasifikasi kategori. |
| `trendData` | Array | Representasi linier untuk divisualisasikan pada diagram _chart_. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `RekapKeuangan()` | - | RekapKeuangan | Membungkus parameter ke bentuk DTO statis. |
| `isPositive()` | - | Boolean | Mengembalikan _true_ jika `netBalance` lebih besar dari nol. |
| `getSavingsRate()` | - | Number | Menghasilkan persentase nilai sisa kas dari rasio total _income_. |

### 8. Class `PengaturanNotifikasi` (Ringkas)

**Deskripsi:** Menyimpan preferensi pengguna terkait status aktif notifikasi, jenis notifikasi, izin, dan konfigurasi penerimaan peringatan.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `clientId` | String | Penanda kunci pengaturan di penyimpanan lokal. |
| `userId` | String | Pemilik konfigurasi. |
| `isPushEnabled` | Boolean | Status persetujuan pengiriman _Web Push API_ dari sistem operasi. |
| `budgetAlertEnabled`| Boolean | Pilihan mengaktifkan peringatan lonjakan pagu pengeluaran. |
| `targetAlertEnabled`| Boolean | Pilihan mengaktifkan dorongan progres sasaran pemasukan. |
| `updatedAt` | DateTime | Basis rekonsiliasi pembaruan konfigurasi. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `PengaturanNotifikasi()` | - | PengaturanNotifikasi | Membentuk konfigurasi basis bawaan pengguna. |
| `isAlertActive()` | `alertType: String` | Boolean | Memeriksa apakah tipe peringatan spesifik dizinkan oleh pengguna. |
| `togglePush()` | - | Void | Mengubah pengaturan izin sistem mengenai status ketersediaan intervensi _push_ OS. |

### 9. Class `LogNotifikasi` (Ringkas)

**Deskripsi:** Model riwayat peringatan, pesan aplikasi, dan hasil evaluasi sistem bagi pengguna yang akan ditampilkan pada daftar pesan.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `clientId` | String | Pengenal unik lokal untuk daftar pesan. |
| `userId` | String | Pemilik pesan yang menjadi target sasaran notifikasi. |
| `title` | String | Kalimat utama judul ringkasan notifikasi. |
| `body` | String | Penjabaran rincian lebih utuh atas isi pesan. |
| `isRead` | Boolean | Penanda status keterbacaan pesan oleh sisi antarmuka. |
| `createdAt` | DateTime | Penanda waktu penerbitan log secara historis. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `LogNotifikasi()` | - | LogNotifikasi | Membentuk instansiasi pencatatan jejak peristiwa baru. |
| `markAsRead()` | - | Void | Mengganti atribut `isRead` menjadi _true_. |
| `isUnread()` | - | Boolean | Menghasilkan evaluasi _true_ bila pesan belum dibuka. |

### 10. Class `ItemAntreanSinkronisasi` (Ringkas)

**Deskripsi:** Entitas perantara DTO (_sync_queue_) yang merepresentasikan satu mutasi lokal yang sedang menunggu waktu pengiriman progresif menuju server.
**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | String | Pengenal unik antrean paket data. |
| `entityName`| String | Jenis klasifikasi model tujuan (mis. "TRANSACTION"). |
| `operationType`| Enum / String| Jenis tindak mutasi (`CREATE`, `UPDATE`, `DELETE`). |
| `payload` | Object | _Blob_ data entitas utuh yang memicu mutasi. |
| `retryCount`| Number | Rekaman kuantitas percobaan pemanggilan antarmuka komunikasi ulang akibat galat. |
| `status` | Enum / String| Status pengiriman antrean (`PENDING`, `FAILED`). |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `ItemAntreanSinkronisasi()` | - | ItemAntreanSinkronisasi | Mengonversi tindakan repositori menjadi bentuk transit DTO. |
| `incrementRetry()` | - | Void | Menambahkan angka riwayat percobaan gagal. |
| `isMaxRetryReached()` | `limit: Number` | Boolean | Mengevaluasi apabila batas maksimal galat tak tertolong telah dicapai. |

---

## Bagian 5 — Rincian Control Class Inti

### 1. Class `KelolaAutentikasi` (Wajib Rinci)

**Deskripsi:** _Control Class_ yang menangani keseluruhan alur identitas masuk (_login_), alur keluar (_logout_), pemeriksaan eksistensi sesi lokal, pemulihan data sesi pengguna secara luring, serta penyegaran status keabsahan kredensial pengguna secara menyeluruh.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `currentUser` | Pengguna | Objek memori aktif yang menampung identitas sesi saat ini. |
| `isAuthenticated`| Boolean | Indikator absolut validasi akses terhadap _Boundary_ fungsional. |
| `isLoading` | Boolean | Penanda proses validasi asinkron repositori/server. |
| `error` | String | Kanal keterangan peringatan otorisasi bagi Boundary. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `login()` | `email: String, password: String` | Pengguna | Memanggil _Data Access_ Server untuk mendapatkan kunci akses, lalu menyimpannya ke memori lokal aktif. |
| `logout()` | `userId: String` | Void | Memutus rantai sesi, menghapus riwayat kredensial di lokal, dan mereset profil aktif menjadi nol. |
| `validateSession()` | `userId: String` | Boolean | Melakukan kueri internal untuk mengecek integritas akses aplikasi, menentukan penolakan Boundary bila _false_. |
| `recoverLocalSession()` | - | Pengguna | Menggali memori identitas luring ketika aplikasi dibuka ulang demi memulihkan akses tanpa internet. |
| `updateUserStatus()` | `userId: String, name: String?, email: String?` | Pengguna | Melakukan sinkronisasi pembaruan profil yang relevan (seperti penukaran nama tampilan profil pengguna). |

### 2. Class `KelolaKategori` (Wajib Rinci)

**Deskripsi:** _Control Class_ pusat operasi interaksi model `Kategori`. Ia mengelola alur penambahan, modifikasi nama/ikon, serta penghapusan kategori secara logis demi menjaga relasi referensi dari entitas _Transaksi_ di ruang lokal.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `categories` | Array<Kategori>| Daftar parameter kategori kas komprehensif bagi sesi aktif. |
| `isLoading` | Boolean | Status tungguan respons operasi luring _Data Access_. |
| `error` | String | Informasi kesalahan operasi kustomisasi kategori. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `loadCategories()` | `userId: String` | Array<Kategori> | Meraup total seluruh entitas `Kategori` aktif dari penyimpanan lokal yang berstatus belum terhapus secara logis. |
| `addCategory()` | `userId: String, name: String, type: String, icon: String?, color: String?` | Kategori | Menulis identitas kategori kustom pengguna dan menyinkronkan data tersebut ke antrean. |
| `editCategory()` | `clientId: String, name: String?, type: String?, icon: String?, color: String?` | Kategori | Memodifikasi parameter kategori lalu memastikan cap `updatedAt` terbarui untuk memicu _Last-Write-Wins_. |
| `removeCategory()` | `clientId: String` | Boolean | Meletakkan properti `deletedAt` agar data tak lagi tampil sembari tidak memutus kebergantungan rekaman lama. |
| `syncCategory()` | `clientId: String, operation: String, payload: Kategori` | Void | Meneruskan muatan perubahan entitas khusus tipe Kategori ke penyimpanan antrean sinkronisasi luring. |

### 3. Class `KelolaDompet` (Wajib Rinci)

**Deskripsi:** _Control Class_ pengelola sumber dana. Melayani operasi pengubahan identitas dompet serta mengkalkulasikan saldo akhir komprehensif dengan merangkai dampaknya terhadap riwayat nilai mutasi transaksi.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `wallets` | Array<Dompet> | Daftar sumber dana fisik maupun rekening digital yang tersedia. |
| `totalBalance` | Number | Titik nilai absolut agregasi kekayaan seluruh sumber rekening secara holistik. |
| `isLoading` | Boolean | Parameter status antrean muatan dari lapisan _Data Access_. |
| `error` | String | Ruang penampung pesan gagal inisiasi _wallet_. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `loadWallets()` | `userId: String` | Array<Dompet> | Menyalin koleksi `Dompet` aktif dari penyimpanan _IndexedDB_. |
| `addWallet()` | `userId: String, name: String, type: String, initialBalance: Number` | Dompet | Meresmikan instansiasi wadah penyimpanan kas baru ke penyimpanan lokal dan menyinkronkannya. |
| `editWallet()` | `clientId: String, name: String?, type: String?, initialBalance: Number?` | Dompet | Melakukan revisi identitas maupun nilai basis dompet lalu memicu pengubahan penanda penyelarasan LWW. |
| `removeWallet()` | `clientId: String` | Boolean | Menyembunyikan fungsionalitas penambahan mutasi dompet tersebut dengan pengaktifan `deletedAt`. |
| `calculateFinalBalance()` | `walletId: String, transactions: Array<Transaksi>` | Number | Menarik seluruh instans `Transaksi` di _Data Access_ yang berhubungan dengan `walletId` terkait guna menetapkan saldo real-time. |
| `syncWallet()` | `clientId: String, operation: String, payload: Dompet` | Void | Mendorong transit paket modifikasi spesifik dompet kepada _PengaturAntreanSinkronisasi_. |

### 4. Class `KelolaTransaksi` (Wajib Rinci)

**Deskripsi:** _Control Class_ (merepresentasikan fungsionalitas utama aplikasi klien) yang bertanggung jawab atas pengelolaan alur bisnis perekaman, pembaruan, dan penghapusan transaksi. Class ini menjembatani presentasi antarmuka pengguna dengan _Local Data Access_ (seperti IndexedDB) serta menghitung ringkasan agregasi sementara secara waktu nyata sebelum menyalurkannya ke antrean sinkronisasi.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `transactions` | Array<Transaksi> | Kumpulan daftar riwayat transaksi terbaru yang siap dirender di antarmuka. |
| `monthlyTotals` | Object | Struktur data (Total Income, Total Expense, Net Balance) yang mengakumulasikan seluruh dampak mutasi secara periodik. |
| `isLoading` | Boolean | Status penanda kelangsungan eksekusi pengambilan data asinkron dari repositori lokal. |
| `error` | String | Status penyimpan keterangan galat teknis guna diinformasikan ke _Boundary_. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `recordTransaction()` | `userId: String, walletId: String, targetWalletId: String?, categoryId: String?, type: String, amount: Number, note: String?, description: String?, date: String` | Transaksi | Menyisipkan rekaman arus kas baru ke _Local Data Access_, memperbarui status `monthlyTotals` secara optimistik, dan menjadwalkan sinkronisasi latar belakang. |
| `editTransaction()` | `clientId: String, walletId: String?, targetWalletId: String?, categoryId: String?, type: String?, amount: Number?, note: String?, description: String?, date: String?` | Transaksi | Mengubah sebagian atau seluruh elemen mutasi kas, memperbarui `updatedAt`, dan memicu penjadwalan sinkronisasi luring. |
| `removeTransaction()` | `clientId: String` | Boolean | Menandai transaksi dengan status _soft-delete_ pada _Data Access_ dan menyesuaikan kembali sisa laporan neraca harian. |
| `loadData()` | `userId: String, period: String?, type: String?, categoryId: String?, walletId: String?` | Array<Transaksi> | Menarik dan mengatur ulang koleksi `transactions` maupun rekap `monthlyTotals` dari repositori lokal ke dalam memori sesi aktif. |

### 5. Class `KelolaAnggaran` (Wajib Rinci)

**Deskripsi:** _Control Class_ khusus untuk mengelola dan mengevaluasi batasan nominal pengeluaran. Class ini mencakup alur pembuatan parameter batas bulanan, perubahan angka batas pengeluaran, realokasi kuota antar-kategori, hingga penjadwalan ekspor mutasi ke antrean luring.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `budgets` | Array<Anggaran> | Daftar alokasi anggaran yang relevan dengan bulan peninjauan. |
| `budgetsWithStats`| Array<Object> | Model gabungan antara `Anggaran` murni dengan proyeksi hasil serapan dan sisa dana riil berdasarkan total `EXPENSE`. |
| `isLoading` | Boolean | Penanda waktu tunggu kueri penarikan _Data Access_. |
| `currentPeriod` | String | Kalibrator acuan penanggalan yang mengendalikan ruang batas filterisasi analisis data anggaran (YYYY-MM). |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `loadBudgets()` | `userId: String, period: String?` | Array<Anggaran> | Mengakses _Local Data Access_ untuk memadukan limit pagu `Anggaran` terhadap seluruh total pengeluaran transaksi per kategori untuk evaluasi serapan. |
| `addOrEditBudget()` | `clientId: String?, userId: String, categoryId: String, amount: Number, period: String` | Anggaran | Mendaftarkan parameter batas baru atau menguba parameter lama untuk evaluasi pengeluaran bulanan, lalu meneruskannya ke `sync_queue`. |
| `removeBudget()` | `clientId: String` | Boolean | Melakukan pelepasan ikatan evaluasi pengeluaran melalui mekanisme _soft-delete_. |
| `handleReallocate()` | `sourceClientId: String, destinationClientId: String, amount: Number` | Void | Mengeksekusi penarikan sebagian kuota pada suatu anggaran asal, memodifikasinya dengan batas sasaran baru secara terstruktur, dan menjadwalkan kedua perubahan. |

### 6. Class `KelolaTargetFinansial` (Wajib Rinci)

**Deskripsi:** _Control Class_ pengendali eksekusi bisnis penargetan pemasukan (`INCOME_TARGET`). Entitas ini murni memastikan pencatatan sasaran pemasukan kas di masa mendatang dapat dievaluasi progres pencapaiannya secara bertahap dan ditransmisikan konsistensinya menuju server asinkron.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `targets` | Array<TargetFinansial> | Penampung daftar rencana pencapaian pemasukan pengguna, diperkaya akumulasi progres capaian nominal terintegrasi. |
| `isLoading` | Boolean | Indikator durasi pembacaan matriks `TargetFinansial` lokal secara menyeluruh. |
| `error` | String | Saluran pengembalian deteksi cacat interaksi basis penyimpanan lokal. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `loadData()` | `userId: String` | Array<TargetFinansial> | Memanggil kueri penyaringan `TargetFinansial` dari penyimpanan lokal dan mengevaluasi status ketercapaian nominal transaksinya. |
| `recordTarget()` | `userId: String, name: String, type: String, targetAmount: Number, period: String, startDate: String, endDate: String?, categoryId: String, note: String?` | TargetFinansial | Menyimpan rencana pengumpulan kas baru secara luring dan memicu pembaruan pada `DALAntreanSinkronisasi`. |
| `editTarget()` | `clientId: String, name: String?, type: String?, targetAmount: Number?, period: String?, startDate: String?, endDate: String?, categoryId: String?, isActive: Boolean?, note: String?` | TargetFinansial | Merevisi limit waktu kalender pemantauan (`endDate`) maupun target sasaran mutlak (`targetAmount`) dengan memajukan `updatedAt`. |
| `removeTarget()` | `clientId: String` | Boolean | Menyisipkan jejak hapus logis (_soft-delete_) agar target ditarik dari peredaran pantauan interaktif. |

### 7. Class `KelolaAnalisis` (Wajib Rinci)

**Deskripsi:** _Control Class_ pengelola logika agregasi tingkat atas. Merupakan otak perumus sentral yang merubah koleksi data mutasi `Transaksi` murni menjadi paket DTO `RekapKeuangan`, mengeksekusi kalkulasi algoritma distribusi analitik kas, serta menetapkan pembentukan rekomendasi performa berbasis aturan peringatan keuangan.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `currentRecap` | RekapKeuangan | Konstruksi utuh penggabungan hasil agregasi dan penyusunan metrik performa periode yang sedang diamati antarmuka. |
| `isLoading` | Boolean | Parameter indikasi kalkulasi iterasi terhadap tumpukan transaksi aktif dalam `Data Access`. |
| `selectedPeriod`| String | Penentu koridor parameter filter rentang bulanan. |
| `error` | String | Indikasi kegagalan pemrosesan analitik secara lokal. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `loadAnalysisData()` | `userId: String, period: String` | Array<Transaksi> | Memerintahkan pengangkutan dataset dari lapis lokal yang relevan dengan koridor waktu untuk diteruskan kepada pengolah rekapitulasi. |
| `calculateMonthlySummary()` | `transactions: Array<Transaksi>` | RekapKeuangan | Mengekstraksi jumlah `INCOME` utuh, beban `EXPENSE` absolut, serta akumulasi saldo bersih komprehensif. |
| `generateTransactionTrend()` | `transactions: Array<Transaksi>` | Array<Object> | Menciptakan himpunan sebaran linier kurva per hari untuk tujuan visualisasi _Boundary_. |
| `generateCategoryDistribution()` | `transactions: Array<Transaksi>` | Array<Object> | Memecah parameter nominal serapan pengeluaran terhadap titik referensi ID kategori dan warnanya secara hierarkis. |
| `generateInsights()` | `recap: RekapKeuangan` | Array<String> | Menerjemahkan rekapitulasi angka baku menjadi sintesis pemahaman pengguna melalui wawasan tren peringatan (mis. "Tren pengeluaran meningkat"). |
| `generateRuleBasedRecommendations()` | `recap: RekapKeuangan` | Array<String> | Merumuskan usulan mitigasi atau saran aksi pencegahan atas dampak temuan parameter ritme yang terbukti melenceng. |

### 8. Class `KelolaNotifikasi` (Ringkas)

**Deskripsi:** _Control Class_ minimalis sebagai operator perantara pengelola status penciptaan dan pembacaan _log_ kejadian harian. Ia mencegah tumpang tindih pesan dan merespons sinyal urgensi secara teratur.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `notifications` | Array<LogNotifikasi> | Kumpulan daftar urutan pesan peringatan sistem. |
| `unreadCount` | Number | Penyimpan kalkulasi matriks angka pesan belum disentuh pengguna untuk kebutuhan notifikasi dinamis. |
| `isLoading` | Boolean | Status memuat entitas dari lumbung lokal aplikasi. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `loadLogs()` | `userId: String` | Array<LogNotifikasi> | Menarik dan memuat riwayat murni penyimpanan luring `LogNotifikasi`. |
| `createLog()` | `userId: String, title: String, body: String, type: String` | LogNotifikasi | Mengkreasikan laporan permanen riwayat teguran terhadap antarmuka lokal dan menyesuaikan metrik _unreadCount_. |
| `markAsRead()` | `id` (String) | Void | Mengaplikasikan stempel `isRead` menjadi _true_ atas aktivasi klik dari sisi presentasi `HalamanNotifikasi`. |
| `evaluateAlertNeeds()` | `recap: RekapKeuangan, ruleType: String` | Void | Menimbang probabilitas deviasi angka ekstrem atas target atau anggaran yang memaksa peluncuran pesan interupsi. |
| `preventDuplicateAlerts()` | `dedupeKey: String` | Boolean | Memblokir duplikasi rekaman peringatan identik untuk rentang batas parameter waktu tertentu. |

---

## Bagian 6 — Rincian Control/Service Sinkronisasi

### 1. Class `ManajerSinkronisasi` (Wajib Rinci)

**Deskripsi:** Sentral layanan arsitektur _Offline-First_ aplikasi. Merupakan sistem orkestrasi yang mengurai _payload_ transit pada `DALAntreanSinkronisasi` untuk dipompa (_push_) via infrastruktur antarmuka API, menjalankan skema _progressive remote apply_ saat _pull_ perubahan asinkron dari server, dan memperlakukan penyelesaian _Last-Write-Wins_ (LWW) tanpa ragu.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isSyncing` | Boolean | Mekanisme pengaman untuk mencegah instansiasi penarikan paralel saat pengoperasian jalur data asinkron masih bekerja. |
| `lastSyncTime` | DateTime | Pemegang stempel _watermark_ penarikan data mutlak berbasis waktu penyesuaian terakhir bersama infrastruktur awan (_cloud_). |
| `syncErrors` | Array | Memori rekaman diagnosis log teknis atas kendala atau resistensi jaringan API komprehensif. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `pushLocalChanges()` | `userId: String` | Boolean | Mencabut isi kemasan data persisten `ItemAntreanSinkronisasi` lokal yang berstatus `PENDING` untuk merestitusi perubahan langsung ke saluran komunikasi unggah jarak jauh. |
| `pullRemoteChanges()` | `userId: String` | Boolean | Merangsang penerimaan rekaman mutasi terdistribusi pasca marka `lastSyncTime` dari pusat komputasi server utama. |
| `applyProgressiveData()` | `serverData: Array<Object>` | Void | Mengamankan aliran muatan pasokan eksternal ke relung memori _IndexedDB_ lokal menggunakan metodologi rekonsiliasi yang terkendali. |
| `updateLastSyncTime()` | `timestamp: DateTime` | Void | Membarui marka referensi limit temporal `lastSyncTime` secara spesifik mengikuti angka verifikasi serapan antarmuka asinkron jarak jauh. |
| `reconcileLWW()` | `localData: Object, remoteData: Object` | Object | Melakukan eksekusi murni pembandingan parameter modifikasi terakhir (`updatedAt`) demi menentukan keberlakuan mutlak data tunggal berdasarkan _Last-Write-Wins_. |

### 2. Class `PengaturAntreanSinkronisasi` (Wajib Rinci)

**Deskripsi:** Pengatur ketahanan resiliensi jaringan (_Control Service_ transit). Bertanggung jawab memastikan siklus pelestarian retensi data `PENDING` tetap terjamin, menancapkan pewaktu interupsi otomatis _scheduling_, menyeimbangkan toleransi `Retry`, dan membersihkan jejak rekam mutasi ketika rintangan konektivitas usai tertangani.

**Atribut:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `queueItems` | Array<ItemAntreanSinkronisasi>| Registrasi senarai transit yang menyimpan perubahan objek mentah yang perlu didistribusikan. |
| `isProcessing` | Boolean | Parameter perintang _throttle_ ganda selama operasi drainase masih aktif tereksekusi. |
| `maxRetryLimit` | Number | Definisi parameter absolut untuk menolerir upaya kegagalan pengiriman otomatis (misalnya 5 kali) agar meminimalisir _loop_ tak terbatas. |

**Fungsi:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `scheduleSyncTimer()` | - | Void | Menanam pewaktu _cron_ periodik agar deteksi drainase paket perubahan (_drain_ queue) senantiasa mencoba peruntungannya. |
| `executeRetry()` | `queueItemId: String` | Void | Meretur kembali proses pemompaan terhadap `ItemAntreanSinkronisasi` spesifik selama indikasi upaya masih berada di lingkup angka batas atas aman `maxRetryLimit`. |
| `drainQueue()` | `userId: String` | Void | Berusaha mengosongkan tumpukan kargo data luring dan memasrahkannya kembali pada rantai saluran hulu `pushLocalChanges`. |
| `handleSyncFailure()` | `queueItemId: String, errorMessage: String?` | Void | Mengeksekusi penambahan inkremen upaya pendorong yang gagal secara bertahap seraya merekam narasi pengecualian ke memori diagnostik logika penanganan _retry_. |

---

## Bagian 7 — Rincian Data Access Class Inti

_Lapisan perantara luring ini menseragamkan pendekatan komunikasi terhadap IndexedDB melalui *wrapper* antarmuka tunggal. Setiap entri kelas utama menerapkan kapabilitas metode fundamental `getAll()`, `getByClientId()`, `create()`, `update()`, `softDelete()`, dan operasi skala besar `bulkUpsert()`._

### 1. Class `DALTransaksiLokal` (Wajib Rinci)

**Deskripsi:** Lapisan pengakses _IndexedDB_ murni yang bertindak membungkus dan mengisolasi manipulasi data presisi terhadap koleksi riwayat arus kas di lumbung peramban pengguna secara terstruktur.
**Atribut:**

- `storeName` (String): Referensi konstan menuju label penamaan tabel struktur objek `"transactions"`.
  **Fungsi Utama:**
- `getAll()`
  - Input: `userId: String`
  - Output: `Array<Transaksi>`
  - Deskripsi: Menarik tumpahan rekaman komprehensif tanpa batasan asimetris.
- `getByClientId()`
  - Input: `clientId: String`
  - Output: `Transaksi`
  - Deskripsi: Meretas spesifik satu rekaman arus kas berbasis ID UUID luring murni.
- `create()`
  - Input: parameter pembentuk entitas Transaksi
  - Output: `Transaksi`
  - Deskripsi: Menulis material utuh parameter transaksi kas baru.
- `update()`
  - Input: `clientId: String`, parameter opsional
  - Output: `Transaksi`
  - Deskripsi: Merekayasa angka atau koridor rekaman kas lama secara parsial atau menyeluruh.
- `softDelete()`
  - Input: `clientId: String`
  - Output: `Boolean`
  - Deskripsi: Melekatkan penanda logis pengabaian (`deletedAt`) atas instans kas.
- `bulkUpsert()`
  - Input: `dataList: Array<Transaksi>`
  - Output: `Void`
  - Deskripsi: Memasukkan himpunan besar antrean tarikan sinkronisasi sekaligus secara progresif untuk menekan limit utilisasi iterasi penyimpanan.

### 2. Class `DALAnggaranLokal` (Wajib Rinci)

**Deskripsi:** Sarana jembatan pendorong yang mematerialkan entitas kuota `Anggaran` bulanan menjadi persistensi rekaman lokal yang senantiasa menanti modifikasi pengguna.
**Atribut:**

- `storeName` (String): Label eksistensi basis pelindung kas di memori `"budgets"`.
  **Fungsi Utama:**
- `getAll()`
  - Input: `userId: String`
  - Output: `Array<Anggaran>`
  - Deskripsi: Mengambil seluruh riwayat data limit anggaran milik sesi pengguna.
- `getByClientId()`
  - Input: `clientId: String`
  - Output: `Anggaran`
  - Deskripsi: Menarik spesifik satu entitas anggaran berdasarkan ID UUID luring.
- `create()`
  - Input: parameter pembentuk entitas Anggaran
  - Output: `Anggaran`
  - Deskripsi: Menciptakan rekaman batas anggaran bulanan baru.
- `update()`
  - Input: `clientId: String`, parameter opsional
  - Output: `Anggaran`
  - Deskripsi: Memperbarui batasan anggaran yang sudah ada.
- `softDelete()`
  - Input: `clientId: String`
  - Output: `Boolean`
  - Deskripsi: Mengabaikan anggaran secara logis.
- `bulkUpsert()`
  - Input: `dataList: Array<Anggaran>`
  - Output: `Void`
  - Deskripsi: Menyesuaikan deretan paket perubahan anggaran dari rantai sinkronisasi luring.

### 3. Class `DALTargetFinansialLokal` (Ringkas)

**Deskripsi:** Komponen abstraksi yang melindungi proses pendaftaran parameter `TargetFinansial` agar eksistensinya tidak memudar kendati koneksi jaringan luar menghilang.
**Atribut:**

- `storeName` (String): Konvensi penamaan persetujuan `"targets"`.
  **Fungsi Utama:**
- `getAll()`
  - Input: `userId: String`
  - Output: `Array<TargetFinansial>`
  - Deskripsi: Menarik deretan target sasaran pemasukan pengguna.
- `getByClientId()`
  - Input: `clientId: String`
  - Output: `TargetFinansial`
  - Deskripsi: Mengambil rincian target secara individu.
- `create()`
  - Input: parameter pembentuk entitas TargetFinansial
  - Output: `TargetFinansial`
  - Deskripsi: Mendaftarkan satu misi sasaran moneter baru.
- `update()`
  - Input: `clientId: String`, parameter opsional
  - Output: `TargetFinansial`
  - Deskripsi: Menyunting metrik batas tenggat maupun besaran target.
- `softDelete()`
  - Input: `clientId: String`
  - Output: `Boolean`
  - Deskripsi: Menyembunyikan target yang kedaluwarsa atau dibatalkan.
- `bulkUpsert()`
  - Input: `dataList: Array<TargetFinansial>`
  - Output: `Void`
  - Deskripsi: Menerapkan paket rekonsiliasi _cloud_ untuk target finansial secara massal.

### 4. Class `DALKategoriLokal` (Ringkas)

**Deskripsi:** Pemegang akses _gateway_ terhadapan data klasifikasi pemasukan-pengeluaran agar rujukan penamaan `Kategori` tak mengalami distorsi pada sesi luring.
**Atribut:**

- `storeName` (String): Penamaan identitas `"categories"`.
  **Fungsi Utama:**
- `getAll()`
  - Input: `userId: String`
  - Output: `Array<Kategori>`
  - Deskripsi: Mengembalikan seluruh kategori kustomisasi klasifikasi kas yang sah.
- `getByClientId()`
  - Input: `clientId: String`
  - Output: `Kategori`
  - Deskripsi: Mendapatkan referensi klasifikasi tunggal dari penyimpanan asinkron.
- `create()`
  - Input: parameter pembentuk entitas Kategori
  - Output: `Kategori`
  - Deskripsi: Menambah kategori spesifik pengguna secara lokal.
- `update()`
  - Input: `clientId: String`, parameter opsional
  - Output: `Kategori`
  - Deskripsi: Memodifikasi warna, ikon, atau nama kategori yang telah ada.
- `softDelete()`
  - Input: `clientId: String`
  - Output: `Boolean`
  - Deskripsi: Menghapus kategori namun tetap merawat keterikatan ID pada kas lalu.
- `bulkUpsert()`
  - Input: `dataList: Array<Kategori>`
  - Output: `Void`
  - Deskripsi: Memulihkan dataset referensi kategori sinkron massal.

### 5. Class `DALDompetLokal` (Ringkas)

**Deskripsi:** Lapisan pelindung penulisan data identitas dompet yang menjamin instans rekaman saldo virtual tidak lenyap oleh kedangkalan peramban.
**Atribut:**

- `storeName` (String): Standarisasi penyebutan identitas kueri `"wallets"`.
  **Fungsi Utama:**
- `getAll()`
  - Input: `userId: String`
  - Output: `Array<Dompet>`
  - Deskripsi: Membaca rincian sumber dana pengguna tanpa komputasi saldo transaksional tambahan.
- `getByClientId()`
  - Input: `clientId: String`
  - Output: `Dompet`
  - Deskripsi: Memperoleh objek tunggal rincian sebuah dompet.
- `create()`
  - Input: parameter pembentuk entitas Dompet
  - Output: `Dompet`
  - Deskripsi: Membuka wadah penyimpanan dana independen baru.
- `update()`
  - Input: `clientId: String`, parameter opsional
  - Output: `Dompet`
  - Deskripsi: Mengubah penamaan label atau referensi entitas dompet.
- `softDelete()`
  - Input: `clientId: String`
  - Output: `Boolean`
  - Deskripsi: Menutup sumber dana logis secara luring.
- `bulkUpsert()`
  - Input: `dataList: Array<Dompet>`
  - Output: `Void`
  - Deskripsi: Menyinkronisasikan daftar sumber dompet dengan hasil unduhan server.

### 6. Class `DALAntreanSinkronisasi` (Wajib Rinci)

**Deskripsi:** Basis penampung `sync_queue` krusial yang bersifat _offline-first_. Merupakan jembatan fisik perantara transit `ItemAntreanSinkronisasi` hingga dilarutkan ke pelabuhan server.
**Atribut:**

- `storeName` (String): Penunjukan ruang tampungan khusus `"sync_queue"`.
  **Fungsi Utama Khusus:**
- `enqueueItem()`
  - Input: `entityName: String, entityClientId: String, operation: String, payload: Object`
  - Output: `ItemAntreanSinkronisasi`
  - Deskripsi: Menyisipkan perubahan baru ke antrean status transit.
- `getPendingItems()`
  - Input: `userId: String`
  - Output: `Array<ItemAntreanSinkronisasi>`
  - Deskripsi: Melakukan interogasi antrean terhadap item yang berstatus `PENDING`.
- `incrementRetryCount()`
  - Input: `queueItemId: String, errorMessage: String?`
  - Output: `Void`
  - Deskripsi: Menempelkan angka jejak modifikasi toleransi kegagalan API.
- `markAsSynced()`
  - Input: `queueItemId: String`
  - Output: `Boolean`
  - Deskripsi: Menandai `status` bahwa _payload_ berhasil dilontarkan.
- `removeSyncedItems()`
  - Input: `userId: String`
  - Output: `Void`
  - Deskripsi: Membersihkan (_purging_) entitas sukses demi pembersihan muatan kapasitas lokal.

### 7. Class `DALServerSinkronisasi` (Ringkas)

**Deskripsi:** Gerbang _API_ asinkron massal untuk bernegosiasi data pergeseran jaringan luar dengan parameter REST/RPC server.
**Atribut:**

- `apiEndpoint` (String): Koridor identitas referensi parameter pelabuhan rute _URI_ sistem.
  **Fungsi:**
- `pushChanges()`
  - Input: `userId: String, items: Array<ItemAntreanSinkronisasi>`
  - Output: `Object`
  - Deskripsi: Memfasilitasi muatan paket kargo masif koleksi _queue_ menuju terminal rute penerima `/api/sync/push`.
- `pullChanges()`
  - Input: `userId: String, lastSyncTime: DateTime?`
  - Output: `Object`
  - Deskripsi: Mendesak rute terminal penerbit informasi asinkron agar menyediakan pasokan pembaruan dataset pada `/api/sync/pull`.

### 8. Class `DALServerAutentikasi` (Ringkas)

**Deskripsi:** (Opsional) Penanggung jawab negosiasi permohonan asinkron kunci identitas (_JSON Web Token_/Otentikasi).
**Atribut:**

- `apiEndpoint` (String): Saluran gerbang layanan registrasi dan verifikasi.
  **Fungsi:**
- `requestLogin()`: Mengalirkan verifikasi kredensial rahasia pengguna menuju lapis validasi API.
- `requestLogout()`: Meneruskan seruan abdikasi eksistensi sesi sah dari sistem jarak jauh.
- `verifySession()`: Bertukar respons parameter pemulihan autentikasi token.

### 9. Class `DALServerNotifikasi` (Ringkas)

**Deskripsi:** (Opsional) Infrastruktur perantara API spesifik pemeliharaan dan aktivasi pendorong _web push OS browser_ jarak jauh.
**Atribut:**

- `apiEndpoint` (String): Identitas sasaran pelabuhan `subscription`.
  **Fungsi:**
- `registerPushSubscription()`: Mendaftarkan kunci persetujuan peramban OS pengguna baru pada ruang server pusat API.
- `updateSubscription()`: Mempertahankan kesinambungan kunci rahasia peramban saat pembaruan durasi kunci masa _push_ OS kedaluwarsa.
- `removeSubscription()`: Mengirim parameter paksa pelepasan layanan _web push_ OS terhadap antarmuka.

---

## Bagian 8 — Catatan Pemisahan Tahap 3 & Rekomendasi Selanjutnya

Berdasarkan rampungnya rincian terpusat mendetail bagi setiap representasi spesifik `Boundary`, `Entity`, `Control`, maupun `Data Access` lapis lokal di atas, maka arsitektur inti Tahap 1 & 2 dokumen telah teramankan ke dalam wujudnya secara paripurna.

Semua kelas pendukung yang sifatnya utilitas penunjang teknis kalkulatif (seperti _PenghitungRitmeAnggaran_, _PenghitungProgressTarget_, _PembentukInsight_, dan _PenyelesaiKonflik_) maupun elemen penunjang sekunder _Validator_ / _Mapper_ wajib dicantumkan eksklusif di dalam **Tahap 3**.

Rekomendasi selanjutnya adalah memulai implementasi tahap rancangan teknis yang merujuk struktur konstan dokumen kokoh ini!
