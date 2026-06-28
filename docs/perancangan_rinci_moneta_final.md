## 2.2 Perancangan Rinci

### 2.2.1. Package Antarmuka Pengguna

Gambar 2.1. Class Diagram Package Antarmuka Pengguna
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<boundary>>` **HalamanLogin**: Komponen antarmuka yang berfungsi sebagai pintu masuk bagi pengguna untuk memasukkan kredensial autentikasi.

Deskripsi atribut kelas HalamanLogin
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status proses pengiriman data autentikasi. |
| error | String | Menyimpan pesan kesalahan jika autentikasi gagal. |

Deskripsi fungsi pada kelas HalamanLogin

- `renderData() : Void` - Menampilkan formulir login.
- `handleSubmit(emailOrUsername: String, password: String) : Void` - Mengumpulkan kredensial dan meneruskannya ke kontrol autentikasi.

Kelas `<<boundary>>` **HalamanRegistrasi**: Komponen antarmuka pendaftaran akun pengguna baru.

Deskripsi atribut kelas HalamanRegistrasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status proses pengiriman data. |
| error | String | Menyimpan pesan kesalahan pendaftaran. |

Deskripsi fungsi pada kelas HalamanRegistrasi

- `renderData() : Void` - Menampilkan formulir pendaftaran.
- `handleSubmit(email: String, username: String, password: String, confirmPassword: String) : Void` - Mengumpulkan data registrasi dan meneruskannya ke kontrol autentikasi.

Kelas `<<boundary>>` **NavigasiGlobal**: Komponen sidebar atau navigasi bawah (bottom tab) yang selalu tersedia untuk perpindahan cepat antar halaman.

Deskripsi atribut kelas NavigasiGlobal
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| activePath | String | Menyimpan informasi rute aktif saat ini. |
| isCollapsed | Boolean | Menyimpan status apakah menu navigasi sedang diminimalkan (collapsed) atau tidak. |
| syncStatus | String | Menyimpan indikator status sinkronisasi data latar belakang. |
| userProfile | Object | Menyimpan ringkasan data profil pengguna untuk ditampilkan di menu. |

Deskripsi fungsi pada kelas NavigasiGlobal

- `handleNavigation(path: String) : Void` - Mengeksekusi perpindahan rute halaman.
- `handleToggleNavigation() : Void` - Mengubah status tampilan menu navigasi.
- `handleQuickAddTransaction() : Void` - Memicu pintasan (shortcut) formulir penambahan transaksi cepat.
- `renderSyncStatus() : Void` - Menampilkan indikator visual status sinkronisasi offline-first.

Kelas `<<boundary>>` **HalamanBeranda**: Komponen yang berfungsi menangani interaksi pengguna serta menampilkan dasbor agregasi ringkasan kondisi dan performa keuangan harian pengguna.

Deskripsi atribut kelas HalamanBeranda
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status proses pemuatan data. |
| error | String | Menyimpan pesan kesalahan yang muncul. |
| displayData | Object | Menyimpan struktur data keuangan yang telah diproses untuk siap dirender. |

Deskripsi fungsi pada kelas HalamanBeranda

- `renderData() : Void` - Merender data ringkasan finansial yang diterima dari control class ke dalam elemen antarmuka pengguna.
- `handleRefresh() : Void` - Memicu proses pemuatan ulang komponen data berdasarkan pembaruan kondisi lokal terbaru.

Kelas `<<boundary>>` **HalamanTransaksi**: Komponen yang berfungsi menangani interaksi penampilan riwayat transaksi keuangan serta menyediakan formulir pencatatan arus kas pengguna.

Deskripsi atribut kelas HalamanTransaksi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status proses pemuatan riwayat transaksi. |
| selectedFilter | Object | Menyimpan parameter penyaringan data transaksi pada tampilan. |
| transactionsList | Array<Transaksi> | Koleksi objek data mutasi arus kas berjalan yang akan dirender. |

Deskripsi fungsi pada kelas HalamanTransaksi

- `renderData() : Void` - Merender daftar data mutasi transaksi.
- `handleFilterChange(filter: Object) : Void` - Memperbarui parameter kriteria penyaringan data.
- `handleOpenActionMenu(id: String) : Void` - Menampilkan menu aksi kontekstual untuk satu transaksi spesifik.
- `handleOpenEditForm(id: String) : Void` - Menampilkan formulir untuk mengubah data transaksi yang dipilih.
- `handleDeleteRequest(id: String) : Void` - Meminta konfirmasi sebelum menghapus transaksi.
- `handleConfirmDelete(id: String) : Void` - Mengeksekusi konfirmasi penghapusan transaksi ke kontrol.
- `handleCloseForm() : Void` - Menutup modal atau formulir yang sedang terbuka.

Kelas `<<boundary>>` **HalamanAnggaran**: Komponen yang berfungsi menangani interaksi pemantauan batas pagu pengeluaran bulanan serta konfigurasi realokasi anggaran antar-kategori.

Deskripsi atribut kelas HalamanAnggaran
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status kalkulasi serapan anggaran. |
| budgetData | Array<RingkasanAnggaran> | Kumpulan data alokasi anggaran beserta metrik status penggunaannya. |
| selectedPeriod | String | Menyimpan parameter periode bulan aktif (YYYY-MM). |

Deskripsi fungsi pada kelas HalamanAnggaran

- `renderData() : Void` - Merender data batasan pagu anggaran dan hasil serapannya.
- `handlePeriodChange(period: String) : Void` - Memperbarui parameter filter periode peninjauan.
- `handleStatusFilterChange(status: String) : Void` - Menyaring tampilan daftar anggaran berdasarkan status serapannya (Aman, Kritis, atau Melebihi).
- `handleOpenReallocation(id: String) : Void` - Memicu komponen modal untuk mengeksekusi operasi pemindahan kuota dana antar-kategori (subsidi silang).
- `handleOpenActionMenu(id: String) : Void` - Menampilkan opsi aksi untuk satu item anggaran.
- `handleOpenEditForm(id: String) : Void` - Membuka formulir pengubahan pagu anggaran.
- `handleDeleteRequest(id: String) : Void` - Memunculkan konfirmasi hapus anggaran.
- `handleConfirmDelete(id: String) : Void` - Memproses penghapusan.
- `handleCloseForm() : Void` - Menutup jendela interaksi aktif.

Kelas `<<boundary>>` **HalamanTargetFinansial**: Komponen yang berfungsi menangani interaksi pemantauan kemajuan sasaran target pemasukan keuangan pengguna.

Deskripsi atribut kelas HalamanTargetFinansial
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status perhitungan statistik target. |
| targetsList | Array<TargetFinansial> | Koleksi objek rencana target pemasukan lengkap beserta persentase ketercapaiannya. |

Deskripsi fungsi pada kelas HalamanTargetFinansial

- `renderData() : Void` - Merender matriks kemajuan pencapaian poin target keuangan ke dalam elemen visual.
- `handleOpenActionMenu(id: String) : Void` - Membuka menu konteks untuk item target spesifik.
- `handleOpenEditForm(id: String) : Void` - Menampilkan komponen dialog formulir tambah/ubah target.
- `handleDeleteRequest(id: String) : Void` - Meminta validasi hapus.
- `handleConfirmDelete(id: String) : Void` - Mengeksekusi instruksi penghapusan.
- `handleCloseForm() : Void` - Menyembunyikan form.
- `handleSubmit(data: Object) : Void` - Mengumpulkan input pengguna dan meneruskannya menuju control class.

Kelas `<<boundary>>` **HalamanAnalisis**: Komponen yang berfungsi menangani interaksi penampilan metrik visualisasi performa keuangan bulanan serta penyajian wawasan finansial berbasis aturan.

Deskripsi atribut kelas HalamanAnalisis
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status kalkulasi agregasi tingkat atas. |
| analysisData | RekapKeuangan | Struktur DTO yang memuat tren dan persentase sebaran. |
| selectedPeriod | String | Parameter bulan aktif (YYYY-MM). |

Deskripsi fungsi pada kelas HalamanAnalisis

- `renderData() : Void` - Merender diagram lingkaran, grafik batang, dan kartu wawasan ke dalam elemen antarmuka.
- `handlePeriodChange(period: String) : Void` - Mengubah ruang lingkup rentang penanggalan data laporan.
- `handleTabChange(tab: String) : Void` - Melakukan perpindahan antar tab analisis (misal: Tab Kategori, Tab Tren Visual).
- `handleInsightAction(ctaTarget: String) : Void` - Menangani interaksi apabila pengguna menekan tombol Call-To-Action di dalam kartu rekomendasi finansial.
- `handleOpenCategoryDetail(categoryId: String) : Void` - Membuka layer rincian transaksi pembentuk suatu kategori pengeluaran spesifik.
- `handleCloseDrawer() : Void` - Menutup panel rincian analitik.

Kelas `<<boundary>>` **HalamanNotifikasi**: Komponen yang berfungsi menangani interaksi pembacaan dan pengelolaan log pesan peringatan dari sistem.

Deskripsi atribut kelas HalamanNotifikasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status proses pemuatan log notifikasi. |
| notificationsList | Array<LogNotifikasi> | Kumpulan objek rekam pesan peringatan aktif. |
| unreadCount | Number | Kalkulasi log jumlah pesan yang belum dibuka. |

Deskripsi fungsi pada kelas HalamanNotifikasi

- `renderData() : Void` - Merender daftar urutan kotak pesan peringatan secara sekuensial.
- `handleMarkAsRead(id: String) : Void` - Meneruskan aksi klik untuk mengubah parameter status keterbacaan pesan di lokal.
- `handleNotificationClick(id: String) : Void` - Mengarahkan rute navigasi pengguna berdasarkan tautan yang tersemat pada pesan notifikasi.
- `handleCtaAction(actionId: String) : Void` - Menangani klik pada tombol persetujuan atau pemicuan intervensi tertentu dari dalam pesan log.
- `handleFilterUnread(onlyUnread: Boolean) : Void` - Menyaring daftar tampilan untuk hanya menampilkan notifikasi yang belum dibaca.

Kelas `<<boundary>>` **HalamanDompet**: Komponen yang berfungsi menangani interaksi pengelolaan, penyesuaian identitas, dan konfigurasi sumber dana pengguna.

Deskripsi atribut kelas HalamanDompet
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status penarikan data akun rekening. |
| walletsList | Array<Dompet> | Koleksi dompet dan saldo berjalannya. |

Deskripsi fungsi pada kelas HalamanDompet

- `renderData() : Void` - Merender visualisasi kartu dompet pengguna.
- `handleOpenActionMenu(id: String) : Void` - Membuka menu konteks sumber dana.
- `handleOpenEditForm(id: String) : Void` - Menampilkan dialog untuk modifikasi data dompet.
- `handleOpenTransferForm() : Void` - Menampilkan antarmuka khusus pencatatan pemindahan saldo antar-dompet (transfer).
- `handleDeleteRequest(id: String) : Void` - Konfirmasi penghapusan data dompet.
- `handleConfirmDelete(id: String) : Void` - Memproses penghapusan logis dompet ke controller.
- `handleCloseForm() : Void` - Menutup form dompet.

Kelas `<<boundary>>` **HalamanKategori**: Komponen yang berfungsi menangani interaksi kustomisasi klasifikasi, pengelolaan warna, dan ikon referensi jenis transaksi.

Deskripsi atribut kelas HalamanKategori
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isLoading | Boolean | Menunjukkan status pemuatan kategori lokal. |
| categoriesList | Array<Kategori> | Koleksi klasifikasi kategori aktif. |

Deskripsi fungsi pada kelas HalamanKategori

- `renderData() : Void` - Merender daftar grid komponen klasifikasi kategori transaksi.
- `handleOpenActionMenu(id: String) : Void` - Menampilkan menu kelola (ubah/hapus) kategori.
- `handleOpenEditForm(id: String) : Void` - Membuka formulir pembaruan nama atau ikon kategori.
- `handleDeleteRequest(id: String) : Void` - Dialog validasi.
- `handleConfirmDelete(id: String) : Void` - Konfirmasi memutus keterlihatan kategori tanpa menghancurkan riwayat relasi.
- `handleCloseForm() : Void` - Menutup dialog aktif.

Kelas `<<boundary>>` **HalamanProfil**: Komponen antarmuka yang mengelola informasi identitas akun, memicu fungsi sinkronisasi manual, dan utilitas aplikasi.

Deskripsi atribut kelas HalamanProfil
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| userProfile | Object | Struktur data identitas, nama, dan status kredensial. |

Deskripsi fungsi pada kelas HalamanProfil

- `renderData() : Void` - Menampilkan halaman yang memuat info nama profil, tanggal bergabung, indikator status sinkronisasi server, serta kumpulan menu navigasi sistem (seperti kelola data dasar dan akun).
- `handleNavigateToSettings(path: String) : Void` - Menangani pengalihan halaman ke fungsi manajemen spesifik seperti pengaturan notifikasi, manajemen dompet, atau manajemen kategori.
- `handleForceSync() : Void` - Mengirim instruksi manual untuk memaksa antrean luring segera disinkronisasikan ke server.
- `handleClearLocalCache() : Void` - Memicu fungsi penghapusan cache atau data sesi lokal secara sementara untuk me-reset aplikasi klien tanpa menghapus data persisten di server.
- `handleExportXlsx() : Void` - Mengirim instruksi ekstraksi data pembukuan bulanan menjadi format Spreadsheet/XLSX.
- `handleLogout() : Void` - Menghancurkan sesi pengguna dari memori dan IndexedDB, lalu mengembalikan pengguna ke form login.

Kelas `<<boundary>>` **HalamanPengaturanNotifikasi**: Komponen antarmuka yang didedikasikan secara khusus untuk menangani interaksi pengelolaan perizinan dan preferensi peringatan aplikasi.

Deskripsi atribut kelas HalamanPengaturanNotifikasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| preferences | PengaturanNotifikasi | Objek model yang memuat opsi izin push, mode limitasi, dan parameter peringatan. |

Deskripsi fungsi pada kelas HalamanPengaturanNotifikasi

- `renderData() : Void` - Menampilkan opsi form toggle status perizinan notifikasi perangkat, aturan tipe peringatan aktif, toggle pengingat harian (daily reminder), serta batasan intervensi harian pengguna.
- `handleRequestPermission() : Void` - Memanggil API sistem operasi peramban web (Web Push API) untuk mengaktifkan notifikasi perangkat.
- `handleModeChange(mode: String) : Void` - Mengubah parameter jenis pelaporan yang diinginkan pengguna (contoh: Peringatan Langsung vs Ringkasan Harian).
- `handleToggleDailyReminder(handleToggleDailyReminder) : Void` - Menghidupkan atau mematikan fitur pengingat pencatatan keuangan harian.
- `handleDailyLimitChange(limit: Number) : Void` - Menyetel batas angka frekuensi maksimum peringatan yang dapat dikirim oleh sistem dalam rentang 24 jam.
- `handleSavePreferences() : Void` - Menyimpan dan menerapkan mutasi konfigurasi ke DAL lokal.

---

### 2.2.2. Package Autentikasi

Gambar 2.2. Class Diagram Package Autentikasi
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<entity>>` **Pengguna**: Model class yang merepresentasikan data sesi identitas pengguna untuk memverifikasi hak akses pada sisi klien.

