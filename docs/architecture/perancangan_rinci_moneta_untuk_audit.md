# Perancangan Rinci DPPL Moneta Finance - Bahan Audit dan Revisi

File ini berisi ekstraksi bagian **2.2 Perancangan Rinci** dari dokumen DPPL Moneta Finance. File ini disiapkan agar AI lain dapat membaca dan mengaudit bagian perancangan rinci tanpa harus membuka PDF.

## Tujuan Revisi

Audit dan revisi bagian ini agar lebih sinkron dengan rancangan antarmuka, arsitektur, data, dan keputusan desain Moneta Finance. Fokus revisi yang diharapkan:

1. Menyelaraskan stereotipe UML secara konsisten, misalnya `boundary`, `control`, `entity/model`, `DTO`, `repository`, dan `gateway`.
2. Menyusun ulang rancangan rinci agar lebih mudah dibuat menjadi class diagram **per package**, bukan satu diagram besar yang terlalu padat.
3. Memastikan setiap package memiliki kelas yang sesuai dengan fitur aktual Moneta Finance.
4. Menyelaraskan istilah antara perancangan rinci, perancangan data, dan perancangan antarmuka.
5. Memperbaiki nama kelas, atribut, dan method yang tidak konsisten atau typo.
6. Memastikan package akses data lokal mencakup entitas yang memang disimpan di IndexedDB, termasuk notifikasi dan pengaturan notifikasi.
7. Memastikan hubungan kelas penting dapat digambarkan secara formal melalui dependency, association, aggregation, atau multiplicity bila diperlukan.
8. Memisahkan halaman Profil dan Pengaturan Notifikasi jika saat ini masih digabung dalam satu kelas pengaturan.
9. Menambahkan boundary class yang hilang, seperti Login, Registrasi, Profil, Pengaturan Notifikasi, dan Navigasi/Sidebar Global bila diperlukan.
10. Menambahkan atau menyesuaikan catatan keputusan desain yang memengaruhi rancangan rinci, seperti offline-first, Last-Write-Wins, soft delete, saldo dihitung dinamis, transfer sebagai tipe transaksi, dan target finansial yang difokuskan pada target pemasukan.

## Catatan Sistem Moneta Finance

Moneta Finance adalah aplikasi pengelolaan keuangan pribadi berbasis Progressive Web App dengan pendekatan offline-first. Sistem menggunakan Next.js, React, IndexedDB sebagai local working copy, Next.js API Routes, Prisma, dan Neon PostgreSQL. Fitur utama mencakup autentikasi, transaksi, kategori, dompet, anggaran, target finansial/pemasukan, analisis dan insight, notifikasi, sinkronisasi offline-first, ekspor XLSX, dan manajemen cache lokal.

## Bagian Perancangan Rinci Saat Ini

## 2.2 Perancangan Rinci
### 2.2.1. Package Antarmuka Pengguna

<< Berikan gambar kelas Diagram >>

Kelas HalamanBeranda: Komponen boundary yang berfungsi menangani interaksi pengguna serta
menampilkan dasbor agregasi ringkasan kondisi dan performa keuangan harian pengguna.

Deskripsi atribut kelas HalamanBeranda
Nama atribut
Tipe Data
Deskripsi
isLoading
Boolean
Menunjukkan status proses pemuatan atau
pengambilan data dari lapisan logika yang
sedang berjalan.
error
String
Menyimpan informasi atau pesan kesalahan
yang muncul selama proses pengambilan
data.
displayData
Object
Menyimpan struktur data keuangan yang
telah diproses untuk siap dirender pada
antarmuka pengguna.

Deskripsi fungsi pada kelas HalamanBeranda
renderData()
Input
-
Output
Void
Deskripsi
Merender data ringkasan finansial yang diterima dari control class
ke dalam elemen antarmuka pengguna.

handleRefresh()
Input
-
Output
Void
Deskripsi
Memicu proses pemuatan ulang komponen data berdasarkan
pembaruan kondisi lokal terbaru.

handleNavigation()
Input
path (String)
Output
Void
Deskripsi
Mengeksekusi metode penanganan rute untuk mengarahkan
pengguna ke halaman (path) tertentu.

Kelas HalamanTransaksi: Komponen boundary yang berfungsi menangani interaksi penampilan riwayat
mutasi keuangan serta menyediakan formulir pencatatan arus kas pengguna.

Deskripsi atribut kelas HalamanTransaksi
Nama atribut
Tipe Data
Deskripsi

Deskripsi Perancangan Perangkat Lunak

halaman 13

isLoading
Boolean
Menunjukkan status proses pemuatan atau
pengambilan data riwayat transaksi yang
sedang berjalan.
selectedFilter
Object
Menyimpan parameter objek filter yang
digunakan untuk menyaring daftar data mutasi
pada tampilan.
transactionsList
Array<Transaction> Koleksi objek data mutasi arus kas berjalan
yang akan dirender pada tabel antarmuka.

Deskripsi fungsi pada kelas HalamanTransaksi
renderData()
Input
-
Output
Void
Deskripsi
Merender daftar data mutasi transaksi yang diterima dari control
class ke dalam elemen antarmuka pengguna.

handleFilterChange()
Input
filter: Object
Output
Void
Deskripsi
Memperbarui parameter kriteria penyaringan data dan meminta
pembaruan data yang sesuai dari lapisan logika.

Kelas HalamanAnggaran: Komponen boundary yang berfungsi menangani interaksi pemantauan batas
pagu pengeluaran bulanan serta konfigurasi pengalokasian dana antar-kategori.

Deskripsi atribut kelas HalamanAnggaran
Nama atribut
Tipe Data
Deskripsi
isLoading
Boolean
Menunjukkan status proses pemuatan atau
kalkulasi status anggaran belanja yang sedang
berjalan.
budgetData
Array<Budget>
Kumpulan data alokasi anggaran belanja beserta
proyeksi metrik status penggunaannya.
selectedPeriod
String
Menyimpan parameter periode bulan aktif
(YYYY-MM) sebagai dasar penyaringan visualisasi
anggaran.

Deskripsi fungsi pada kelas HalamanAnggaran
renderData()
Input
-
Output
Void
Deskripsi
Merender data batasan pagu anggaran dan hasil serapannya ke
dalam komponen grafik atau tabel antarmuka.

handlePeriodChange()
Input
period: String
Output
Void

Deskripsi Perancangan Perangkat Lunak

halaman 14

Deskripsi
Memperbarui parameter filter periode dan meminta daftar data
anggaran yang sesuai dengan siklus bulan yang dipilih.

handleReallocate()
Input
data: Object
Output
Void
Deskripsi
Memicu komponen modal interaksi untuk mengeksekusi operasi
pemindahan kuota dana antar-kategori anggaran.

Kelas HalamanTargetFinansial: Komponen boundary yang berfungsi menangani interaksi pemantauan
kemajuan (progress) sasaran target pemasukan keuangan yang ingin dicapai oleh pengguna.

Deskripsi atribut kelas HalamanTargetFinansial
Nama atribut
Tipe Data
Deskripsi
isLoading
Boolean
Menunjukkan status proses pemuatan atau
perhitungan statistik target keuangan yang
sedang berjalan.
targetsList
Array<FinancialTarget> Koleksi objek daftar rencana target finansial
lengkap beserta nilai persentase tingkat
ketercapaiannya.

Deskripsi fungsi pada kelas HalamanTarget
renderData()
Input
-
Output
Void
Deskripsi
Merender matriks kemajuan pencapaian poin target keuangan ke
dalam elemen visual antarmuka.

handleOpenForm()
Input
-
Output
Void
Deskripsi
Menampilkan komponen dialog formulir (modal form) untuk
kebutuhan manipulasi tambah atau ubah data target.

handleSubmit()
Input
data: Object
Output
Void
Deskripsi
Mengumpulkan data hasil input pengguna dari formulir antarmuka
dan meneruskannya menuju control class untuk diproses.

Kelas HalamanAnalisis: Komponen boundary yang berfungsi menangani interaksi penampilan metrik
visualisasi performa keuangan bulanan serta penyajian komponen wawasan (insight) finansial.

Deskripsi atribut kelas HalamanAnalisis
Nama atribut
Tipe Data
Deskripsi

Deskripsi Perancangan Perangkat Lunak

halaman 15

isLoading
Boolean
Menunjukkan status proses kalkulasi agregasi
tingkat atas atau rendering grafik yang sedang
berjalan.
analysisData
Object
Struktur data matriks agregasi tren dan sebaran
distribusi kategori keuangan untuk visualisasi
grafik.
selectedPeriod
String
Menyimpan parameter periode bulan aktif (YYYY-
MM) sebagai acuan filterisasi visualisasi laporan.

Deskripsi fungsi pada kelas HalamanAnalisis
renderData()
Input
-
Output
Void
Deskripsi
Merender diagram lingkaran atau grafik batang beserta data
rekomendasi kontekstual ke dalam elemen antarmuka.

handlePeriodChange()
Input
period: String
Output
Void
Deskripsi
Mengubah ruang lingkup rentang penanggalan data laporan
keuangan yang akan dianalisis dan dirender ulang.

Kelas HalamanNotifikasi: Komponen boundary yang berfungsi menangani interaksi pembacaan, navigasi
pesan peringatan, serta pengelolaan log notifikasi sistem yang diterima pengguna.

Deskripsi atribut kelas HalamanNotifikasi
Nama atribut
Tipe Data
Deskripsi
isLoading
Boolean
Menunjukkan status proses pemuatan atau
pembaruan status log notifikasi yang
sedang berjalan.
notificationsList
Array<NotificationLog> Kumpulan daftar objek rekam riwayat
pesan peringatan aktif yang ditujukan bagi
entitas pengguna.
unreadCount
Number
Menyimpan variabel nilai kalkulasi log
jumlah pesan yang belum dibuka oleh
pengguna.