Deskripsi atribut kelas Pengguna
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| id | String | Identifier unik pengguna yang tersimpan di server utama. |
| email | String | Alamat surel sebagai identitas autentikasi. |
| name | String | Nama tampilan profil. |
| hasSession | Boolean | Penanda status keaktifan sesi kredensial di dalam aplikasi klien, menggantikan akses token langsung untuk keamanan yang lebih tinggi. |

Deskripsi fungsi pada kelas Pengguna

- `Pengguna()` - Constructor pemetaan objek sesi.
- `isLoggedIn() : Boolean` - Memeriksa dan mengonfirmasi status validitas sesi identitas.

Kelas `<<control>>` **KelolaAutentikasi**: Control class yang menangani seluruh alur manajemen identitas (login, logout, registrasi, pemulihan sesi, pembaruan profil).

Deskripsi atribut kelas KelolaAutentikasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| currentUser | Pengguna | Menyimpan objek pengguna yang sedang aktif dalam sesi aplikasi klien saat ini. |
| isAuthenticated | Boolean | Indikator validasi hak akses komponen _protected route_. |
| isLoading | Boolean | Menunjukkan status proses penarikan data autentikasi. |
| error | String | Menyimpan pesan kesalahan autentikasi. |

Deskripsi fungsi pada kelas KelolaAutentikasi