Deskripsi fungsi pada kelas HalamanNotifikasi
renderData()
Input
-
Output
Void
Deskripsi
Merender daftar urutan kotak log pesan peringatan sistem secara
sekuensial ke dalam elemen antarmuka.

handleMarkAsRead()
Input
d: String
Output
Void

Deskripsi Perancangan Perangkat Lunak

halaman 16

Deskripsi
Meneruskan instruksi aksi klik pengguna untuk mengubah
parameter status keterbacaan pesan menuju komponen control
class.

Kelas HalamanDompet: Komponen boundary yang berfungsi menangani interaksi pengelolaan,
penyesuaian identitas, serta konfigurasi akun sumber dana milik pengguna.

Deskripsi atribut kelas HalamanDompet
Nama atribut
Tipe Data
Deskripsi
isLoading
Boolean
Menunjukkan status proses pemuatan atau
penarikan data akun rekening keuangan yang
sedang berjalan.
walletsList
Array<Wallet>
Kumpulan objek daftar identitas dan saldo
berjalan dari total sumber dana yang dimiliki
pengguna.

Deskripsi fungsi pada kelas HalamanDompet
renderData()
Input
-
Output
Void
Deskripsi
Merender visualisasi kartu informasi akun dompet atau rekening ke
dalam komponen antarmuka pengguna.

handleOpenForm()
Input
-
Output
Void
Deskripsi
Menampilkan komponen dialog formulir (modal form) untuk
kebutuhan penambahan atau pengubahan parameter data akun
dompet.

Kelas HalamanKategori: Komponen boundary yang berfungsi menangani interaksi kustomisasi
klasifikasi, pengelolaan visual warna, serta simbol ikon transaksi keuanga.

Deskripsi atribut kelas HalamanKategori
Nama atribut
Tipe Data
Deskripsi
isLoading
Boolean
Menunjukkan status proses pemuatan atau
manipulasi referensi klasifikasi kas yang sedang
berjalan.
categoriesList
Array<Category> Koleksi objek referensi klasifikasi kategori
transaksi keuangan aktif pengguna.

Deskripsi fungsi pada kelas HalamanKategori
renderData()
Input
-
Output
Void
Deskripsi
Merender daftar grid komponen klasifikasi jenis kategori transaksi
keuangan ke dalam elemen antarmuka.

Deskripsi Perancangan Perangkat Lunak

halaman 17

handleOpenForm()
Input
-
Output
Void
Deskripsi
Menampilkan komponen dialog formulir (modal form) untuk
kebutuhan penambahan atau manipulasi data klasifikasi kategori.

Kelas HalamanPengaturan: Komponen boundary yang berfungsi menangani interaksi pengelolaan
konfigurasi aplikasi secara umum, manajemen preferensi notifikasi luring, serta opsi autentikasi akun
pengguna.

Deskripsi atribut kelas HalamanPengaturan
Nama atribut
Tipe Data
Deskripsi
userProfile
Object
Struktur data identitas profil dan status
kredensial pengguna yang sedang aktif dalam
sesi login.
preferences
Object
Struktur data opsi parameter konfigurasi
sinkronisasi data luring serta status perizinan
push notifikasi lokal.

Deskripsi fungsi pada kelas HalamanPengaturan
renderData()
Input
-
Output
Void
Deskripsi
Merender data profil pengguna dan status tombol toggle opsi
konfigurasi aplikasi ke dalam elemen antarmuka.

handleToggleAlerts()
Input
type (String)
Output
Void
Deskripsi
Memperbarui parameter nilai preferensi perizinan sistem mengenai
peluncuran sinyal notifikasi lokal perangkat.

handleLogout()
Input
-
Output
Void
Deskripsi
Meneruskan instruksi permintaan terminasi sesi aktif pengguna
menuju komponen control class autentikasi.

### 2.2.2. Package Autentikasi
Kelas Pengguna: Model class yang merepresentasikan data sesi identitas pengguna untuk memverifikasi
hak akses pada sisi klien.

Deskripsi atribut kelas Pengguna
Nama atribut
Tipe Data
Deskripsi

Deskripsi Perancangan Perangkat Lunak

halaman 18

id
String
Identifier unik (Universally Unique Identifier /
UUID) pengguna yang tersimpan di server utamav.
email
String
Alamat surel sebagai identitas autentikasi
pengguna.
name
String
Nama tampilan (display name) pada profil
pengguna.
token
String
(Opsional) Kredensial keamanan token akses
(access token) untuk otorisasi sesi lokal.

Deskripsi fungsi pada kelas Pengguna
User()
Input
-
Output
Pengguna
Deskripsi
Constructor untuk menginisialisasi dan memetakan objek sesi profil
pengguna yang baru.

isLoggedIn()
Input
-
Output
Boolean
Deskripsi
Memeriksa dan mengonfirmasi status keaktifan serta validitas sesi
identitas pengguna saat ini.

hasToken()
Input
-
Output
Boolean
Deskripsi
Memeriksa ketersediaan token otorisasi lokal yang tersimpan di
perangkat klien.

Kelas KelolaAutentikasi: Control class yang bertanggung jawab menangani seluruh alur manajemen
identitas, meliputi proses masuk (login), keluar (logout), validasi durasi sesi lokal, pemulihan (recovery)
sesi pengguna secara luring, serta pembaruan status kredensial pengguna.

Deskripsi atribut kelas KelolaAutentikasi
Nama atribut
Tipe Data
Deskripsi
currentUser
Pengguna
Control class yang bertanggung jawab menangani
seluruh alur manajemen identitas, meliputi proses
masuk (login), keluar (logout), validasi durasi sesi
lokal, pemulihan (recovery) sesi pengguna secara
luring, serta pembaruan status kredensial pengguna.
isAuthenticated
Boolean
Indikator validasi hak akses pengguna terhadap
komponen boundary aplikasi.
isLoading
Boolean
Menunjukkan status proses pemuatan atau
pengambilan data autentikasi yang sedang berjalan.
error
String
Menyimpan informasi atau pesan kesalahan (error
message) yang muncul selama proses autentikasi.

Deskripsi fungsi pada kelas KelolaAutentikasi

Deskripsi Perancangan Perangkat Lunak

halaman 19

login()
Input
email: String, password: String
Output
Pengguna
Deskripsi
Mengirimkan kredensial ke Data Access Server untuk memverifikasi
akses, lalu menyimpan data sesi yang dikembalikan ke dalam
memori lokal aktif (state).

logout()
Input
userId: String
Output
Void
Deskripsi
Mengakhiri sesi pengguna, menghapus riwayat token kredensial
dari penyimpanan lokal (local storage/cookie), dan membersihkan
data profil aktif dari memori.

validateSession()
Input
userId: String
Output
Boolean
Deskripsi
Melakukan pemeriksaan integritas sesi pada penyimpanan lokal
untuk memastikan token masih valid dan belum kedaluwarsa.

recoverLocalSession()
Input
-
Output
Pengguna
Deskripsi
Mengambil (retrieve) data identitas dari penyimpanan luring
(cache/IndexedDB) saat aplikasi dibuka kembali agar pengguna
tetap mendapatkan hak akses tanpa koneksi internet.

updateUserStatus()
Input
userId: String, name: String?, email: String?
Output
Pengguna
Deskripsi
Memperbarui data profil pengguna di sisi klien setelah terjadi
sinkronisasi atau perubahan data identitas (seperti pembaruan
nama tampilan).

### 2.2.3. Package Kelola Kategori
Kelas Kategori: Model class yang merepresentasikan entitas klasifikasi transaksi untuk menstrukturkan
analisis alokasi keuangan pengguna.

Deskripsi atribut kelas Kategori
Nama atribut
Tipe Data
Deskripsi
clientId
String
Primary key berupa Universally Unique Identifier
(UUID) unik yang dibangkitkan pada sisi klien.
userId
String
Foreign key yang merujuk pada pengenal unik
pengguna pemilik entitas kategori.
name
String
Label penamaan untuk klasifikasi atau kategori
keuangan.

Deskripsi Perancangan Perangkat Lunak

halaman 20

type
Enum / String
Jenis klasifikasi transaksi yang didukung,
berisikan nilai INCOME atau EXPENSE.
color
String
Kode warna heksadesimal untuk kebutuhan
representasi visual pada antarmuka.
icon
String
String identifier untuk penanda ikon spesifik
pada antarmuka pengguna.
syncStatus
Enum / String
Status sinkronisasi objek terhadap server cloud,
berisi nilai SYNCED, PENDING, atau CONFLICT.
updatedAt
DateTime
Stempel waktu modifikasi terakhir yang
digunakan sebagai acuan resolusi konflik data.
deletedAt
DateTime
Stempel waktu untuk kebutuhan penghapusan
logis (soft delete) tanpa memusnahkan data
fisik.

Deskripsi fungsi pada kelas Kategori
Category()
Input
-
Output
Kategori
Deskripsi
Constructor untuk menginstansiasi objek model kategori yang baru.

isIncome()
Input
-
Output
Boolean
Deskripsi
Memeriksa dan mengembalikan nilai true jika atribut type bernilai
INCOME.

isDeleted()
Input
-
Output
Boolean
Deskripsi
Memeriksa status penghapusan logis objek berdasarkan
keberadaan nilai pada atribut deletedAt.