- `login(emailOrUsername: String, password: String) : Pengguna` - Mengirimkan kredensial ke Server API dan mencatatnya ke memori klien.
- `register(email: String, username: String, password: String) : Pengguna` - Membuat profil identitas baru di server pusat dan otomatis memulai sesi.
- `logout() : Void` - Mengakhiri sesi pengguna aktif dan membersihkan seluruh riwayat profil luring.
- `validateSession(userId: String) : Boolean` - Melakukan validasi sesi memori lokal secara periodik.
- `recoverLocalSession() : Pengguna` - Mengembalikan sesi autentikasi berdasarkan ketersediaan cache profil di DAL lokal agar bisa digunakan secara luring.
- `updateUserStatus(userId: String, name: String?, email: String?) : Pengguna` - Memperbarui state profil klien setelah modifikasi nama/email.

---

### 2.2.3. Package Kelola Kategori

Gambar 2.3. Class Diagram Package Kelola Kategori
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<entity>>` **Kategori**: Model class yang merepresentasikan entitas klasifikasi transaksi untuk menstrukturkan analisis alokasi keuangan pengguna.

Deskripsi atribut kelas Kategori
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| clientId | String | UUID klien (Primary Key Lokal). |
| userId | String | Foreign key referensi pemilik entitas. |
| name | String | Label penamaan klasifikasi transaksi. |
| type | Enum / String | Jenis klasifikasi bernilai `INCOME` atau `EXPENSE`. |
| color | String | Kode warna heksadesimal representasi visual antarmuka. |
| icon | String | String identifier penanda ikon SVG/Font. |
| syncStatus | Enum / String | Status logis integrasi cloud (`SYNCED`, `PENDING`, `CONFLICT`). |
| updatedAt | DateTime | Stempel waktu dasar resolusi LWW. |
| deletedAt | DateTime | Penanda soft delete logis. |

Deskripsi fungsi pada kelas Kategori

- `Kategori()` - Constructor.
- `isIncome() : Boolean` - Memeriksa nilai `true` jika atribut type adalah `INCOME`.
- `isExpense() : Boolean` - Memeriksa nilai `true` jika atribut type adalah `EXPENSE`.
- `isDeleted() : Boolean` - Memeriksa keberadaan _flag_ penghapusan logis pada `deletedAt`.

Kelas `<<control>>` **KelolaKategori**: Control class yang mengenkapsulasi fungsi penambahan, pembaruan, dan manipulasi _soft delete_ entitas Kategori.

Deskripsi atribut kelas KelolaKategori
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| categories | Array<Kategori> | Koleksi daftar kategori aktif dalam satu ruang lingkup pengguna. |
| isLoading | Boolean | Penanda status berjalannya operasi mutasi. |
| error | String | Perekam pesan kesalahan jika ada galat. |

Deskripsi fungsi pada kelas KelolaKategori

- `loadCategories(userId: String) : Array<Kategori>` - Mengekstraksi kumpulan kategori milik pengguna dari _local access layer_.
- `addCategory(userId: String, name: String, type: String, icon: String?, color: String?) : Kategori` - Membuat kategori baru, menyimpan ke IndexedDB, dan mendaftarkan pembaruan ke dalam mekanisme sinkronisasi luring.
- `editCategory(clientId: String, name: String?, type: String?, icon: String?, color: String?) : Kategori` - Memodifikasi atribut rekaman kategori.
- `deleteCategory(clientId: String) : Boolean` - Mengeksekusi penandaan hapus logis, sehingga kategori disembunyikan tanpa merusak riwayat transaksi.
- `enqueueCategorySync(clientId: String) : Void` - Menyalurkan manifes mutasi kategori ke DAL antrean luring untuk ditarik _Sync Manager_ nantinya.

---

### 2.2.4. Package Kelola Dompet

Gambar 2.4. Class Diagram Package Kelola Dompet
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<entity>>` **Dompet**: Model identitas sumber dana atau rekening pengguna untuk pengelompokan riwayat saldo berjalan.

Deskripsi atribut kelas Dompet
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| clientId | String | UUID klien (Primary Key Lokal). |
| userId | String | Foreign key pengguna. |
| name | String | Label identitas dari sumber dana (misal: "Kas Tunai", "E-Wallet"). |
| type | Enum / String | Klarifikasi jenis sumber dana pengguna (contoh: `BANK`, `EWALLET`, `CASH`). |
| initialBalance | Number | Nominal saldo awal statis sebagai titik basis kalkulasi matematis riwayat. |
| syncStatus | Enum / String | Penanda mutasi (`SYNCED`, `PENDING`, `CONFLICT`). |
| updatedAt | DateTime | Acuan stempel resolusi modifikasi LWW. |
| deletedAt | DateTime | Penanda ketersediaan data logis aplikasi. |

Deskripsi fungsi pada kelas Dompet

- `Dompet()` - Constructor inisialisasi awal.
- `hasBalance() : Boolean` - Mengevaluasi nilai apakah saldo tidak bernilai kosong.
- `isDeleted() : Boolean` - Memvalidasi eksistensi akses logis pengguna.

Kelas `<<control>>` **KelolaDompet**: Control class untuk penambahan identitas sumber dana dan penentuan akumulasi jumlah uang yang tersebar di perangkat.

Deskripsi atribut kelas KelolaDompet
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| wallets | Array<Dompet> | Koleksi seluruh sumber dana pengguna di memori. |
| totalBalance | Number | Agregasi matematis absolut dari seluruh nilai dompet bersih. |
| isLoading | Boolean | Menunjukkan pengerjaan status logika sistem. |
| error | String | Menyimpan informasi kesalahan operasional kode. |

Deskripsi fungsi pada kelas KelolaDompet

- `loadWallets(userId: String) : Array<Dompet>` - Menarik koleksi rekaman dompet pada tabel lokal terkait.
- `addWallet(userId: String, name: String, type: String, initialBalance: Number) : Dompet` - Menyimpan identitas dompet pendatang baru di memori IndexedDB.
- `editWallet(clientId: String, name: String?, type: String?, initialBalance: Number?) : Dompet` - Memperbarui status properti pada identitas rekaman terkait.
- `deleteWallet(clientId: String) : Boolean` - Menyisipkan label temporal penanda penghapusan secara _soft delete_.
- `calculateFinalBalance(walletId: String, transactions: Array<Transaksi>) : Number` - Melakukan ekstraksi riwayat tabel mutasi uang untuk menentukan jumlah sisa rasio saldo faktual saat ini (real-time).
- `enqueueWalletSync(clientId: String) : Void` - Meletakkan jejak perintah eksekusi perubahan dompet menuju lapisan _Sync Queue_.

---

### 2.2.5. Package Kelola Transaksi

Gambar 2.5. Class Diagram Package Kelola Transaksi
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<entity>>` **Transaksi**: Model class yang merepresentasikan rekam riwayat arus kas pengguna. Mendukung pemasukan (`INCOME`), pengeluaran (`EXPENSE`), serta perpindahan nominal di antara dua dompet berbeda (`TRANSFER`).

Deskripsi atribut kelas Transaksi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| clientId | String | UUID klien lokal yang dihasilkan saat inisiasi peramban luring. |
| id | String | Server ID opsional hasil verifikasi _database remote_. |
| userId | String | Foreign key entitas pemilik sah. |
| walletId | String | Foreign key rujukan entitas asal sumber dana dompet primer. |
| targetWalletId | String | (Opsional) Rujukan dompet sekunder khusus ketika nilai parameter type adalah `TRANSFER`. |
| categoryId | String | (Opsional) Referensi tipe pengeluaran/pemasukan. Dibolehkan bernilai `null` apabila type berupa `TRANSFER`. |
| type | Enum / String | Jenis pembukuan arus kas, dibatasi pada nilai `INCOME`, `EXPENSE`, atau `TRANSFER`. |
| amount | Number | Nilai nominal transaksi yang dicatat oleh pengguna. |
| note | String | Teks informasi sekunder pelengkap deskripsi. |
| description | String | Rincian keterangan bebas. |
| date | String | Tanggal berlakunya peristiwa operasional ISO (`YYYY-MM-DD`). |
| syncStatus | Enum / String | Status validasi data lintas instansiasi. |
| createdAt | DateTime | Pencatatan penerbitan inisiasi perdana. |
| updatedAt | DateTime | Indikator _Last-Write-Wins_. |
| deletedAt | DateTime | Penanda modifikasi visibilitas _soft delete_. |

Deskripsi fungsi pada kelas Transaksi

- `Transaksi()` - Constructor.
- `isIncome() : Boolean` - Konfirmasi `type === INCOME`.
- `isExpense() : Boolean` - Konfirmasi `type === EXPENSE`.
- `isTransfer() : Boolean` - Konfirmasi `type === TRANSFER`.
- `isDeleted() : Boolean` - Cek penghapusan logis.

Kelas `<<control>>` **KelolaTransaksi**: Control class yang membungkus abstraksi pendaftaran operasional arus kas, rekonsiliasi nilai, dan pemfilteran hasil pencarian pengguna.

Deskripsi atribut kelas KelolaTransaksi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| transactions | Array<Transaksi> | Memori penampung kumpulan log riwayat transaksi aktif yang siap divisualisasikan. |
| monthlyTotals | Object | Representasi agregasi nilai pendapatan kotor dan pengeluaran. |
| isLoading | Boolean | Penanda status pemuatan logika lokal. |
| error | String | Wadah pengumpulan laporan kesalahan antarmuka pengguna. |

Deskripsi fungsi pada kelas KelolaTransaksi

- `loadTransactions(userId: String, period: String?, type: String?, categoryId: String?, walletId: String?) : Array<Transaksi>` - Menerapkan pembacaan berlapis sesuai filter dari koleksi penyimpanan IndexedDB.
- `addTransaction(userId: String, walletId: String, targetWalletId: String?, categoryId: String?, type: String, amount: Number, note: String?, description: String?, date: String) : Transaksi` - Memverifikasi integritas input, lalu membuat objek rekaman baru secara luring.
- `editTransaction(clientId: String, walletId: String?, targetWalletId: String?, categoryId: String?, type: String?, amount: Number?, note: String?, description: String?, date: String?) : Transaksi` - Memodifikasi properti, memengaruhi agregasi nominal, dan memperbarui stempel waktu _updatedAt_.
- `deleteTransaction(clientId: String) : Boolean` - Mengabaikan jejak rekam data melalui manipulasi _deletedAt_.
- `enqueueTransactionSync(clientId: String) : Void` - Meresapkan salinan muatan operasi ke komponen lapisan sinkronisasi lokal.

---

### 2.2.6. Package Kelola Anggaran

Gambar 2.6. Class Diagram Package Kelola Anggaran
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<entity>>` **Anggaran**: Model class representasi batas batas kuota pengeluaran yang diatur secara deterministik untuk jenis transaksi `EXPENSE`.

Deskripsi atribut kelas Anggaran
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| clientId | String | UUID primer sisi peramban pengguna. |
| id | String | ID Cloud pasca-sinkronisasi. |
| userId | String | Konteks Foreign Key Pemilik. |
| categoryId | String | Konteks Foreign Key tujuan limitasi tipe pengeluaran. |
| amount | Number | Nilai batas kuota maksimum pembelanjaan (pagu). |
| period | String | Indikator ruang waktu penerapan aturan (YYYY-MM). |
| syncStatus | Enum / String | Parameter kendali pengiriman luring. |
| createdAt | DateTime | Acuan log pelacakan awal pembentukan. |
| updatedAt | DateTime | Parameter perbandingan LWW. |
| deletedAt | DateTime | Aturan filter logis persembunyian data. |

Deskripsi fungsi pada kelas Anggaran

- `Anggaran()` - Constructor.
- `isActive() : Boolean` - Pemastian rentang validitas fungsionalitas pengikatan (binding limit).
- `isDeleted() : Boolean` - Pembacaan visibilitas logis.
- `belongsToCategory(categoryId: String) : Boolean` - Memverifikasi validitas korelasi identitas tipe transaksi.
- `isForPeriod(period: String) : Boolean` - Pengecekan penerapan masa efektif batasan pembelanjaan.

Kelas `<<DTO>>` **RingkasanAnggaran**: DTO pembungkus gabungan entitas rekaman dan hasil observasi serapan arus kas yang sesungguhnya.