Kelas KelolaKategori: Control class yang mengenkapsulasi seluruh pusat operasi interaksi objek model
Category. Kelas ini mengendalikan proses manipulasi data lokal (penambahan, pembaruan, dan
penghapusan logis) serta menjamin integritas relasi referensi terhadap objek model Transaction.

Deskripsi atribut kelas KelolaKategori
Nama atribut
Tipe Data
Deskripsi
categories
Array<Category> Koleksi atau array internal yang menampung
daftar data kategori aktif untuk sesi pengguna
saat ini.
isLoading
Boolean
Menunjukkan status proses pemuatan atau
manipulasi data kategori yang sedang berjalan.
error
String
Menyimpan pesan kesalahan (error message)
yang terjadi selama pengeksekusian operasi
kelas.

Deskripsi Perancangan Perangkat Lunak

halaman 21

Deskripsi fungsi pada kelas KelolaKategori
loadCategories()
Input
userId: String
Output
Array<Kategori>
Deskripsi
Mengambil kumpulan data kategori dari local data access layer dan
menyimpannya ke dalam komponen state internal kelas.

addCategory()
Input
userId: String, name: String, type: String, icon: String?, color: String?
Output
Kategori
Deskripsi
Membuat objek kategori baru, mengeksekusi persistensi ke
penyimpanan lokal, serta mendaftarkannya ke komponen antrean
sinkronisasi luring.

editCategory()
Input
clientId: String, name: String?, type: String?, icon: String?, color:
String?
Output
Kategori
Deskripsi
Memperbarui data kategori lama berdasarkan pengenal clientId,
memperbarui nilai stempel waktu updatedAt, dan mencatatkan log
perubahan ke antrean sinkronisasi.

deleteCategory()
Input
clientId: String
Output
Boolean
Deskripsi
Melakukan proses soft delete dengan mengaktifkan flag deletedAt
agar data tidak dirender pada antarmuka pengguna tanpa memutus
relasi dependensi pada riwayat transaksi lama.

syncCategory()
Input
clientId: String
Output
Void
Deskripsi
Memaketkan data mutasi objek kategori spesifik dan
meneruskannya menuju repositori antrean sinkronisasi luring (sync
queue).

### 2.2.4. Package Kelola Dompet
Kelas Dompet: Model identitas sumber dana atau rekening fisik dan virtual pengguna.

Deskripsi atribut kelas Dompet
Nama atribut
Tipe Data
Deskripsi
clientId
String
Primary key berupa Universally Unique Identifier
(UUID) unik yang dibangkitkan pada sisi klien.
userId
String
Foreign key yang merujuk pada pengenal unik
pemilik entitas akun dompet..

Deskripsi Perancangan Perangkat Lunak

halaman 22

name
String
Label penamaan atau identitas dari sumber dana
(misalnya: "Kas Utama", "Rekening Bank").
initial_balance
Float /
Number
Nilai nominal saldo awal yang bersifat statis dan
digunakan sebagai basis perhitungan nilai
keuangan.
syncStatus
Enum /
String
Status sinkronisasi objek terhadap server cloud,
berisi nilai SYNCED, PENDING, atau CONFLICT.
updatedAt
DateTime
Stempel waktu modifikasi terakhir yang digunakan
sebagai acuan resolusi konflik data.
deletedAt
DateTime
Stempel waktu untuk kebutuhan penghapusan logis
(soft delete) tanpa memusnahkan data fisik.

Deskripsi fungsi pada kelas Dompet
Dompet()
Input
-
Output
Dompet
Deskripsi
Constructor untuk menginstansiasi objek model sumber dana atau
dompet yang baru.

hasBalance()
Input
-
Output
Boolean
Deskripsi
Memeriksa nilai saldo saat ini dan mengembalikan nilai true jika
jumlah nominal tidak sama dengan nol..

isDeleted()
Input
-
Output
Boolean
Deskripsi
Memeriksa status keaktifan objek secara logis berdasarkan
keberadaan nilai pada atribut deletedAt.

Kelas KelolaDompet: Control class yang bertanggung jawab mengelola seluruh operasi interaksi objek
model Wallet. Kelas ini menangani proses pembaruan identitas dompet serta melakukan kalkulasi
akumulasi saldo berjalan secara real-time berdasarkan riwayat mutasi transaksi yang terkait.

Deskripsi atribut kelas KelolaDompet
Nama atribut
Tipe Data
Deskripsi
wallets
Array<Dompet>
Koleksi atau array internal yang menampung
daftar seluruh sumber dana fisik maupun
rekening digital yang tersedia.
totalBalance
Number
Nilai akumulasi saldo komprehensif yang
mengagregasikan seluruh kekayaan dari total
rekening pengguna..
isLoading
Boolean
Menunjukkan status proses pemuatan atau
kalkulasi data dompet yang sedang berjalan.

Deskripsi Perancangan Perangkat Lunak

halaman 23

error
String
Menyimpan pesan kesalahan (error message)
yang terjadi selama pengeksekusian operasi
kelas.

Deskripsi fungsi pada kelas KelolaDompet
loadWallets()
Input
userId: String
Output
Array<Dompet>
Deskripsi
Mengambil kumpulan data dompet aktif dari local data access layer
dan menyimpannya ke dalam komponen state internal kelas.

addWallet()
Input
userId: String, name: String, type: String, initialBalance: Number
Output
Dompet
Deskripsi
Membuat objek dompet baru, mengeksekusi persistensi ke
penyimpanan lokal, serta mendaftarkannya ke komponen antrean
sinkronisasi luring jika koneksi tersedia.

editWallet()
Input
clientId: String, name: String?, type: String?, initialBalance:
Number?
Output
Dompet
Deskripsi
Memperbarui data dompet lama berdasarkan parameter input,
memperbarui stempel waktu updatedAt, dan mencatatkan log
perubahan ke antrean sinkronisasi.

deleteWallet()
Input
clientId: String
Output
Boolean
Deskripsi
Melakukan proses soft delete dengan mengaktifkan flag deletedAt
untuk menyembunyikan dompet dari antarmuka utama serta
membatasi pembuatan mutasi baru tanpa memutus riwayat
transaksi lama.

calculateFinalBalance()
Input
walletId: String, transactions: Array<Transaksi>
Output
Number
Deskripsi
Mengekstraksi koleksi data mutasi dari parameter transactions yang
berelasi dengan walletId untuk menetapkan nilai saldo berjalan
secara akurat (real-time).

syncWallet()
Input
clientId: String
Output
Void
Deskripsi
Memaketkan data mutasi objek dompet spesifik dan
meneruskannya menuju repositori antrean sinkronisasi luring (sync
queue).

Deskripsi Perancangan Perangkat Lunak

halaman 24

### 2.2.5. Package Kelola Transaksi
Kelas Transaksi: Model class yang merepresentasikan data arus kas (cash flow) pengguna, meliputi
pencatatan pemasukan (income), pengeluaran (expense), maupun pemindahan dana antar-dompet
(transfer). Entitas transfer direpresentasikan secara langsung melalui atribut type dan tidak
menggunakan instansiasi kelas terpisah agar tidak memengaruhi akumulasi perhitungan evaluasi
anggaran belanja.

Deskripsi atribut kelas Transaksi
Nama atribut
Tipe Data
Deskripsi
clientId
String
Primary key berupa Universally Unique Identifier
(UUID) unik yang dibangkitkan pada sisi klien
(IndexedDB).
id
String
(Opsional) Pengenal unik (server ID) yang
diterbitkan oleh server pusat pascaproses
rekonsiliasi data.
userId
String
Foreign key yang merujuk pada identitas akun
pengguna pemilik entitas transaksi.
walletId
String
Foreign key sumber dana dari mana nominal
transaksi akan didebit atau dikreditkan.
targetWalletId
String
(Opsional) Foreign key dompet tujuan, hanya
digunakan apabila atribut type bernilai TRANSFER.
categoryId
String
(Opsional) Foreign key klasifikasi kategori
transaksi, bernilai kosong (null) jika jenis transaksi
adalah TRANSFER.
type
Enum / String
Jenis mutasi arus kas, yang memuat nilai
komponen INCOME, EXPENSE, atau TRANSFER.
amount
Float /
Number
Nilai nominal dana yang dialokasikan di dalam
rekam medis transaksi.
note
String
Catatan keterangan ringkas opsional yang
ditambahkan secara langsung oleh pengguna.
description
String
(Opsional) Deskripsi atau rincian tambahan
terpisah untuk melengkapi informasi transaksi.
date
Date / String
Tanggal pencatatan terjadinya peristiwa transaksi
dengan format baku ISO (YYYY-MM-DD)
syncStatus
Enum / String
Status sinkronisasi objek terhadap server cloud,
berisi nilai SYNCED, PENDING, atau CONFLICT.
createdAt
DateTime
Stempel waktu yang mencatat waktu pertama kali
entitas transaksi dibuat oleh sistem.
updatedAt
DateTime
Stempel waktu modifikasi terakhir yang digunakan
sebagai acuan resolusi konflik data.
deletedAt
DateTime
Stempel waktu untuk kebutuhan penghapusan
logis (soft delete) tanpa memusnahkan data fisik.

Deskripsi fungsi pada kelas Transaksi
Transaction()

Deskripsi Perancangan Perangkat Lunak

halaman 25

Input
-
Output
Transaksi
Deskripsi
Constructor untuk menginisialisasi dan membentuk objek model
transaksi yang baru.

isIncome()
Input
-
Output
Boolean
Deskripsi
Memeriksa dan mengembalikan nilai true jika atribut type bernilai
INCOME.

isExpense()
Input
-
Output
Boolean
Deskripsi
Memeriksa dan mengembalikan nilai true jika atribut type bernilai
EXPENSE.

isTransfer()
Input
-
Output
Boolean
Deskripsi
Memeriksa dan mengembalikan nilai true jika atribut type bernilai
TRANSFER.

isDeleted()
Input
-
Output
Boolean
Deskripsi
Memeriksa status penghapusan logis objek berdasarkan
keberadaan nilai pada atribut deletedAt.

Kelas KelolaTransaksi: Control class yang mengimplementasikan fungsionalitas inti aplikasi pada sisi
klien untuk mengelola alur logika bisnis perekaman, pembaruan, serta penghapusan transaksi. Kelas ini
bertindak sebagai jembatan penghubung antara komponen antarmuka pengguna dengan komponen
akses data lokal (IndexedDB), serta mengalkulasikan metrik ringkasan agregasi keuangan secara real-
time.

Deskripsi atribut kelas KelolaTransaksi
Nama atribut
Tipe Data
Deskripsi
transactions
Array<Transaksi> Koleksi objek riwayat mutasi transaksi terkini
yang siap dirender pada antarmuka pengguna.
monthlyTotals
Object
Struktur data penampung ringkasan bulanan
(Total Income, Total Expense, Net Balance) hasil
akumulasi mutasi berkala.
isLoading
Boolean
Menunjukkan status proses pemuatan, kalkulasi,
atau manipulasi data transaksi yang sedang
berjalan.

Deskripsi Perancangan Perangkat Lunak

halaman 26

error
String
Menyimpan pesan kesalahan (error message)
yang terjadi selama pengeksekusian operasi
kelas.

Deskripsi fungsi pada kelas KelolaTransaksi
addTrasaction()
Input
userId: String, walletId: String, targetWalletId: String?, categoryId:
String?, type: String, amount: Number, note: String?, description:
String?, date: String
Output
Transaksi
Deskripsi
Membentuk entitas transaksi baru, mengeksekusi persistensi ke
dalam media penyimpanan lokal, serta mendaftarkan operasi
perubahan tersebut ke dalam antrean sinkronisasi luring.

editTrasaction()
Input
clientId: String, walletId: String?, targetWalletId: String?, categoryId:
String?, type: String?, amount: Number?, note: String?, description:
String?, date: String?
Output
Transaksi
Deskripsi
Memperbarui data transaksi lama yang dicari berdasarkan pengenal
clientId, memperbarui stempel waktu updatedAt, serta
mencatatkan log perubahan ke antrean sinkronisasi.

deleteTrasaction()
Input
clientId: String
Output
Boolean
Deskripsi
Mengeksekusi operasi soft delete dengan menyematkan parameter
waktu pada atribut deletedAt serta mendaftarkan instruksi
modifikasi data tersebut ke komponen antrean sinkronisasi luring.

loadTransactions()
Input
userId: String, period: String?, type: String?, categoryId: String?,
walletId: String?
Output
Array<Transaksi>
Deskripsi
Mengambil kumpulan data transaksi aktif dari local data access
layer berdasarkan kriteria filter parameter yang ditentukan, lalu
menyimpannya ke dalam komponen state internal kelas.

### 2.2.6. Package Kelola Anggaran
Kelas Anggaran: Model class yang merepresentasikan batas limit pengeluaran bulanan yang ditetapkan
oleh pengguna berdasarkan kategori tertentu. Kelas ini bertindak secara eksklusif untuk kebutuhan
pembatasan akumulasi pengeluaran belanja (expense) dan tidak memengaruhi perhitungan metrik
target pemasukan pengguna.

Deskripsi atribut kelas Anggaran
Nama atribut
Tipe Data
Deskripsi

Deskripsi Perancangan Perangkat Lunak

halaman 27

clientId
String
Primary key berupa Universally Unique Identifier
(UUID) unik yang dibangkitkan pada sisi klien
(IndexedDB).
id
String
(Opsional) Pengenal unik (server ID) yang
diterbitkan oleh server pusat pascaproses
rekonsiliasi data.
userId
String
Foreign key yang merujuk pada identitas akun
pengguna pemilik entitas anggaran.
categoryId
String
Foreign key yang merujuk pada entitas kategori
yang dikenakan batasan limit pengeluaran.
amount
Float / Number
Nilai nominal batas maksimum pengeluaran
bulanan yang dialokasikan oleh pengguna.
period
String
Periode masa berlaku anggaran yang disimpan
dengan format teks bulanan (YYYY-MM).
syncStatus
Enum / String
Status sinkronisasi objek terhadap server cloud,
berisi nilai SYNCED, PENDING, atau CONFLICT.
createdAt
DateTime
Stempel waktu yang mencatat waktu pertama
kali entitas anggaran dibuat oleh sistem.
updatedAt
DateTime
Stempel waktu modifikasi terakhir yang
digunakan sebagai acuan resolusi konflik data.
deletedAt
DateTime
Stempel waktu untuk kebutuhan penghapusan
logis (soft delete) tanpa memusnahkan data fisik.

Deskripsi fungsi pada kelas Anggaran
Budget()
Input
-
Output
Anggaran
Deskripsi
Constructor untuk menginisialisasi dan membentuk objek model
anggaran yang baru.

isActive()
Input
-
Output
Boolean
Deskripsi
Memeriksa status keaktifan anggaran pada sistem dan
mengembalikan nilai true jika anggaran sedang berjalan aktif.

isDeleted()
Input
-
Output
Boolean
Deskripsi
Memeriksa status penghapusan logis objek berdasarkan
keberadaan nilai pada atribut deletedAt.

belongsToCategory()
Input
categoryId (String)
Output
Boolean

Deskripsi Perancangan Perangkat Lunak

halaman 28

Deskripsi
Memvalidasi kesesuaian antara parameter categoryId yang
dimasukkan dengan atribut foreign key internal objek.

isForPeriod()
Input
period (String)
Output
Boolean
Deskripsi
Memastikan dan memeriksa apakah periode anggaran yang
berjalan bersesuaian dengan parameter bulan (YYYY-MM) yang
diminta.

Kelas KelolaAnggaran: Control class yang bertanggung jawab untuk mengelola, memantau, dan
mengevaluasi batasan nominal pagu pengeluaran pengguna. Kelas ini mencakup fungsionalitas
pembuatan batas anggaran bulanan, pembaruan nominal, realokasi kuota dana antar-kategori, serta
pendaftaran instruksi modifikasi data ke komponen antrean sinkronisasi luring.

Deskripsi atribut kelas KelolaAnggaran
Nama atribut
Tipe Data
Deskripsi
budgets
Array<Anggaran> Koleksi objek alokasi anggaran belanja yang
relevan dengan parameter bulan peninjauan
saat ini..
budgetsWithStats
Array<Object>
Model data gabungan yang mengintegrasikan
entitas Budget dengan proyeksi persentase
serapan sisa dana riil berdasarkan total EXPENSE
transaksi.
isLoading
Boolean
Menunjukkan status proses pemuatan, kalkulasi,
atau manipulasi data anggaran yang sedang
berjalan.
currentPeriod
String
Parameter filter periode penanggalan aktif
(YYYY-MM) yang mengendalikan ruang lingkup
visualisasi dan analisis data anggaran.

Deskripsi fungsi pada kelas KelolaAnggaran
loadBudgets()
Input
userId: String, period: String?
Output
Array<Anggaran>
Deskripsi
Mengambil kumpulan data anggaran aktif dari local data access
layer berdasarkan filter pengguna dan menyimpannya ke dalam
komponen state internal kelas.

addBudget()
Input
clientId: String?, userId: String, categoryId: String, amount: Number,
period: String
Output
Anggaran
Deskripsi
Membentuk entitas anggaran baru, mengeksekusi persistensi ke
dalam media penyimpanan lokal, serta mendaftarkan operasi
perubahan tersebut ke dalam antrean sinkronisasi luring.

Deskripsi Perancangan Perangkat Lunak

halaman 29

editBudget()
Input
clientId: String?, userId: String, categoryId: String, amount: Number,
period: String
Output
Anggaran
Deskripsi
Memperbarui data parameter nominal anggaran lama yang dicari
berdasarkan pengenal clientId, memperbarui stempel waktu
updatedAt, serta mencatatkan log perubahan ke antrean
sinkronisasi.

deleteBudget()
Input
clientId (String)
Output
Boolean
Deskripsi
Mengeksekusi operasi soft delete dengan menyematkan parameter
waktu pada atribut deletedAt serta mendaftarkan instruksi
modifikasi data tersebut ke komponen antrean sinkronisasi luring

budgetReallocation()
Input
sourceClientId: String, destinationClientId: String, amount: Number
Output
Void
Deskripsi
Mengeksekusi pemindahan atau transfer sebagian kuota dana dari
anggaran asal (source) menuju anggaran tujuan (destination),
memperbarui batasan pagu baru, serta mendaftarkan kedua
riwayat perubahan data tersebut ke komponen antrean sinkronisasi
luring.

### 2.2.7. Package Kelola Target Finansial
Kelas TargetFinansial: Model class yang merepresentasikan metrik sasaran capaian moneter yang
dialokasikan oleh pengguna. Pada versi implementasi saat ini, fungsionalitas target difokuskan secara
eksklusif pada target pemasukan (INCOME_TARGET), sehingga transaksi yang bertipe pengeluaran
(EXPENSE) maupun TRANSFER tidak akan memengaruhi akumulasi kemajuan (progress) capaian target.

Deskripsi atribut kelas TargetFinansial
Nama atribut
Tipe Data
Deskripsi
clientId
String
Primary key berupa Universally Unique Identifier
(UUID) unik yang dibangkitkan pada sisi klien
(IndexedDB).
id
String
(Opsional) Pengenal unik (server ID) yang
diterbitkan oleh server pusat pascaproses
rekonsiliasi data cloud.
userId
String
Foreign key yang merujuk pada identitas akun
pengguna pemilik entitas target finansial.