Deskripsi atribut kelas RingkasanAnggaran
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| budget | Anggaran | Induk manifestasi limit kuota eksklusif. |
| spent | Number | Hasil penelusuran angka agregasi akumulatif riwayat `EXPENSE` bulanan. |
| percentage | Number | Rasio pembandingan logis nilai `spent` berbanding kapasitas `amount`. |
| status | String | String enumerasi klasifikasi derajat keamanan kondisi (Aman, Peringatan, atau Melebihi). |

Kelas `<<control>>` **KelolaAnggaran**: Control class pengevaluasi pengekangan arus keuangan agar sejalan dengan kerangka pagu belanja.

Deskripsi atribut kelas KelolaAnggaran
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| budgets | Array<Anggaran> | Wadah log kuota murni aktif milik pengguna di periode tinjauan. |
| budgetsWithStats | Array<RingkasanAnggaran> | Koleksi entitas DTO termodifikasi yang mengandung pemosisian progres kemajuan serapan rasio kas riil. |
| isLoading | Boolean | Parameter antarmuka penunjuk berjalannya kalkulasi matematis. |
| currentPeriod | String | Rentang waktu pemetaan fungsional pencarian filter `YYYY-MM`. |

Deskripsi fungsi pada kelas KelolaAnggaran

- `loadBudgets(userId: String, period: String?) : Array<Anggaran>` - Mengekstraksi rekaman rincian limit per bulan berjalan.
- `addBudget(clientId: String?, userId: String, categoryId: String, amount: Number, period: String) : Anggaran` - Pendaftaran objek limit baru.
- `editBudget(clientId: String?, userId: String, categoryId: String, amount: Number, period: String) : Anggaran` - Penyesuaian batas nominal maksimal pagu belanja berjalan.
- `deleteBudget(clientId: String) : Boolean` - Pembasmian rekam secara logis (_soft delete_).
- `handleSubsidiSilang(sourceClientId: String, destinationClientId: String, amount: Number) : Void` - Memproses pemindahan sebagian sisa anggaran dari kategori sumber ke kategori tujuan (Subsidi Silang/Realokasi Anggaran). Memperbarui parameter `amount` kedua belah pihak.
- `enqueueBudgetSync(clientId: String) : Void` - Mengoper _payload_ instruksi perubahan batas untuk dilempar ke server secara progresif.

---

### 2.2.7. Package Kelola Target Finansial

Gambar 2.7. Class Diagram Package Kelola Target Finansial
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<entity>>` **TargetFinansial**: Model sasaran akumulasi pendapatan. Entitas ini tidak terpengaruh oleh penyusutan nominal transaksi tipe `EXPENSE` dan pemindahan rute `TRANSFER`.

Deskripsi atribut kelas TargetFinansial
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| clientId | String | UUID operasional penyimpanan _offline_. |
| id | String | Validasi identitas server awan opsional. |
| userId | String | Indikator atribusi akun. |
| name | String | Frasa rujukan nama rencana capaian positif target. |
| type | Enum / String | Jenis tipe sasaran murni (Hanya bernilai `INCOME_TARGET`). |
| targetAmount | Number | Batas nilai tujuan nominal angka tertinggi yang ingin disentuh. |
| period | Enum / String | Durasi komputasi pengecekan ketercapaian harian/mingguan/bulanan (`DAILY`, `WEEKLY`, `MONTHLY`, `CUSTOM`). |
| startDate | String | Batas bawah pembacaan rentang arus kas target. |
| endDate | String | (Opsional) Penentuan parameter batas atas estimasi ekspektasi ketercapaian dana. |
| categoryId | String | (Opsional) Validasi khusus apabila pengguna ingin melacak pendanaan sasaran dari satu tipe kategori penghasilan saja. |
| walletId | String | (Opsional) Rencana parameter pelacakan pengikatan dompet spesifik khusus (cadangan masa depan). |
| isActive | Boolean | Indikator ketersediaan status berjalan sistem secara efektif. |
| note | String | Rincian rekaman teks deskripsi sampingan. |
| syncStatus | Enum / String | Pengukuran validitas integrasi jaringan API sinkronisasi jarak jauh (`SYNCED`, `PENDING`). |
| createdAt | DateTime | Riwayat cap log kelahiran rekaman basis data aplikasi lokal. |
| updatedAt | DateTime | Parameter ukur rekonsiliasi data _offline-first_. |
| deletedAt | DateTime | Rekayasa data penyembunyian antarmuka logis untuk riwayat terdahulu. |

Deskripsi fungsi pada kelas TargetFinansial

- `TargetFinansial()` - Pemanggilan instansiasi constructor.
- `isIncomeTarget() : Boolean` - Memverifikasi tipe klasifikasi secara eksklusif berjenis `INCOME_TARGET`.
- `isActiveOnDate(date: String) : Boolean` - Pengecekan perpotongan rentang parameter waktu berjalan dalam irisan `startDate` dan `endDate`.
- `isDeleted() : Boolean` - Validasi penyaringan flag _soft delete_.
- `belongsToCategory(categoryId: String) : Boolean` - Mencocokkan relasi ikatan khusus dari tipe kriteria pendapatan tertentu.

Kelas `<<control>>` **KelolaTargetFinansial**: Orkestrator eksekusi pengikatan log target pendapatan yang memperhitungkan akumulasi nilai kas tipe `INCOME` yang sah.

Deskripsi atribut kelas KelolaTargetFinansial
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| targets | Array<TargetFinansial> | Penampung gabungan kemajuan progres finansial yang bersanding dengan entitas murni sasaran pengguna aktif di layar. |
| isLoading | Boolean | Konfirmasi status pemuatan logika latar belakang proses. |
| error | String | Pelapor sinyal rekam jejak kegagalan atau validasi sistem aplikasi. |

Deskripsi fungsi pada kelas KelolaTargetFinansial

- `loadFinancialTargets(userId: String) : Array<TargetFinansial>` - Mengekstraksi daftar rekaman impian fungsionalitas dari repositori IndexedDB spesifik akun.
- `addFinancialTarget(userId: String, name: String, type: String, targetAmount: Number, period: String, startDate: String, endDate: String?, categoryId: String, note: String?) : TargetFinansial` - Pembuatan sasaran eksklusif, penyisipan ke lokal memori, disusul integrasi masuk antrean sinkronisasi asinkron luring.
- `editFinancialTarget(clientId: String, name: String?, type: String?, targetAmount: Number?, period: String?, startDate: String?, endDate: String?, categoryId: String?, isActive: Boolean?, note: String?) : TargetFinansial` - Pembaruan sasaran nominal nilai, pergeseran durasi pelacakan waktu target, dan pembaruan stempel rekonsiliasi integrasi.
- `deleteFinancialTarget(clientId: String) : Boolean` - Menutup visibilitas data dari rekam penelusuran secara lokal luring melalui teknik _soft delete_.

---

### 2.2.8. Package Analisis dan Insight

Gambar 2.8. Class Diagram Package Analisis dan Insight
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<DTO>>` **RekapKeuangan**: Objek statis penampung kalkulasi agregasi penggabungan, proporsi klasifikasi kategori, serta persentase sebaran distribusi bulan evaluasi terkait.