name
String
Label penamaan atau judul sasaran target
keuangan yang ditentukan oleh pengguna.

Deskripsi Perancangan Perangkat Lunak

halaman 30

type
Enum / String
Klasifikasi jenis target keuangan, yang secara
efektif bernilai INCOME_TARGET.
targetAmount
Float / Number
Nilai nominal dana sasaran yang ingin dicapai
oleh pengguna.
period
Enum / String
Rentang waktu evaluasi pencapaian target
(berisi nilai DAILY, WEEKLY, MONTHLY, atau
CUSTOM).
startDate
Date / String
Tanggal awal dimulainya pemantauan akumulasi
target dengan format ISO (YYYY-MM-DD).
endDate
Date / String
(Opsional) Tanggal ekspektasi batas akhir
pemenuhan target keuangan.
categoryId
String
(Opsional) Foreign key referensi kategori
transaksi untuk pemantauan target secara
spesifik.
walletId
String
(Opsional) Foreign key referensi dompet untuk
rencana pengembangan kapabilitas sistem di
masa mendatang.
isActive
Boolean
Flag indikator untuk menandai apakah status
target sedang berjalan aktif atau ditangguhkan.
note
String
Catatan rincian tambahan atau keterangan
ekstra mengenai entitas target keuangan.
syncStatus
Enum / String
Status sinkronisasi objek terhadap server cloud,
berisi nilai SYNCED, PENDING, atau CONFLICT.
createdAt
DateTime
Stempel waktu yang mencatat waktu pertama
kali entitas target finansial dibuat oleh sistem.
updatedAt
DateTime
Stempel waktu modifikasi terakhir yang
digunakan sebagai acuan resolusi konflik data.
deletedAt
DateTime
Stempel waktu untuk kebutuhan penghapusan
logis (soft delete) tanpa memusnahkan data fisik.

Deskripsi fungsi pada kelas TargetFinansial
FinancialTarget()
Input
-
Output
TargetFinansial
Deskripsi
Constructor untuk menginisialisasi dan membentuk objek model
target finansial yang baru.

isIncomeTarget()
Input
-
Output
Boolean
Deskripsi
Memeriksa dan mengembalikan nilai true jika atribut type bernilai
INCOME_TARGET.

isActiveOnDate()
Input
date (Date)
Output
Boolean

Deskripsi Perancangan Perangkat Lunak

halaman 31

Deskripsi
Memeriksa rentang tanggal berjalan sistem dan mengembalikan
nilai true jika status target berada dalam kondisi aktif.

isDeleted()
Input
-
Output
Boolean
Deskripsi
Memeriksa status penghapusan logis objek berdasarkan
keberadaan nilai pada atribut deletedAt.

belongsToCategory()
Input
categoryId (String)
Output
Boolean
Deskripsi
Memvalidasi kesesuaian parameter categoryId input untuk
memastikan pemantauan target dikhususkan pada kategori terkait.

Kelas KelolaTargetFinansial: Control class yang mengendalikan eksekusi logika bisnis penargetan
pemasukan (INCOME_TARGET). Kelas ini berfungsi memastikan pencatatan sasaran akumulasi kas dapat
dievaluasi progres pencapaiannya secara berkala, serta mengoordinasikan pengiriman data menuju
server secara asinkron.

Deskripsi atribut kelas KelolaTargetFinansial
Nama atribut
Tipe Data
Deskripsi
targets
Array<TargetFinansial>
Koleksi objek rencana target finansial
pengguna yang telah diperkaya dengan
kalkulasi akumulasi progres capaian
nominal berjalan.
isLoading
Boolean
Menunjukkan status proses pemuatan,
kalkulasi, atau manipulasi data target
finansial yang sedang berjalan.
error
String
Menyimpan pesan kesalahan (error
message) yang terjadi selama
pengeksekusian operasi kelas.

Deskripsi fungsi pada kelas KelolaTargetFinansial
loadFinancialTargets()
Input
userId: String
Output
Array<TargetFinansial>
Deskripsi
Mengambil kumpulan data target finansial aktif dari local data
access layer dan menyimpannya ke dalam komponen state internal
kelas.
s
addFinancialTarget()
Input
userId: String, name: String, type: String, targetAmount: Number,
period: String, startDate: String, endDate: String?, categoryId:
String, note: String?
Output
Target finansial

Deskripsi Perancangan Perangkat Lunak

halaman 32

Deskripsi
Membentuk entitas target finansial baru, mengeksekusi persistensi
ke dalam media penyimpanan lokal, serta mendaftarkan operasi
perubahan tersebut ke dalam antrean sinkronisasi luring.

editFinancialTarget()
Input
clientId: String, name: String?, type: String?, targetAmount:
Number?, period: String?, startDate: String?, endDate: String?,
categoryId: String?, isActive: Boolean?, note: String?
Output
Target finansial
Deskripsi
Memperbarui parameter data target finansial lama yang dicari
berdasarkan pengenal clientId, memperbarui stempel waktu
updatedAt, serta mencatatkan log perubahan ke antrean
sinkronisasi.

deleteFinancialTarget()
Input
clientId: String
Output
Boolean
Deskripsi
Mengeksekusi operasi soft delete dengan menyematkan parameter
waktu pada atribut deletedAt serta mendaftarkan instruksi
modifikasi data tersebut ke komponen antrean sinkronisasi luring.

### 2.2.8. Package Analisis dan Insight
Kelas RekapKeuangan: Data Transfer Object (DTO) murni yang berfungsi sebagai penampung paket data
hasil agregasi pemasukan, pengeluaran, saldo bersih, tren mutasi, distribusi kategori, serta ringkasan
performa finansial untuk ditransmisikan dan ditampilkan pada antarmuka pengguna.

Deskripsi atribut kelas RekapKeuangan
Nama atribut
Tipe Data
Deskripsi
period
String
Rentang waktu bulanan data rekapitulasi
keuangan yang dikalkulasi (format: YYYY-MM).
totalIncome
Number
Nilai akumulasi total dari seluruh transaksi
pemasukan pengguna pada periode terkait.
totalExpense
Number
Nilai akumulasi total dari seluruh transaksi
pengeluaran pengguna pada periode terkait.
netBalance
Number
Nilai selisih bersambung antara total
pemasukan dikurangi dengan total
pengeluaran.
categoryDistribution
Array
Rincian persentase dan rasio konsumsi dana
berdasarkan klasifikasi kategori transaksi.
trendData
Array
Representasi data linier yang diformat untuk
visualisasi diagram grafik (chart) pada
antarmuka.s

Deskripsi fungsi pada kelas RekapKeuangan
FinancialRecap()
Input
-

Deskripsi Perancangan Perangkat Lunak

halaman 33

Output
RekapKeuangan
Deskripsi
Constructor untuk membungkus sekumpulan parameter statistik
keuangan ke dalam skema objek DTO statis.

isPositive()
Input
-
Output
Boolean
Deskripsi
Memeriksa nilai atribut netBalance dan mengembalikan nilai true
jika total pemasukan lebih besar daripada pengeluaran (saldo
bernilai positif).

getSavingsRate()
Input
-
Output
Number
Deskripsi
Menghitung dan menghasilkan nilai persentase sisa dana dari rasio
perbandingan terhadap total pemasukan (income).

Kelas KelolaAnalisis: Control class yang bertanggung jawab mengelola seluruh logika bisnis proses
agregasi tingkat atas pada aplikasi. Kelas ini bertindak sebagai komponen logika utama yang
mentransformasikan dataset objek model Transaction menjadi struktur data FinancialRecapDTO,
mengeksekusi kalkulasi sebaran analitik kas, serta menyusun rekomendasi finansial kontekstual
menggunakan pendekatan aturan (rule-based reasoning).

Deskripsi atribut kelas KelolaAnalisis
Nama atribut
Tipe Data
Deskripsi
currentRecap
RekapKeuangan
Instansiasi objek penampung hasil agregasi dan
penyusunan metrik performa keuangan untuk
periode peninjauan aktif.
isLoading
Boolean
Menunjukkan status proses pemuatan, kalkulasi,
atau visualisasi data analitik yang sedang
berjalan.
selectedPeriod
String
Parameter filter periode penanggalan aktif
(YYYY-MM) yang digunakan sebagai dasar
penyaringan data analitik.
error
String
Menyimpan pesan kesalahan (error message)
yang terjadi selama pengeksekusian operasi
kelas.

Deskripsi fungsi pada kelas KelolaAnalisis
loadAnalysisData()
Input
userId: String, period: String
Output
Array<Transaksi>
Deskripsi
Mengambil kumpulan data transaksi aktif dari local data access
layer berdasarkan parameter filter pengguna dan menyimpannya ke
dalam komponen state internal kelas.

calculateMonthlySummary()

Deskripsi Perancangan Perangkat Lunak

halaman 34

Input
transactions: Array<Transaksi>
Output
RekanKeuangan
Deskripsi
Mengekstraksi seluruh objek transaksi untuk menghitung akumulasi
total pemasukan, beban pengeluaran absolut, serta menetapkan
nilai saldo bersih komprehensif.

generateTransactionTrend()
Input
transactions: Array<Transaksi>
Output
Array<Object>
Deskripsi
Memproses data transaksi ke dalam format pemetaan data linier
harian untuk kebutuhan rendering komponen grafik pada
antarmuka aplikasi.

generateCategoryDistribution()
Input
transactions: Array<Transaksi>
Output
Array<Object>
Deskripsi
Mengelompokkan nominal akumulasi pengeluaran berdasarkan
rujukan categoryId untuk menyusun struktur hierarki data
persentase alokasi dana per kategori.

generateInsights()
Input
recap: RekapKeuangan
Output
Array<String>
Deskripsi
Menganalisis parameter nominal baku dari objek rekapitulasi untuk
menghasilkan sintesis informasi tren perilaku keuangan pengguna
(misalnya: mendeteksi peningkatan tren pengeluaran).

generateRuleBasedRecommendations()
Input
recap: RekapKeuangan
Output
Array<String>
Deskripsi
Mengevaluasi kondisi keuangan menggunakan mesin aturan (rule-
based reasoning) untuk merumuskan usulan tindakan preventif,
strategi intervensi, atau saran mitigasi apabila terdeteksi adanya
penyimpangan anggaran.

### 2.2.9. Package Notifikasi
Kelas PengaturanNotifikasi: Model class yang merepresentasikan preferensi konfigurasi pengguna
terkait ambang batas notifikasi aktif, perizinan sistem, serta mekanisme penerimaan peringatan
finansial.

Deskripsi atribut kelas PengaturanNotifikasi
Nama atribut
Tipe Data
Deskripsi
clientId
String
Primary key berupa Universally Unique Identifier
(UUID) unik yang dibangkitkan pada sisi klien
(IndexedDB).

Deskripsi Perancangan Perangkat Lunak

halaman 35

userId
String
Foreign key yang merujuk pada pengenal unik
entitas pengguna pemilik konfigurasi.
isPushEnabled
Boolean
Status persetujuan pengiriman pesan via Web
Push API di tingkat sistem operasi perangkat.
budgetAlertEnabled
Boolean
Opsi konfigurasi untuk mengaktifkan sinyal
peringatan lonjakan pagu pengeluaran anggaran.
targetAlertEnabled
Boolean
Opsi konfigurasi untuk mengaktifkan dorongan
progres pencapaian sasaran target finansial.
updatedAt
DateTime
Stempel waktu modifikasi terakhir yang
digunakan sebagai acuan resolusi konflik data

Deskripsi fungsi pada kelas PengaturanNotifikasi
NotificationSettings()
Input
-
Output
PengaturanNotifikasi
Deskripsi
Constructor untuk menginisialisasi nilai bawaan (default schema)
pada konfigurasi preferensi pengguna.

isAlertActive()
Input
type (String)
Output
Boolean
Deskripsi
Memeriksa apakah jenis peringatan spesifik yang diminta diizinkan
aktif oleh preferensi pengguna.

togglePush()
Input
-
Output
Void
Deskripsi
Mengubah nilai persetujuan perizinan sistem mengenai status
ketersediaan intervensi layanan push pada sistem operasi.

Kelas LogNotifikasi: Model class yang merepresentasikan rekam riwayat pesan, log peringatan sistem,
serta informasi umpan balik operasional aplikasi yang akan dirender pada komponen daftar pesan
pengguna.

Deskripsi atribut kelas LogNotifikasi
Nama atribut
Tipe Data
Deskripsi
clientId
String
Primary key berupa Universally Unique
Identifier (UUID) unik log pesan di
penyimpanan lokal (IndexedDB).
userId
String
Foreign key yang merujuk pada pengenal unik
pengguna penerima notifikasi.

dedupeKey
String
Kunci komposit unik (deduplication key) untuk
mencegah redundansi pengiriman log untuk
peristiwa yang sama.
title
String
Judul pesan notifikasi finansial yang
ditampilkan kepada pengguna.

Deskripsi Perancangan Perangkat Lunak

halaman 36

body
String
Isi teks rincian pesan atau informasi peringatan
sistem.

type
String
Klasifikasi jenis log kejadian (misalnya:
BUDGET_WARNING, TARGET_ACHIEVED).
isRead
Boolean
Flag indikator untuk menandai apakah pesan
telah dibuka oleh pengguna.
createdAt
DateTime
Stempel waktu yang mencatat waktu pertama
kali log notifikasi diterbitkan oleh sistem.

Deskripsi fungsi pada kelas LogNotifikasi
LogNotifikasi()
Input
-
Output
LogNotifikasi
Deskripsi
Constructor untuk menginstansiasi pencatatan jejak log peristiwa
notifikasi yang baru.

markAsRead()
Input
-
Output
Void
Deskripsi
Mengubah flagging status pada atribut isRead menjadi nilai true.

isUnread()
Input
-
Output
Boolean
Deskripsi
Mengevaluasi status keterbacaan objek dan mengembalikan nilai
true apabila log pesan belum dibuka oleh pengguna.

Kelas KelolaNotifikasi: Control class minimalis yang bertindak sebagai komponen pengatur manajemen
siklus pembuatan, kalkulasi matriks keterbacaan, serta pencegahan redundansi data pada riwayat
kejadian harian. Kelas ini mengoordinasikan evaluasi ambang batas parameter keuangan guna memicu
peluncuran pesan intervensi.

Deskripsi atribut kelas KelolaNotifikasi
Nama atribut
Tipe Data
Deskripsi
notifications
Array<LogNotifikasi>
Koleksi objek deret rekaman log pesan
peringatan aktif yang tersusun secara
urutan waktu (chronological order).
unreadCount
Number
Variabel penghitung akumulasi kuantitas
data pesan yang belum dibuka untuk
kebutuhan indikator dinamis pada
antarmuka.
isLoading
Boolean
Menunjukkan status proses pemuatan atau
manipulasi status log pesan yang sedang
berjalan.

Deskripsi fungsi pada kelas KelolaNotifikasi

Deskripsi Perancangan Perangkat Lunak

halaman 37

loadLogs()
Input
userId: String
Output
Array<LogNotifikasi>
Deskripsi
Mengambil koleksi objek data log aktif dari local data access layer
dan memetakan hasilnya ke dalam komponen state internal kelas.

createLog()
Input
userId: String, title: String, body: String, type: String
Output
LogNotifikasi
Deskripsi
Menerbitkan entitas rekaman riwayat baru ke media penyimpanan
lokal serta melakukan penyesuaian nilai (update state) pada
variabel unreadCount.

markAsRead()
Input
Id: String
Output
Void
Deskripsi
Meneruskan instruksi aktivasi klik dari komponen antarmuka
pengguna untuk memperbarui parameter status keterbacaan log
pesan terkait.

evaluateAlertNeeds()
Input
recap: RekapKeuangan, ruleType: String
Output
Void
Deskripsi
Menganalisis probabilitas adanya deviasi nominal atas pencapaian
target finansial atau pembatasan anggaran guna meluncurkan
pemberitahuan kontekstual secara otomatis.

preventDuplicateAlerts()
Input
dedupeKey: String
Output
Boolean
Deskripsi
Memvalidasi parameter dedupeKey untuk memblokir duplikasi
penerbitan log peringatan yang identik dalam rentang durasi waktu
tertentu.

### 2.2.10. Package Sinkronisasi Offline-first
Kelas ItemAntreanSinkronisasi: Data Transfer Object (DTO) murni yang merepresentasikan satu entitas
rekaman mutasi lokal pada media penyimpanan klien (IndexedDB) yang sedang berada dalam antrean
untuk dikirimkan secara progresif menuju server cloud.

Deskripsi atribut kelas ItemAntreanSinkronisasi
Nama atribut
Tipe Data
Deskripsi
id
String
Primary key berupa Universally Unique Identifier
(UUID) unik sebagai pengenal antrean paket
data

Deskripsi Perancangan Perangkat Lunak

halaman 38

entityName
String
Klasifikasi nama model entitas tujuan operasi
mutasi data (misalnya: TRANSACTION,
CATEGORY).

operationType
Enum / String
Jenis tindakan mutasi data yang dieksekusi,
memuat nilai komponen CREATE, UPDATE, atau
DELETE.
payload
Object
Data blob entitas secara utuh yang dikirimkan
sebagai objek perubahan mutasi data.
retryCount
Number
Variabel pencatat jumlah akumulasi percobaan
pengiriman ulang paket data yang mengalami
kegagalan akibat kendala jaringan.
status
Enum / String
Status pelacakan pengiriman antrean data aktif,
berisi nilai komponen PENDING atau FAILED.

Deskripsi fungsi pada kelas ItemAntreanSinkronisasi
ItemAntreanSinkronisasi()
Input
-
Output
ItemAntreanSinkronisasi
Deskripsi
Constructor untuk mengonversi data hasil operasi repositori lokal
menjadi bentuk struktur objek DTO transit.

incrementRetry()
Input
-
Output
Void
Deskripsi
Melakukan operasi penambahan nilai (inkrementasi) pada atribut
retryCount saat mendeteksi kegagalan koneksi pengiriman.

isMaxRetryReached()
Input
limit (Number)
Output
Boolean
Deskripsi
Mengevaluasi nilai variabel retryCount untuk memeriksa apakah
jumlah kegagalan pengiriman telah melampaui batas ambang
maksimum yang ditentukan oleh parameter limit.

Kelas ManajerSinkronisasi: Control class utama yang mengoordinasikan seluruh alur arsitektur offline-
first pada aplikasi. Kelas ini berfungsi sebagai sistem orkestrasi yang mengekstraksi data pada komponen
antrean luring untuk dikirimkan (push) melalui infrastruktur API, memproses pengambilan data (pull)
asinkron dari server, serta menerapkan resolusi konflik data berbasis metode Last-Write-Wins (LWW).

Deskripsi atribut kelas ManajerSinkronisasi
Nama atribut
Tipe Data
Deskripsi
isSyncing
Boolean
Atribut kendali (mutex flag) untuk mencegah
terjadinya eksekusi proses penarikan atau
pengiriman data secara paralel dalam satu waktu.