Deskripsi atribut kelas RekapKeuangan
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| period | String | Parameter penamaan jangkauan evaluasi pemrosesan rentang kalender (`YYYY-MM`). |
| totalIncome | Number | Akumulasi nilai utuh penggabungan seluruh aliran masuk sumber pendapatan pengguna secara agregat. |
| totalExpense | Number | Kalkulasi penjumlahan pengeluaran agregat bulanan secara total iteratif. |
| netBalance | Number | Proporsi rasionil nilai selisih absolut parameter `totalIncome` disubtraksi dengan `totalExpense`. |
| categoryDistribution | Array | Objek hierarki rincian rasio angka beban sebaran distribusi pembelanjaan berdasarkan tipe nama rujukan kategorinya masing-masing. |
| trendData | Array | Manifestasi struktur pelacakan visual perolehan performa grafik diagram linier mingguan untuk ditangkap oleh pustaka visual (chart lib) pengguna secara progresif. |

Deskripsi fungsi pada kelas RekapKeuangan

- `RekapKeuangan()` - Pemaketan agregasi angka dasar.
- `isPositive() : Boolean` - Pemastian indikator bahwa rasio pendapatan tidak defisit ketimbang beban belanja bulanannya.
- `getSavingsRate() : Number` - Konversi perhitungan pecahan nilai simpanan terhadap parameter proporsi pemasukan.

Kelas `<<DTO>>` **ItemInsight**: Paket DTO mandiri untuk membungkus sinyal intervensi _rule-based_ menjadi kartu informasi siap saji pada antarmuka.

Deskripsi atribut kelas ItemInsight
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| type | String | Klasifikasi peringatan (misal: `WARNING`, `PRAISE`, `TIP`). |
| message | String | Kalimat tekstual yang mencerminkan pemaknaan dari aturan yang telah dievaluasi sistem. |
| ctaLabel | String | Label tombol dorongan aksi (Call-To-Action) yang opsional apabila intervensi membutuhkan penanganan pengguna. |
| ctaTarget | String | Representasi penanda alamat URI (_path rute_) tujuan dari pemicu instruksi tombol `ctaLabel`. |

Kelas `<<control>>` **KelolaAnalisis**: Komponen pusat pemrosesan mesin rekomendasi ringan berbasis aturan (_rule-based reasoning_).

Deskripsi atribut kelas KelolaAnalisis
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| currentRecap | RekapKeuangan | Hasil rujukan kalkulasi metrik gabungan bulan tinjauan filter secara aktual saat siklus peramban dibuka oleh klien sistem. |
| isLoading | Boolean | Param penanda konfirmasi interogasi basis data memori lokal secara ekstensif pada beban kerja iteratif tinggi. |
| selectedPeriod | String | Saringan pembatas data bulan pemrosesan kalkulasi analitis harian. |
| error | String | Komponen pelacak rekaman penangkap log ketidaksesuaian nilai fungsional sistem saat penyusunan rekap komputasi. |

Deskripsi fungsi pada kelas KelolaAnalisis

- `loadAnalysisData(userId: String, period: String) : Array<Transaksi>` - Menerapkan interogasi ekstensi filter khusus riwayat rentang tanggal `Transactions` lokal.
- `calculateMonthlySummary(transactions: Array<Transaksi>) : RekapKeuangan` - Melakukan penjumlahan akumulasi deterministik (tanpa AI/ML) lalu membentuk struktur `RekapKeuangan`.
- `generateTransactionTrend(transactions: Array<Transaksi>) : Array<Object>` - Mengubah data riwayat mentah format baris ke baris sumbu koordinat grafik visual.
- `generateCategoryDistribution(transactions: Array<Transaksi>) : Array<Object>` - Mensintesis pembagian pembobotan nominal transaksi pengeluaran diklasifikasikan berdasar Foreign Key ID-nya ke format representatif pie-chart.
- `generateInsights(recap: RekapKeuangan) : Array<ItemInsight>` - Menganalisis secara matematis tren keuangan yang direkapitulasi dan memproduksi sinyal panduan analitis _ItemInsight_.
- `generateRuleBasedRecommendations(recap: RekapKeuangan) : Array<ItemInsight>` - Menerapkan kerangka mesin logika bersyarat murni (contoh: JIKA `spent/budget > 90%` MAKA `Keluarkan Peringatan`) untuk menerbitkan pemberitahuan preventif deviasi parameter metrik pembelanjaan dan pendapatan pengguna.

---

### 2.2.9. Package Notifikasi