Deskripsi Perancangan Perangkat Lunak

halaman 39

lastSyncTime
DateTime
Stempel waktu penanda batas temporal
(watermark) penyesuaian data terakhir kali yang
berhasil divalidasi bersama server cloud.
syncErrors
Array
Koleksi data penampung informasi atau pesan log
kesalahan yang terjadi selama pengeksekusian
proses sinkronisasi.

Deskripsi fungsi pada kelas ManajerSinkronisasi
pushLocalChanges()
Input
userId: String
Output
Boolean
Deskripsi
Mengekstraksi paket data persisten SyncQueueItem dari
penyimpanan lokal yang berstatus PENDING untuk ditransmisikan
menuju endpoint API server.

pullRemoteChanges()
Input
userId: String
Output
Boolean
Deskripsi
Mengeksekusi proses pengambilan dataset mutasi terbaru dari
server pascaparameter stempel waktu lastSyncTime untuk
menyelaraskan data lokal klien.

applyProgressiveData()
Input
serverData: Array<Object>
Output
Void
Deskripsi
Menangani proses persistensi aliran data eksternal dari parameter
serverData ke dalam media penyimpanan IndexedDB lokal klien
menggunakan metodologi rekonsiliasi data yang terkendali.

updateLastSyncTime()
Input
timestamp: DateTime
Output
Void
Deskripsi
Memperbarui penanda acuan waktu pada atribut lastSyncTime
mengikuti parameter verifikasi penyesuaian waktu yang
dikembalikan oleh server.

reconcileLWW()
Input
localData: Object, remoteData: Object
Output
Object
Deskripsi
Melakukan perbandingan nilai temporal atribut updatedAt secara
murni antara parameter localData dan remoteData untuk
menetapkan konsistensi data tunggal berdasarkan aturan Last-
Write-Wins.

Kelas PengaturAntreanSinkronisasi: Control service class yang bertanggung jawab memelihara
ketahanan data (resilience), mengatur interval penjadwalan otomatis (scheduling timer), mengelola

Deskripsi Perancangan Perangkat Lunak

halaman 40

batasan kompensasi toleransi kegagalan pengiriman, serta membersihkan memori antrean sinkronisasi
ketika kendala konektivitas jaringan teratasi.

Deskripsi atribut kelas PengaturAntreanSinkronisasi
Nama atribut
Tipe Data
Deskripsi
queueItems
Array<ItemAntrean
Sinkronisasi>
Koleksi array objek transit yang menyimpan
manifestasi perubahan data mentah dari sisi
klien yang siap ditransmisikan.
isProcessing
Boolean
Parameter pembatas (throttling flag) untuk
mencegah terjadinya tumpang tindih proses
pengosongan antrean data luring yang sedang
aktif berjalan.
maxRetryLimit
Number
Batas nilai absolut toleransi kegagalan
pengiriman data otomatis untuk
meminimalisir risiko perulangan tanpa akhir
(infinite loop).

Deskripsi fungsi pada kelas PengaturAntreanSinkronisasi
scheduleSyncTimer()
Input
-
Output
Void
Deskripsi
Menjalankan mekanisme pewaktu periodik (background cron timer)
untuk mendeteksi ketersediaan jaringan dan memicu fungsi
pengosongan antrean data luring.

executeRetry()
Input
-
Output
Void
Deskripsi
Mengeksekusi kembali proses pengiriman paket data
SyncQueueItem tertentu selama akumulasi kegagalan operasional
masih berada di bawah ambang batas parameter maxRetryLimit.

drainQueue()
Input
userId: String
Output
Void
Deskripsi
Melakukan proses pengosongan isi tumpukan antrean data luring
secara sekuensial dan meneruskan kumpulan data perubahan
tersebut ke saluran fungsi pushLocalChanges().

handleSyncFailure()
Input
queueItemId: String, errorMessage: String?
Output
Void
Deskripsi
Mengeksekusi penambahan nilai pencatatan kegagalan secara
bertahap serta menyimpan deskripsi kesalahan (error message) ke
dalam memori diagnostik logika penanganan pengiriman ulang.

Deskripsi Perancangan Perangkat Lunak

halaman 41

### 2.2.11. Package Akses Data Lokal
Kelas DALKategoriLokal: Kelas yang berfungsi sebagai abstraksi antarmuka (gateway) pengaksesan data
lokal untuk objek model Category guna menjamin ketersediaan data referensi kategori transaksi selama
aplikasi berjalan dalam kondisi luring (offline mode).

Deskripsi atribut kelas DALKategoriLokal
Nama atribut
Tipe Data
Deskripsi
storeName
String
Nilai konstan penanda nama tabel (object store
identifier) pada IndexedDB yang bernilai
"categories".

Deskripsi fungsi pada kelas DALKategoriLokal
getAll()
Input
userId: String
Output
Array<Kategori>
Deskripsi
Melakukan kueri untuk mengambil seluruh objek data kategori aktif
milik pengguna dari media penyimpanan lokal klien.

getByClientId()
Input
clientId: String
Output
Kategori
Deskripsi
Mengambil satu objek data kategori spesifik berdasarkan parameter
pengenal unik lokal clientId.

create()
Input
data: Kategori
Output
Kategori
Deskripsi
Melakukan persistensi atau penyimpanan entitas objek kategori
baru ke dalam media penyimpanan lokal klien.

update()
Input
clientId: String, data: Partial<kategori>
Output
Kategori
Deskripsi
Memperbarui parameter data kategori yang sudah ada di
penyimpanan lokal berdasarkan pencocokan nilai clientId.

softDelete()
Input
clientId: String
Output
Boolean
Deskripsi
Menyematkan nilai penanda temporal pada atribut deletedAt untuk
menyembunyikan data secara logis dari antarmuka tanpa
memusnahkan fisik data.

bulkUpsert()
Input
dataList: Array<Kategori>
Output
Void

Deskripsi Perancangan Perangkat Lunak

halaman 42

Deskripsi
Mengeksekusi operasi penambahan atau pembaruan sekelompok
objek data kategori sekaligus secara kolektif, terutama saat
menerapkan dataset hasil sinkronisasi server.

Kelas DALDompetLokal: Kelas yang berfungsi sebagai lapisan abstraksi komponen lokal untuk
mengisolasi dan menangani operasi baca-tulis data entitas Wallet pada media penyimpanan lokal klien.

Deskripsi atribut kelas DALDompetLokal
Nama atribut
Tipe Data
Deskripsi
storeName
String
Nilai konstan penanda nama tabel (object store
identifier) pada IndexedDB yang bernilai "wallets"

Deskripsi fungsi pada kelas DALDompetLokal
getAll()
Input
userId: String
Output
Array<Dompet>
Deskripsi
Melakukan kueri untuk mengambil seluruh objek data dompet aktif
milik pengguna dari media penyimpanan lokal klien.

getByClientId()
Input
clientId: String
Output
Dompet
Deskripsi
Mengambil satu objek data dompet spesifik berdasarkan parameter
pengenal unik lokal clientId.

create()
Input
data: Dompet
Output
dompet
Deskripsi
Melakukan persistensi atau penyimpanan entitas objek dompet
baru ke dalam media penyimpanan lokal klien.

update()
Input
clientId: String. data: Partial<Dompet>
Output
Dompet
Deskripsi
Memperbarui parameter data dompet yang sudah ada di
penyimpanan lokal berdasarkan pencocokan nilai clientId.

softDelete()
Input
clientId: String
Output
Boolean
Deskripsi
Menyematkan nilai penanda temporal pada atribut deletedAt untuk
menyembunyikan data dompet secara logis tanpa memusnahkan
fisik data dari penyimpanan.

bulkUpsert()
Input
dataList: Array<Dompet>
Output
Void

Deskripsi Perancangan Perangkat Lunak

halaman 43

Deskripsi
Mengeksekusi operasi penambahan atau pembaruan sekelompok
objek data dompet sekaligus secara kolektif saat menerapkan
dataset hasil sinkronisasi server.

Kelas DALTransaksiLokal: Kelas yang berfungsi sebagai lapisan pengakses media IndexedDB murni untuk
membungkus, mengisolasi, serta mengendalikan presisi manipulasi data terhadap koleksi riwayat
transaksi arus kas pada penyimpanan internal peramban klien.

Deskripsi atribut kelas DALTransaksiLokal
Nama atribut
Tipe Data
Deskripsi
storeName
String
Nilai konstan penanda nama tabel (object store
identifier) pada IndexedDB yang bernilai
"transactions".

Deskripsi fungsi pada kelas DALTransaksiLokal
getAll()
Input
userId: String
Output
Array<Transaksi>
Deskripsi
Mengambil keseluruhan rekaman objek data transaksi finansial
secara komprehensif dari penyimpanan lokal klien.

getByClientId()
Input
clientId: String
Output
Transaksi
Deskripsi
Mengambil satu objek data transaksi spesifik berdasarkan
parameter pengenal unik lokal clientId.

create()
Input
data: Transaksi
Output
Transaksi
Deskripsi
Melakukan penulisan dan persistensi entitas material objek
transaksi baru ke dalam media penyimpanan lokal klien.

update()
Input
clientId: String, data: Partial<Transaksi>
Output
Transaksi
Deskripsi
Memodifikasi data nominal atau parameter rincian rekaman
transaksi lama berdasarkan pencocokan nilai clientId.

softDelete()
Input
clientId: String
Output
Boolean
Deskripsi
Melekatkan penanda logis pengabaian temporal pada atribut
deletedAt atas objek transaksi terkait.

bulkUpsert()
Input
dataList: Array<Transaksi>

Deskripsi Perancangan Perangkat Lunak

halaman 44

Output
Void
Deskripsi
Memasukkan himpunan besar kumpulan data transaksi sekaligus
secara progresif untuk menekan limitasi utilisasi iterasi
penyimpanan lokal selama proses sinkronisasi berjalan.

Kelas DALAnggaranLokal: Kelas yang berfungsi sebagai media perantara untuk mematerialisasikan
entitas batas kuota anggaran bulanan pengguna menjadi persistensi rekaman data lokal pada sisi klien.

Deskripsi atribut kelas DALAnggaranLokal
Nama atribut
Tipe Data
Deskripsi
storeName
String
Nilai konstan penanda nama tabel (object store
identifier) pada IndexedDB yang bernilai
"budgets".

Deskripsi fungsi pada kelas DALAnggaranLokal
getAll()
Input
userId: String
Output
Array<Anggaran>
Deskripsi
Melakukan kueri untuk mengambil seluruh objek data anggaran
aktif milik pengguna dari media penyimpanan lokal klien.

getByClientId()
Input
clientId: String
Output
Anggaran
Deskripsi
Mengambil satu objek data anggaran spesifik berdasarkan
parameter pengenal unik lokal clientId.

create()
Input
data: Anggaran
Output
Anggaran
Deskripsi
Melakukan persistensi atau penyimpanan entitas objek anggaran
baru ke dalam media penyimpanan lokal klien.

update()
Input
clientId: String, data: Partial<Anggaran>
Output
Anggaran
Deskripsi
Memperbarui parameter batas nominal anggaran belanja yang
sudah ada berdasarkan pencocokan nilai clientId.

softDelete()
Input
clientId: String
Output
Boolean
Deskripsi
Menyematkan nilai penanda temporal pada atribut deletedAt untuk
menyembunyikan data anggaran bulanan secara logis dari
antarmuka pengguna.

bulkUpsert()

Deskripsi Perancangan Perangkat Lunak

halaman 45

Input
dataList: Array<Anggaran>
Output
Void
Deskripsi
Mengeksekusi operasi penambahan atau pembaruan sekelompok
objek data anggaran sekaligus secara kolektif untuk kebutuhan
sinkronisasi data server.

Kelas DALTargetFinansialLokal: Kelas yang berfungsi sebagai komponen abstraksi lokal yang mengisolasi
proses pengelolaan parameter target finansial agar eksistensi data tetap terjaga kendati perangkat klien
kehilangan koneksi jaringan internet.

Deskripsi atribut kelas DALTargetFinansialLokal
Nama atribut
Tipe Data
Deskripsi
storeName
String
Nilai konstan penanda nama tabel (object store
identifier) pada IndexedDB yang bernilai "targets".

Deskripsi fungsi pada kelas DALTargetFinansialLokal
getAll()
Input
userId: String
Output
Array<TargetFinansial>
Deskripsi
Melakukan kueri untuk mengambil seluruh objek data target
finansial aktif milik pengguna dari media penyimpanan lokal klien.

getByClientId()
Input
clientId: String
Output
TargetFinansial
Deskripsi
Mengambil satu objek data target finansial spesifik berdasarkan
parameter pengenal unik lokal clientId.

create()
Input
data: TargetFinansial
Output
TargetFinansial
Deskripsi
Melakukan persistensi atau penyimpanan entitas objek target
finansial baru ke dalam media penyimpanan lokal klien.

update()
Input
clientId: String, data: Partial<TargetFinansial>
Output
TargetFinansial
Deskripsi
Memperbarui data parameter capaian target finansial yang sudah
ada di penyimpanan lokal berdasarkan pencocokan nilai clientId.

softDelete()
Input
clientId: String
Output
Boolean
Deskripsi
Menandai objek target finansial sebagai terhapus secara logis
menggunakan atribut deletedAt tanpa menghapus fisik data secara
langsung.

Deskripsi Perancangan Perangkat Lunak

halaman 46

bulkUpsert()
Input
dataList: Array<TargetFinansial>
Output
Void
Deskripsi
Menyisipkan atau memperbarui sekelompok data target finansial
secara massal sekaligus untuk keperluan penyelarasan dataset hasil
sinkronisasi server.

Kelas DALAntreanSinkronisasi: Kelas yang berfungsi sebagai basis penampung antrean sinkronisasi
luring (sync queue) krusial yang menampung manifes perubahan data lokal sebelum ditransmisikan
menuju infrastruktur cloud server.

Deskripsi atribut kelas DALAntreanSinkronisasi
Nama atribut
Tipe Data
Deskripsi
storeName
String
Nilai konstan penanda nama tabel (object store
identifier) pada IndexedDB yang bernilai
"syncqueue".

Deskripsi fungsi pada kelas DALAntreanSinkronisasi
enqueueItem()
Input
entityName: String, entityClientId: String, operation: String,
payload: Object
Output
ItemAntreanSinkronisasi
Deskripsi
Menyisipkan satu rekaman instruksi modifikasi data baru ke dalam
antrean penyimpanan lokal dengan status transit awal.

getPendingItems()
Input
userId: String
Output
Array<ItemAntreanSinkronisasi>
Deskripsi
Melakukan interogasi atau kueri antrean data lokal untuk
mengambil daftar item yang masih berstatus PENDING.

updateRetryCount()
Input
queueItemId: String, errorMessage: String?
Output
Void
Deskripsi
Melakukan inkrementasi log kegagalan operasional API serta
mencatatkan jejak pesan kesalahan ke dalam objek antrean terkait.

markAsSuccess()
Input
queueItemId: String
Output
Void
Deskripsi
Memperbarui parameter status objek antrean untuk menandakan
bahwa pemuatan komponen payload telah berhasil dikirimkan ke
server.

removeSyncedItems()
Input
userId: String
Output
Void

Deskripsi Perancangan Perangkat Lunak

halaman 47

Deskripsi
Melakukan pembersihan (purging/cleanup) terhadap seluruh objek
antrean yang telah sukses disinkronisasikan demi menekan
optimalisasi kapasitas penyimpanan lokal klien.

### 2.2.12. Package Akses Data Server
Kelas DALServerSinkronisasi: Kelas yang berfungsi sebagai gerbang antarmuka (gateway API) asinkron
untuk melakukan rekonsiliasi data antara media penyimpanan lokal klien dengan layanan persisten di
server cloud melalui protokol HTTP/HTTPS..

Deskripsi atribut kelas DALServerSinkronisasi
Nama atribut
Tipe Data
Deskripsi
apiEndpoint
String
Alamat basis atau Uniform Resource Identifier (URI)
dari endpoint API sinkronisasi pada server cloud.

Deskripsi fungsi pada kelas DALServerSinkronisasi
pushChanges()
Input
userId: String, items: Array<ItemAntreanSinkronisasi>
Output
Object
Deskripsi
Memfasilitasi transmisi komponen payload massal dari antrean
luring klien menuju endpoint penerima /api/sync/push pada server.

pullChanges ()
Input
userId: String, lastSyncTime: DateTime?
Output
Object
Deskripsi
Melakukan request HTTP menuju endpoint /api/sync/pull untuk
mengambil dataset pembaruan mutasi terbaru dari server
pascaparameter waktu lastSyncTime.

Kelas DALServerAutentikasi: Kelas yang bertanggung jawab menangani komunikasi asinkron jarak jauh
terkait pengelolaan verifikasi kredensial, otorisasi identitas, dan manajemen JSON Web Token (JWT)
bersama server API.

Deskripsi atribut kelas DALServerAutentikasi
Nama atribut
Tipe Data
Deskripsi
apiEndpoint
String
Alamat basis atau Uniform Resource Identifier (URI)
dari endpoint API autentikasi pada server cloud
.

Deskripsi fungsi pada kelas DALServerSinkronisasi
requestLogin()
Input
credentials: Object
Output
Object
Deskripsi
Mengirimkan data kredensial rahasia pengguna menuju lapisan API
server untuk divalidasi keabsahannya.

requestLogout()

Deskripsi Perancangan Perangkat Lunak

halaman 48

Input
-
Output
Void
Deskripsi
Mengirimkan permintaan pencabutan hak akses (request terminasi
sesi) menuju sistem jarak jauh untuk mengakhiri masa aktif token.

verifySession()
Input
-
Output
Boolean
Deskripsi
Melakukan pertukaran data verifikasi token otorisasi untuk
memastikan status keabsahan sesi pengguna saat ini.

Kelas DALServerNotifikasi: Kelas yang berfungsi sebagai infrastruktur perantara API untuk menangani
pemeliharaan, registrasi, serta pemicuan parameter Web Push Notification pada peramban klien via
server.

Deskripsi atribut kelas DALServerNotifikasi
Nama atribut
Tipe Data
Deskripsi
apiEndpoint
String
Alamat basis atau Uniform Resource Identifier
(URI) dari rute endpoint registrasi push
subscription server.

Deskripsi fungsi pada kelas DALServerNotifikasi
registerPushSubscription()
Input
subscription: Object
Output
Void
Deskripsi
Mendaftarkan objek token persetujuan (push subscription object)
peramban klien yang baru ke dalam basis data server pusat.

updateSubscription()
Input
subscription: Object
Output
Void
Deskripsi
Memperbarui parameter dan mempertahankan kesinambungan
kunci rahasia (subscription payload) ketika masa berlaku push
peramban sistem operasi kedaluwarsa.

removeSubscription()
Input
endpoint: String
Output
Void
Deskripsi
Mengirimkan instruksi pemutusan hubungan (unsubscribe request)
layanan web push notification terhadap server cloud.