Gambar 2.9. Class Diagram Package Notifikasi
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<entity>>` **PengaturanNotifikasi**: Model parameter preferensi regulasi limit frekuensi harian peringatan pengguna lokal.

Deskripsi atribut kelas PengaturanNotifikasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| clientId | String | Pengenal primer eksklusif lokal. |
| userId | String | Rujukan pengguna identitas entitas. |
| isPushEnabled | Boolean | Perizinan akses sinkronisasi Push Notification OS pada instansiasi tingkat aplikasi (_Web Push_). |
| budgetAlertEnabled | Boolean | Persetujuan regulasi sinyal pelaporan ambang pagu belanja bulanan. |
| targetAlertEnabled | Boolean | Persetujuan regulasi dorongan sinyal progres keberhasilan pendapatan. |
| mode | Enum / String | Filter konfigurasi agregasi penyaluran harian (misal: `INSTANT_ALERT`, `DAILY_SUMMARY_ONLY`). |
| dailyLimit | Number | Titik kuota maksimal batasan _push_ harian yang dapat diterbitkan per siklus kalender hari tersebut agar mencegah pengguna mendapat kesan antarmuka sistem _spam_. |
| updatedAt | DateTime | Parameter rekonsiliasi data _Last-Write-Wins_. |

Deskripsi fungsi pada kelas PengaturanNotifikasi

- `PengaturanNotifikasi()` - Pengaturan nilai dasar form parameter baru (Default schema).
- `isAlertActive(type: String) : Boolean` - Memverifikasi keabsahan izin pemanggilan tipe klasifikasi log pesan tertentu.
- `togglePush() : Void` - Merespons modifikasi aktivasi sinyal sinkronisasi dengan _server push cloud api_.

Kelas `<<entity>>` **LogNotifikasi**: Model riwayat log kejadian, alarm peringatan sistem, atau pemberitahuan dorongan apresiasi keberhasilan pengguna.

Deskripsi atribut kelas LogNotifikasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| clientId | String | UUID entitas di lokal basis IndexedDB. |
| userId | String | Penunjuk pengguna otentik asal. |
| dedupeKey | String | Komposit identifier penghindar redudansi repetisi publikasi pengiriman log kejadian serupa di rentang durasi berdekatan harian. |
| title | String | Narasi teks bagian perkenalan baris subjek log harian pesan antarmuka peringatan. |
| body | String | Paragraf sekunder informasional mengenai peringatan _rule-based_ sistem. |
| type | String | Klasifikasi peringatan internal `BUDGET_WARNING`, `TARGET_ACHIEVED`. |
| isRead | Boolean | Konfirmasi pengguna dalam mengakses keterbacaan instruksi log pesan. |
| ctaLabel | String | (Opsional) Rekaman properti teks referensi persetujuan pengguna untuk melakukan navigasi layar fungsional. |
| ctaTarget | String | (Opsional) URI alamat perpindahan rute dalam mengeksekusi label rujukan konfirmasinya. |
| syncStatus | Enum / String | Atribut status transmisi _sync queue_. |
| createdAt | DateTime | Pencatatan parameter pelacakan pembentukan. |
| updatedAt | DateTime | Pelacakan pembaruan resolusi rujukan sinkronisasi awan. |

Deskripsi fungsi pada kelas LogNotifikasi

- `LogNotifikasi()` - Instansiasi pembentukan komponen objek rincian.
- `markAsRead() : Void` - Mengganti tipe visibilitas peringatan ke kondisi terselesaikan oleh pengguna aplikasi.
- `isUnread() : Boolean` - Pemeriksaan saringan prioritas antarmuka atas status log baru.

Kelas `<<control>>` **KelolaNotifikasi**: Komponen pengatur manajemen parameter evaluasi ambang batas harian guna memicu peluncuran dan pelekatan pesan ke komponen visual di layer antarmuka.

Deskripsi atribut kelas KelolaNotifikasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| notifications | Array<LogNotifikasi> | Daftar antrean jejak peringatan logis aktif berurutan temporal (kronologis memori). |
| unreadCount | Number | Konversi numerik jumlah pesan peringatan sistem prioritas merah (urgen) yang belum diinspeksi. |
| isLoading | Boolean | Pengukur proses operasional fungsional komponen logis. |

Deskripsi fungsi pada kelas KelolaNotifikasi

- `loadLogs(userId: String) : Array<LogNotifikasi>` - Ekstraksi dan rekayasa pengambilan _records_ log kejadian murni historis via repositori lokal luring klien IndexedDB.
- `createLog(userId: String, title: String, body: String, type: String) : LogNotifikasi` - Menyusupkan dan menerbitkan peringatan kejadian rekaman mutasi fungsional sistem kepada baris antarmuka dan repositori.
- `markAsRead(id: String) : Void` - Mengatur mutasi flag indikator akses visual pesan peringatan secara dinamis.
- `evaluateAlertNeeds(recap: RekapKeuangan, ruleType: String) : Void` - Mengevaluasi kondisi anggaran, target finansial, atau rekomendasi berdasarkan aturan yang telah ditentukan untuk menentukan apakah notifikasi perlu dibuat.
- `preventDuplicateAlerts(dedupeKey: String) : Boolean` - Pencegahan publikasi eksesif pesan berantai dengan menginterogasi `dedupeKey` komposit berulang dalam bingkai durasi sinkronisasi penanggalan yang identik.

---

### 2.2.10. Package Sinkronisasi Offline-first

Gambar 2.10. Class Diagram Package Sinkronisasi Offline-first
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Kelas `<<DTO>>` **ItemAntreanSinkronisasi**: Representasi manifes data mentah operasional murni atas modifikasi rekam persisten pada lapisan IndexedDB yang memuat _payload_ transaksi sebelum tersalurkan via rute Push Sync.

Deskripsi atribut kelas ItemAntreanSinkronisasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| id | String | Pengenal kunci transit pengiriman antrean. |
| entityName | String | Penunjuk tabel asal referensi (misal: `TRANSACTION`, `CATEGORY`, `BUDGET`, `WALLET`). |
| operationType | Enum / String | Instruksi verba _CRUD_ murni (`CREATE`, `UPDATE`, `DELETE`). |
| payload | Object | Paket data format mentah utuh atas _state_ entitas terakhir modifikasi perubahan pengguna secara total utuh. |
| retryCount | Number | Memori kuantitas akumulasi kalkulasi usaha penyampaian instruksi ke server paska hambatan putus sambungan internet. |
| status | Enum / String | Informasi pelacakan distribusi persetujuan transit sinkronisasi (`PENDING`, `FAILED`). |

Deskripsi fungsi pada kelas ItemAntreanSinkronisasi

- `ItemAntreanSinkronisasi()` - Wrapper instansiasi konstruksi pembuatan _payload_.
- `incrementRetry() : Void` - Pembaruan nilai hitungan gagal jaringan kompensasi eksponensial.
- `isMaxRetryReached(limit: Number) : Boolean` - Pemastian indikator pelacakan agar pengerjaan ulang transmisi di masa lalu yang terlalu uzur tidak mengunci sistem antrean eksekusi memori secara permanen (_infinite loop block_).

Kelas `<<control>>` **ManajerSinkronisasi**: Sistem orkestrasi integrasi komponen eksternal murni menggunakan logika sinkronisasi _Push_, _Pull_, peresapan data (_Hydration_), dan kerangka pertimbangan stempel temporal resolusi mutlak _Last-Write-Wins (LWW)_.

Deskripsi atribut kelas ManajerSinkronisasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| isSyncing | Boolean | Kunci _mutex flag_ pengatur kendali rute eksklusif guna menangkal risiko paralel transmisi pengiriman berjenjang memori data (mencegah _race condition_). |
| lastSyncTime | DateTime | Stempel penanda titik persetujuan temporal (_watermark_ integrasi terakhir) pada awan server paska perbandingan. |
| syncErrors | Array | Log tumpukan antrean perekam manifestasi kegagalan transmisi untuk bahan diagnostik aplikasi di kemudian masa penggunaan. |

Deskripsi fungsi pada kelas ManajerSinkronisasi

- `pushLocalChanges(userId: String) : Boolean` - Mengekstrak _queue items_ manifes dari repositori dan mendorong seluruh modifikasi harian klien ke arah _API layer_ eksternal melalui koneksi internet.
- `pullRemoteChanges(userId: String) : Boolean` - Meminta serapan _delta payload update_ terkini secara rekursif progresif dari lapisan basis data Prisma server cloud terintegrasi untuk menarik rujukan mutasi luring klien sekunder lainnya.
- `applyProgressiveData(serverData: Array<Object>) : Void` - Meresapkan secara dinamis (Hydration) manifestasi perubahan objek jaringan masuk ke struktur rujukan parameter relasional koleksi layer repositori lokal (IndexedDB) klien gawai tersebut.
- `reconcileLWW(localData: Object, remoteData: Object) : Object` - Membedah param komponen log temporal atribut murni komparasi antara `updatedAt` milisi sistem luring versus `updatedAt` milisi sistem awan untuk menekan validasi _record state_ final berdasar kaidah siapa yang terkemudian menyimpan (Last Write Wins).
- `updateLastSyncTime(timestamp: DateTime) : Void` - Mencatat validasi stempel waktu batas pengambilan sinkronisasi _pull_ berjangka sukses ke basis aplikasi untuk mengefisienkan _query_ masa mendatang di layer peramban secara progresif dinamis.

Kelas `<<control>>` **PengaturAntreanSinkronisasi**: Layanan pemelihara ketahanan jaringan (_resilience_) otomatis menggunakan kontrol mekanisme jeda tunggu periodik yang memutar ulang pengosongan sinkronisasi manifes terhambat saat kondisi perangkat klien terpantau memperoleh sambungan transmisi jaringan kembali (Online event trigger).

Deskripsi atribut kelas PengaturAntreanSinkronisasi
| Nama atribut | Tipe Data | Deskripsi |
|---|---|---|
| queueItems | Array<ItemAntreanSinkronisasi> | Koleksi wadah pembawa memori perubahan modifikasi operasi basis data luring tertunda harian. |
| isProcessing | Boolean | Sinyal filter pembatasan pengurasan operasi antrean repetitif (_throttling flag limiter_). |
| maxRetryLimit | Number | Titik putus toleransi eksponensial kegagalan pertukaran data API jaringan (_dead-letter drop limit_). |

Deskripsi fungsi pada kelas PengaturAntreanSinkronisasi

- `scheduleSyncTimer() : Void` - Memutar roda inisiasi perputaran kontrol sinkronisasi (_cron / background service worker hook_) untuk memeriksa _online network callback event_ klien secara berkala otomatis saat siklus peramban berkedudukan idle di layar.
- `executeRetry() : Void` - Mengulang proses eksekusi re-transmisi _push api network call_ per spesifik entitas yang tercatat sebelumnya memiliki komplikasi kegagalan status penyampaian asinkron.
- `drainQueue(userId: String) : Void` - Melakukan pengurasan pengosongan seluruh memori penampungan sinkronisasi luring secara sekuensial lalu menyalurkan paket data tumpukan berjenjang ke tangan layer Manajer Sinkronisasi agar segera ditransmisikan keluar perangkat murni gawai operasional secara menyeluruh utuh progresif.
- `handleSyncFailure(queueItemId: String, errorMessage: String?) : Void` - Menangani jejak perekaman deskripsi status komponen API pengiriman yang tak tersampaikan melalui logika kalkulasi penambahan penyesuaian iterasi toleransi nilai batas _retry flag_.

---

### 2.2.11. Package Akses Data Lokal

Gambar 2.11. Class Diagram Package Akses Data Lokal
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Lapisan infrastruktur _repository_ IndexedDB bertindak sebagai abstraksi untuk mematerialisasikan persistensi fungsionalitas penyimpanan data pada sisi memori luring peramban (_offline client-side_), guna mengisolasi kompleksitas logika CRUD sistem.

Masing-masing dari _repository_ entitas fungsional bisnis aplikasi lokal ini menerapkan standar fungsi polimorfik yang seragam dan konsisten sebagai berikut:

- `getAll(userId: String) : Array<Entitas>`
- `getByClientId(clientId: String) : Entitas`
- `create(data: Entitas) : Entitas`
- `update(clientId: String, data: Partial<Entitas>) : Entitas`
- `softDelete(clientId: String) : Boolean`
- `bulkUpsert(dataList: Array<Entitas>) : Void` (Khusus optimasi penyerapan data saat tahapan _pull sync_ server massal).

Daftar kelas repository standar:

1. Kelas `<<repository>>` **DALKategoriLokal** (`storeName: "categories"`)
2. Kelas `<<repository>>` **DALDompetLokal** (`storeName: "wallets"`)
3. Kelas `<<repository>>` **DALTransaksiLokal** (`storeName: "transactions"`)
4. Kelas `<<repository>>` **DALAnggaranLokal** (`storeName: "budgets"`)
5. Kelas `<<repository>>` **DALTargetFinansialLokal** (`storeName: "targets"`)
6. Kelas `<<repository>>` **DALLogNotifikasiLokal** (`storeName: "notifications"`)
7. Kelas `<<repository>>` **DALPengaturanNotifikasiLokal** (`storeName: "preferences"`)

**Fungsi Khusus Repositori Sesi Pengguna**
Kelas `<<repository>>` **DALSesiPenggunaLokal** (`storeName: "session"`) - Berperan istimewa untuk mengamankan data pemulihan state secara luring saat aplikasi menempuh fase inisiasi awal mula (cold boot offline).

- `saveSession(user: Pengguna) : Void` - Menyimpan profil pengguna dan penanda validitas `hasSession` ke penyimpanan aman peramban.
- `getSession() : Pengguna?` - Memuat rekaman jejak profil _log in_ pemulihan siklus _cold boot_.
- `clearSession() : Void` - Mencabut hak akses riwayat profil dan memusnahkan komponen sesi token paska inisiasi prosedur terminasi pembersihan logout lokal murni.

**Fungsi Khusus Repositori Antrean**
Kelas `<<repository>>` **DALAntreanSinkronisasiLokal** (`storeName: "syncqueue"`) - Bertindak sebagai perantara khusus pencatatan antrean _payload_ modifikasi _offline-first_ penampung mutasi antrean sementara sebelum sinkronisasi awan.

- `enqueueItem(entityName: String, entityClientId: String, operation: String, payload: Object) : ItemAntreanSinkronisasi`
- `getPendingItems(userId: String) : Array<ItemAntreanSinkronisasi>`
- `updateRetryCount(queueItemId: String, errorMessage: String?) : Void`
- `markAsSuccess(queueItemId: String) : Void`
- `removeSyncedItems(userId: String) : Void` - Pengurasan sisa rekam cache demi menjaga efiensi utilitas kapasitas kuota maksimal batas IndexedDB peramban murni secara logis.

---

### 2.2.12. Package Akses Data Server

Gambar 2.12. Class Diagram Package Akses Data Server
_(Catatan: Diagram disajikan pada lampiran dokumen)_

Lapisan _gateway_ merupakan antarmuka komunikasi infrastruktur (Network Fetch/Axios API) penunjang pengiriman lalu-lintas data aplikasi klien menuju arsitektur backend awan (Next.js API Routes / PostgreSQL). _Gateway_ dikonfigurasi murni agar bebas dari campur tangan fungsi aturan bisnis lokal berlebih.

Kelas `<<gateway>>` **DALServerAutentikasi**: Antarmuka fasilitas verifikasi pengguna murni, pencabutan token sesi JWT secara asinkron (HttpOnly via rute).

- Atribut `apiEndpoint` (contoh: `/api/auth`)
  Deskripsi fungsi pada kelas DALServerAutentikasi:
- `requestLogin(credentials: Object) : Object`
- `requestLogout() : Void`
- `verifySession() : Boolean`

Kelas `<<gateway>>` **DALServerSinkronisasi**: Antarmuka jembatan pendistribusian delta modifikasi arsitektur _offline-first_ asinkron murni integrasi jaringan luring dua arah.

- Atribut `apiEndpoint` (contoh: `/api/sync`)
  Deskripsi fungsi pada kelas DALServerSinkronisasi:
- `pushChanges(userId: String, items: Array<ItemAntreanSinkronisasi>) : Object` - Pengiriman koleksi _payload_ modifikasi tertunda sisi luring.
- `pullChanges(userId: String, lastSyncTime: DateTime?) : Object` - Pengambilan rekaman data baru paska indikator `lastSyncTime` dari basis data awan.

Kelas `<<gateway>>` **DALServerNotifikasi**: Antarmuka sinkronisasi dorongan (_push_) pemberitahuan perangkat gawai murni perantara persetujuan OS berlangganan.

- Atribut `apiEndpoint` (contoh: `/api/push`)
  Deskripsi fungsi pada kelas DALServerNotifikasi:
- `registerPushSubscription(subscription: Object) : Void` - Pendaftaran token peramban _Web Push API_.
- `updateSubscription(subscription: Object) : Void`
- `removeSubscription(endpoint: String) : Void`

Kelas `<<gateway>>` **DALServerEkspor**: Antarmuka pemicuan konversi komputasional sisi backend untuk memproses perakitan seluruh data agregat persisten menjadi bundel format dokumen XLSX (Spreadsheet) secara langsung spesifik untuk kemudahan operasional ekspor _ledger_ pembukuan pengguna harian kalender secara tuntas.

- Atribut `apiEndpoint` (contoh: `/api/export`)
  Deskripsi fungsi pada kelas DALServerEkspor:
- `requestExport(userId: String, periodStart: String, periodEnd: String) : Blob` - Menerbitkan _request download stream file blob_ asinkron Excel.
