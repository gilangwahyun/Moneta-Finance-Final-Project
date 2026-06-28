# 3. Identifikasi dan Rencana Pengujian

## 3.1. Identifikasi Pengujian

Bagian ini menjelaskan identifikasi hal-hal yang akan diuji beserta perencanaan pengujian perangkat lunak Moneta Finance. Berdasarkan dokumen SKPL, setiap *Use Case* dikategorikan sebagai satu **Kelas Uji** yang kemudian diturunkan menjadi beberapa **Butir Uji** sesuai fungsionalitasnya (seperti tambah, ubah, hapus, dan tampil).

| Kelas Uji | Butir Uji | Identifikasi SKPL | Identifikasi PDHUPL | Tingkat Pengujian | Jenis Pengujian | Jadwal |
|---|---|---|---|---|---|---|
| **Pengujian Use Case Registrasi Akun** | Registrasi Akun | UC-01-01 | AU-01-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Masuk ke Aplikasi** | Masuk ke Aplikasi dan Memuat Data | UC-02-01 | AU-02-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Keluar dari Aplikasi** | Keluar dari Aplikasi (Logout) | UC-03-01 | AU-03-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Mengelola Transaksi** | Tambah Transaksi | UC-04-01 | AU-04-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Ubah Transaksi | UC-04-02 | AU-04-02 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Hapus Transaksi | UC-04-03 | AU-04-03 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Tampil Daftar Transaksi | UC-04-04 | AU-04-04 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Mengelola Kategori** | Tambah Kategori | UC-05-01 | AU-05-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Ubah Kategori | UC-05-02 | AU-05-02 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Hapus Kategori | UC-05-03 | AU-05-03 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Tampil Daftar Kategori | UC-05-04 | AU-05-04 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Mengelola Dompet** | Tambah Dompet | UC-06-01 | AU-06-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Ubah Dompet | UC-06-02 | AU-06-02 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Hapus Dompet | UC-06-03 | AU-06-03 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Tampil Daftar Dompet | UC-06-04 | AU-06-04 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Transfer Antar Dompet** | Transfer Antar Dompet | UC-07-01 | AU-07-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Mengelola Anggaran** | Tambah Anggaran | UC-08-01 | AU-08-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Ubah Anggaran | UC-08-02 | AU-08-02 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Hapus Anggaran | UC-08-03 | AU-08-03 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Realokasi Anggaran (Subsidi Silang) | UC-08-04 | AU-08-04 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Tampil Progress Bar Anggaran | UC-08-05 | AU-08-05 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Tampil Daftar Anggaran | UC-08-06 | AU-08-06 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Mengelola Target Finansial** | Tambah Target Finansial | UC-09-01 | AU-09-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Ubah Target Finansial | UC-09-02 | AU-09-02 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Hapus Target Finansial | UC-09-03 | AU-09-03 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Tampil Progress Bar Target | UC-09-04 | AU-09-04 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Tampil Daftar Target Finansial | UC-09-05 | AU-09-05 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Melihat Analisis Keuangan**| Melihat Grafik Analisis Keuangan | UC-10-01 | AU-10-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Melihat Detail Analisis | UC-10-02 | AU-10-02 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Melihat Tren Keuangan | UC-10-03 | AU-10-03 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| | Melihat Indikator Ringkasan | UC-10-04 | AU-10-04 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Melihat Insight dan Rekomendasi**| Melihat Rekomendasi Sistem | UC-11-01 | AU-11-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Mengatur Preferensi Notifikasi** | Ubah Pengaturan Notifikasi | UC-12-01 | AU-12-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Menerima Notifikasi** | Menerima Peringatan Keuangan | UC-13-01 | AU-13-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Melihat Riwayat Notifikasi** | Tampil Kotak Masuk Notifikasi | UC-14-01 | AU-14-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Melakukan Sinkronisasi** | Sinkronisasi Data ke Server | UC-15-01 | AU-15-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Aplikasi Saat Luring** | Tampil dan Operasi Mode Offline | UC-16-01 | AU-16-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Mengekspor Data Keuangan** | Unduh Format XLSX | UC-17-01 | AU-17-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Pengaturan Visual** | Ganti Tema (Terang/Gelap) | UC-18-01 | AU-18-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Menginstal Aplikasi (PWA)**| Pasang Aplikasi di Perangkat | UC-19-01 | AU-19-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |
| **Pengujian Use Case Menghapus Cache Lokal** | Bersihkan Data Aplikasi | UC-20-01 | AU-20-01 | Pengujian Unit | Black Box | &lt;TBD&gt; |


## 3.2. Rencana Pengujian

### 3.2.1. Urutan Pelaksanaan Pengujian
Urutan pengujian sesuai dengan nomor identifikasi pengujian (kelas uji) yang telah ditentukan pada bab 3.1. Pengujian dimulai dari fondasi akun, diikuti oleh entitas master (kategori & dompet), transaksi utama, batasan finansial (anggaran & target), analitik, hingga aspek teknikal seperti sinkronisasi luring dan fitur PWA.

### 3.2.2. Data Pengujian
Data pengujian disiapkan dalam bentuk *dummy* yang merepresentasikan skenario penggunaan nyata. Data pengujian meliputi:
- **Data Akun**: format `email` pengguna (`test@example.com`, `user_invalid.com`) beserta kata sandi berbagai kombinasi.
- **Data Master**: Kategori pemasukan (Gaji, Bonus) dan pengeluaran (Makanan, Transport, Hiburan), serta Dompet sumber dana (Tunai, OVO, Bank BCA).
- **Data Transaksi**: Catatan pemasukan, pengeluaran, dan transfer dengan berbagai nominal, tanggal (berlalu dan hari ini), serta deskripsi pengeluaran.
- **Data Limit**: Ambang batas anggaran bulanan per kategori dan sasaran target pemasukan.


---


# 4. Deskripsi Pengujian

Subbagian ini menjelaskan mengenai kelas pengujian yang akan dilakukan dengan memperhatikan aktor yang berkaitan, serta diuraikan ke dalam butir-butir pengujian spesifik.

## 4.1. Identifikasi Kelas Pengujian Registrasi Akun (UC-01)
Kelas pengujian ini meliputi fungsionalitas pembuatan akun pengguna baru.
- **4.1.1. Identifikasi Butir Pengujian Registrasi Akun (AU-01-01)**: Melakukan pengujian antarmuka pendaftaran akun dengan *input* berupa nama lengkap, email, dan kata sandi.

## 4.2. Identifikasi Kelas Pengujian Masuk ke Aplikasi (UC-02)
Kelas pengujian ini meliputi fungsionalitas autentikasi masuk (login) ke dalam sistem dan penarikan data riwayat awal.
- **4.2.1. Identifikasi Butir Pengujian Masuk ke Aplikasi (AU-02-01)**: Menguji proses login dengan memasukkan *email* dan kata sandi melalui formulir login.

## 4.3. Identifikasi Kelas Pengujian Keluar dari Aplikasi (UC-03)
Kelas pengujian ini berfokus pada pengakhiran sesi pengguna yang aktif.
- **4.3.1. Identifikasi Butir Pengujian Keluar dari Aplikasi (AU-03-01)**: Menguji fitur *logout* dari halaman profil pengguna.

## 4.4. Identifikasi Kelas Pengujian Mengelola Transaksi (UC-04)
Kelas pengujian ini meliputi pengujian fungsi pencatatan pergerakan arus kas harian pengguna.
- **4.4.1. Identifikasi Butir Pengujian Tambah Transaksi (AU-04-01)**: Menguji antarmuka form tambah transaksi baru (pemasukan/pengeluaran) dengan masukan berupa nominal, tanggal, kategori, dompet, dan deskripsi.
- **4.4.2. Identifikasi Butir Pengujian Ubah Transaksi (AU-04-02)**: Menguji pembaruan data terhadap transaksi yang sebelumnya telah tercatat.
- **4.4.3. Identifikasi Butir Pengujian Hapus Transaksi (AU-04-03)**: Menguji fungsionalitas membatalkan pencatatan dengan menghapus riwayat transaksi.
- **4.4.4. Identifikasi Butir Pengujian Tampil Transaksi (AU-04-04)**: Menguji kemampuan antarmuka dalam menampilkan dan menyaring daftar transaksi sesuai rentang waktu atau dompet yang dipilih.

## 4.5. Identifikasi Kelas Pengujian Mengelola Kategori (UC-05)
Kelas pengujian ini meliputi pengelolaan jenis pos pengeluaran dan pemasukan (kategori).
- **4.5.1. Identifikasi Butir Pengujian Tambah Kategori (AU-05-01)**: Menguji fungsi pembuatan jenis kategori baru.
- **4.5.2. Identifikasi Butir Pengujian Ubah Kategori (AU-05-02)**: Menguji penyuntingan penamaan maupun ikon pada kategori.
- **4.5.3. Identifikasi Butir Pengujian Hapus Kategori (AU-05-03)**: Menguji proses hapus data kategori.
- **4.5.4. Identifikasi Butir Pengujian Tampil Kategori (AU-05-04)**: Menguji tampilan daftar seluruh kategori kustom dan *default* pada aplikasi.

## 4.6. Identifikasi Kelas Pengujian Mengelola Dompet (UC-06)
Kelas pengujian ini memastikan pengguna dapat menambah sumber dana.
- **4.6.1. Identifikasi Butir Pengujian Tambah Dompet (AU-06-01)**: Menguji form pembuatan dompet beserta penetapan saldo awalnya.
- **4.6.2. Identifikasi Butir Pengujian Ubah Dompet (AU-06-02)**: Menguji ubah nama atau identitas dompet.
- **4.6.3. Identifikasi Butir Pengujian Hapus Dompet (AU-06-03)**: Menguji penghapusan dompet yang tidak lagi digunakan.
- **4.6.4. Identifikasi Butir Pengujian Tampil Dompet (AU-06-04)**: Menguji kemampuan sistem menampilkan seluruh entitas sumber dana beserta saldonya.

## 4.7. Identifikasi Kelas Pengujian Transfer Antar Dompet (UC-07)
- **4.7.1. Identifikasi Butir Pengujian Transfer (AU-07-01)**: Menguji antarmuka mutasi saldo antar dua entitas dompet yang tidak melibatkan pengeluaran/pemasukan.

## 4.8. Identifikasi Kelas Pengujian Mengelola Anggaran (UC-08)
Kelas pengujian ini meliputi fitur penjagaan batas pengeluaran kategori.
- **4.8.1. Identifikasi Butir Pengujian Tambah Anggaran (AU-08-01)**: Menguji pemasangan limit anggaran pada kategori tertentu.
- **4.8.2. Identifikasi Butir Pengujian Ubah Anggaran (AU-08-02)**: Menguji penyesuaian nilai ambang batas anggaran yang sedang berjalan.
- **4.8.3. Identifikasi Butir Pengujian Hapus Anggaran (AU-08-03)**: Menguji penghapusan batasan pengeluaran.
- **4.8.4. Identifikasi Butir Pengujian Realokasi Anggaran (AU-08-04)**: Menguji perpindahan *budget* antar kategori pengeluaran (subsidi silang).
- **4.8.5. Identifikasi Butir Pengujian Tampil Progress Bar Anggaran (AU-08-05)**: Menguji akurasi visualisasi pelacakan pengeluaran pada komponen *progress bar*.
- **4.8.6. Identifikasi Butir Pengujian Tampil Anggaran (AU-08-06)**: Menguji tampilan daftar seluruh limit anggaran yang aktif berjalan.

## 4.9. Identifikasi Kelas Pengujian Mengelola Target Finansial (UC-09)
Kelas pengujian ini mencakup pembuatan target sasaran pemasukan.
- **4.9.1. Identifikasi Butir Pengujian Tambah Target (AU-09-01)**: Menguji entri data sasaran pemasukan pada rentang waktu spesifik.
- **4.9.2. Identifikasi Butir Pengujian Ubah Target (AU-09-02)**: Menguji modifikasi sasaran pemasukan yang berjalan.
- **4.9.3. Identifikasi Butir Pengujian Hapus Target (AU-09-03)**: Menguji penghapusan sasaran finansial.
- **4.9.4. Identifikasi Butir Pengujian Tampil Progress Bar Target (AU-09-04)**: Menguji akurasi visualisasi pelacakan pemasukan pada komponen *progress bar*.
- **4.9.5. Identifikasi Butir Pengujian Tampil Target (AU-09-05)**: Menguji penyajian daftar sasaran finansial beserta rincian akumulasi nilainya.

## 4.10. Identifikasi Kelas Pengujian Analisis Keuangan (UC-10)
- **4.10.1. Identifikasi Butir Pengujian Tampil Analitik (AU-10-01)**: Menguji kemampuan sistem menyajikan grafik tren donat (*pie chart*) keuangan dari data IndexedDB.
- **4.10.2. Identifikasi Butir Pengujian Tampil Detail Analitik (AU-10-02)**: Menguji fitur rincian (drilldown) transaksi per kategori keuangan.
- **4.10.3. Identifikasi Butir Pengujian Tampil Tren (AU-10-03)**: Menguji penyajian grafik batang (*bar chart*) beserta batas rata-rata harian.
- **4.10.4. Identifikasi Butir Pengujian Tampil Indikator (AU-10-04)**: Menguji keakuratan indikator ringkasan metrik (*cashflow*) secara matematis.

## 4.11. Identifikasi Kelas Pengujian Insight dan Rekomendasi (UC-11)
- **4.11.1. Identifikasi Butir Pengujian Tampil Rekomendasi (AU-11-01)**: Menguji fungsionalitas mesin aturan (*rule-based reasoning*) yang menghasilkan teks arahan (misal pengingat dominasi pengeluaran akhir pekan).

## 4.12. Identifikasi Kelas Pengujian Mengatur Preferensi Notifikasi (UC-12)
- **4.12.1. Identifikasi Butir Pengujian Ubah Pengaturan (AU-12-01)**: Menguji fungsionalitas pergantian preferensi pengguna terhadap *push notification* (aktif/matikan, instan/ringkasan).

## 4.13. Identifikasi Kelas Pengujian Menerima Notifikasi (UC-13)
- **4.13.1. Identifikasi Butir Pengujian *Trigger* Peringatan (AU-13-01)**: Menguji apakah pengeluaran yang menyentuh limit anggaran memicu pop-up notifikasi peramban.

## 4.14. Identifikasi Kelas Pengujian Melihat Riwayat Notifikasi (UC-14)
- **4.14.1. Identifikasi Butir Pengujian Tampil Riwayat (AU-14-01)**: Menguji penampilan kumpulan catatan peringatan yang pernah di- *generate* di dalam *inbox* aplikasi.

## 4.15. Identifikasi Kelas Pengujian Sinkronisasi Latar Belakang (UC-15)
- **4.15.1. Identifikasi Butir Pengujian Sinkronisasi (AU-15-01)**: Menguji mekanisme pengiriman antrean modifikasi IndexedDB ke PostgreSQL saat koneksi kembali ada.

## 4.16. Identifikasi Kelas Pengujian Aplikasi Saat Luring (UC-16)
- **4.16.1. Identifikasi Butir Pengujian Operasi *Offline* (AU-16-01)**: Menguji fungsionalitas akses, tampilan, dan input data saat peramban berada dalam kondisi putus internet (*offline-first*).

## 4.17. Identifikasi Kelas Pengujian Mengekspor Data Keuangan (UC-17)
- **4.17.1. Identifikasi Butir Pengujian Ekspor Data (AU-17-01)**: Menguji respons klik pada menu ekspor yang kemudian menyajikan berkas rekapan unduhan berupa `.xlsx`.

## 4.18. Identifikasi Kelas Pengujian Pengaturan Visual (UC-18)
- **4.18.1. Identifikasi Butir Pengujian Penggantian Tema (AU-18-01)**: Menguji pergantian skema warna *User Interface* antara mode Terang dan Gelap.

## 4.19. Identifikasi Kelas Pengujian Instalasi Aplikasi Web Progresif (UC-19)
- **4.19.1. Identifikasi Butir Pengujian Instalasi PWA (AU-19-01)**: Menguji kemunculan dialog pemasangan aplikasi ke *homescreen* dan penggunaan aplikasi *standalone* (tanpa address bar peramban).

## 4.20. Identifikasi Kelas Pengujian Menghapus Cache Lokal (UC-20)
- **4.20.1. Identifikasi Butir Pengujian Hapus Data Perangkat (AU-20-01)**: Menguji fungsionalitas setel ulang (*reset*) pangkalan data IndexedDB pengguna dari setelan profil.


---


# 5. Hasil Pengujian

Bagian ini menjelaskan bagaimana hasil pengujian disajikan. Kode setiap tes diakhiri dengan suffiks `_01` (alur *valid/basic flow*), atau `_02` (alur *invalid/error flow*).

| Identifikasi | Deskripsi | Prosedur Pengujian | Masukan | Keluaran yg diharapkan | Kriteria Evaluasi Hasil | Hasil yang Didapat | Kesimpulan |
|---|---|---|---|---|---|---|---|
| **AU-01-01_01** | Pengujian Registrasi Akun Valid | 1. Buka halaman awal aplikasi.<br>2. Klik tombol navigasi ke halaman Registrasi.<br>3. Entri format email yang valid pada kolom Email.<br>4. Entri *username* yang valid.<br>5. Entri kata sandi yang memenuhi kriteria.<br>6. Entri ulang kata sandi pada kolom Konfirmasi.<br>7. Tekan tombol 'Buat Akun'. | Email = 'user_qa@moneta.app'<br>Username = 'User QA'<br>Kata sandi = 'SecurePass123!'<br>Konfirmasi = 'SecurePass123!' | Sistem menyimpan akun baru dan mengarahkan pengguna ke halaman Dasbor utama. | Layar berpindah ke Dasbor dengan sukses. | Layar berpindah ke Dasbor dengan sukses. | Handal |
| **AU-01-01_02** | Pengujian Registrasi Akun Invalid | 1. Buka halaman awal aplikasi.<br>2. Klik tombol navigasi ke halaman Registrasi.<br>3. Kosongkan isian kolom Email.<br>4. Entri *username* yang valid.<br>5. Entri kata sandi yang memenuhi kriteria.<br>6. Tekan tombol 'Buat Akun'. | Email = '' (Kosong)<br>Username = 'User QA'<br>Kata sandi = 'SecurePass123!'<br>Konfirmasi = 'SecurePass123!' | Sistem menolak pendaftaran dan menampilkan kotak peringatan merah di layar. | Muncul kotak peringatan merah dengan keterangan "Email atau Username sudah terdaftar". | Muncul kotak peringatan merah dengan keterangan "Email atau Username sudah terdaftar". | Handal |
| **AU-02-01_01** | Pengujian Masuk (Login) Valid | 1. Buka halaman form Login.<br>2. Entri format email yang terdaftar.<br>3. Entri kata sandi yang benar.<br>4. Tekan tombol 'Masuk'. | Email = 'user_qa@moneta.app'<br>Kata sandi = 'SecurePass123!' | Pengguna dialihkan ke halaman Dasbor utama sistem. | Halaman Dasbor terbuka dan memuat ringkasan keuangan. | Halaman Dasbor terbuka dan memuat ringkasan keuangan. | Handal |
| **AU-02-01_02** | Pengujian Masuk (Login) Invalid | 1. Buka halaman form Login.<br>2. Entri format email yang terdaftar.<br>3. Entri kata sandi yang salah/acak.<br>4. Tekan tombol 'Masuk'. | Email = 'user_qa@moneta.app'<br>Kata sandi = 'SandiSalah999' | Sistem menolak akses dan memunculkan kotak peringatan error. | Tampil kotak peringatan yang memuat keterangan login gagal atau salah. | Tampil kotak peringatan yang memuat keterangan login gagal atau salah. | Handal |
| **AU-03-01_01** | Pengujian Keluar (Logout) | 1. Pastikan pengguna dalam keadaan *login*.<br>2. Buka menu Profil di pojok kanan atas.<br>3. Tekan tombol 'Keluar'. | *(Tidak ada masukan parameter teks)* | Sesi pengguna dihapus dan layar kembali ke halaman masuk (Login). | Aplikasi kembali terkunci di halaman otentikasi. | Aplikasi kembali terkunci di halaman otentikasi. | Handal |
| **AU-04-01_01** | Pengujian Tambah Transaksi Pengeluaran | 1. Masuk ke halaman Transaksi.<br>2. Tekan tombol 'Tambah Transaksi'.<br>3. Pilih tab 'Pengeluaran'.<br>4. Entri angka nominal transaksi.<br>5. Pilih kategori transaksi.<br>6. Pilih dompet sumber dana.<br>7. Entri teks deksripsi pengeluaran.<br>8. Tekan tombol 'Simpan'. | Tipe = 'Pengeluaran'<br>Nominal = 50000<br>Kategori = 'Makanan'<br>Dompet = 'Tunai'<br>Deskripsi = 'Makan Siang' | Jendela tambah transaksi tertutup dan transaksi baru muncul di daftar riwayat. | Deskripsi transaksi "Makan Siang" terlihat di daftar transaksi. | Deskripsi transaksi "Makan Siang" terlihat di daftar transaksi. | Handal |
| **AU-04-01_02** | Pengujian Tambah Transaksi Pemasukan | 1. Masuk ke halaman Transaksi.<br>2. Tekan tombol 'Tambah Transaksi'.<br>3. Pilih tab 'Pemasukan'.<br>4. Entri angka nominal transaksi.<br>5. Pilih kategori transaksi.<br>6. Pilih dompet tujuan.<br>7. Tekan tombol 'Simpan'. | Tipe = 'Pemasukan'<br>Nominal = 5000000<br>Kategori = 'Gaji'<br>Dompet = 'BCA'<br>Deskripsi = 'Gaji Bulanan' | Jendela form tertutup dan pemasukan baru langsung bertambah di daftar. | Transaksi "Gaji Bulanan" tercantum di daftar riwayat. | Transaksi "Gaji Bulanan" tercantum di daftar riwayat. | Handal |
| **AU-04-01_03** | Pengujian Tambah Transaksi Invalid | 1. Masuk ke halaman Transaksi.<br>2. Tekan tombol 'Tambah Transaksi'.<br>3. Biarkan form kosong (nominal nol).<br>4. Tekan tombol 'Simpan'. | Tipe = 'Pengeluaran'<br>Nominal = 0 | Tombol simpan dinonaktifkan sistem sehingga data kosong tidak bisa dikirim. | Tombol simpan terkunci dan tidak dapat ditekan. | Tombol simpan terkunci dan tidak dapat ditekan. | Handal |
| **AU-04-02_01** | Pengujian Ubah Transaksi | 1. Buka daftar riwayat Transaksi.<br>2. Klik tombol opsi edit pada salah satu transaksi.<br>3. Entri perubahan nominal transaksi.<br>4. Tekan tombol 'Simpan'. | Nominal Lama = 50000<br>Nominal Baru = 60000 | Nominal transaksi di daftar riwayat langsung berubah sesuai pembaruan. | Daftar menampilkan nilai nominal yang baru. | Daftar menampilkan nilai nominal yang baru. | Handal |
| **AU-04-03_01** | Pengujian Hapus Transaksi | 1. Buka daftar riwayat Transaksi.<br>2. Klik tombol opsi Hapus pada salah satu transaksi.<br>3. Tampil modal konfirmasi penghapusan.<br>4. Tekan tombol 'Ya, Hapus'. | Target = Transaksi Makanan Rp60.000 | Jendela konfirmasi hilang dan transaksi bersangkutan dihapus dari daftar. | Transaksi yang dituju tidak lagi ditemukan di daftar riwayat. | Transaksi yang dituju tidak lagi ditemukan di daftar riwayat. | Handal |
| **AU-04-04_01** | Pengujian Tampil Transaksi | 1. Buka halaman Transaksi.<br>2. Tekan tombol *Filter* Rentang Waktu.<br>3. Pilih opsi filter spesifik (contoh: Bulan Ini). | Filter = 'Bulan Ini' | Daftar menyaring dan hanya menampilkan transaksi pada bulan bersangkutan. | Penyaringan data bekerja dan mengubah tampilan daftar secara instan. | Penyaringan data bekerja dan mengubah tampilan daftar secara instan. | Handal |
| **AU-05-01_01** | Pengujian Tambah Kategori | 1. Masuk ke halaman Kategori.<br>2. Tekan tombol 'Tambah Kategori'.<br>3. Entri teks nama kategori.<br>4. Pilih warna atau ikon untuk kategori.<br>5. Tekan tombol 'Simpan'. | Nama = 'Pajak'<br>Warna = 'Merah' | Jendela form tertutup dan nama kategori baru muncul di layar daftar Kategori. | Kategori baru terdaftar dan muncul di tabel aplikasi. | Kategori baru terdaftar dan muncul di tabel aplikasi. | Handal |
| **AU-05-01_02** | Pengujian Tambah Kategori (Jalur Cepat) | 1. Buka modal Tambah Transaksi.<br>2. Tekan tombol 'Kategori Baru' di dropdown kategori.<br>3. Entri nama kategori.<br>4. Tekan tombol 'Simpan'. | Nama = 'Snack Malam' | Jendela form kecil tertutup, kategori baru otomatis terdaftar. | Kategori yang baru dibuat langsung tersedia untuk dipilih. | Kategori yang baru dibuat langsung tersedia untuk dipilih. | Handal |
| **AU-05-02_01** | Pengujian Ubah Kategori | 1. Buka halaman Kategori.<br>2. Pilih satu kategori *custom*.<br>3. Klik opsi Ubah.<br>4. Entri perubahan nama kategori.<br>5. Tekan tombol 'Simpan'. | Nama Lama = 'Pajak'<br>Nama Baru = 'Pajak & Cukai' | Jendela tertutup dan nama kategori lama terganti dengan nama yang baru. | Nama baru sukses ditampilkan menggantikan nama lama. | Nama baru sukses ditampilkan menggantikan nama lama. | Handal |
| **AU-05-03_01** | Pengujian Hapus Kategori | 1. Buka halaman Kategori.<br>2. Pilih kategori kustom.<br>3. Klik opsi Hapus.<br>4. Konfirmasi pada modal dengan menekan 'Ya'. | Target = Kategori 'Pajak & Cukai' | Konfirmasi selesai dan kategori terhapus dari daftar layar. | Kategori target lenyap dan tidak lagi muncul di halaman aplikasi. | Kategori target lenyap dan tidak lagi muncul di halaman aplikasi. | Handal |
| **AU-05-04_01** | Pengujian Tampil Kategori | 1. Masuk ke halaman Kategori.<br>2. Periksa daftar kartu kategori yang ada. | *(N/A)* | Semua kategori *default* dan kustom yang dibuat pengguna muncul di layar. | Daftar kategori berhasil dimuat dari basis data dan ditampilkan di antarmuka. | Daftar kategori berhasil dimuat dari basis data dan ditampilkan di antarmuka. | Handal |
| **AU-06-01_01** | Pengujian Tambah Dompet | 1. Masuk ke halaman Dompet.<br>2. Tekan tombol 'Tambah Dompet'.<br>3. Entri nama dompet.<br>4. Entri angka nominal saldo awal.<br>5. Tekan tombol 'Simpan Dompet'. | Nama = 'Dompet QA'<br>Saldo = 200000 | Form tertutup dan nama dompet baru muncul di halaman daftar dompet. | Kartu dompet yang baru beserta saldonya berhasil ditampilkan di layar. | Kartu dompet yang baru beserta saldonya berhasil ditampilkan di layar. | Handal |
| **AU-06-01_02** | Pengujian Tambah Dompet Invalid (Nama Kosong) | 1. Masuk ke halaman Dompet.<br>2. Tekan tombol 'Tambah Dompet'.<br>3. Biarkan kolom nama kosong.<br>4. Tekan tombol 'Simpan Dompet'. | Nama = '' (Kosong)<br>Saldo = 10000 | Sistem menahan proses penyimpanan karena isian nama tidak lengkap. | Tombol simpan terkunci atau memunculkan pesan validasi isian wajib. | Tombol simpan terkunci atau memunculkan pesan validasi isian wajib. | Handal |
| **AU-06-01_03** | Pengujian Tambah Dompet Invalid (Input Huruf) | 1. Masuk ke halaman Dompet.<br>2. Tekan tombol 'Tambah Dompet'.<br>3. Entri teks huruf pada kolom Saldo.<br>4. Tekan 'Simpan Dompet'. | Nama = 'Test Huruf'<br>Saldo = 'abc' | Kolom saldo menolak masukan berupa huruf dan tetap mempertahankan angka valid. | Formulir mengabaikan pengetikan karakter selain angka. | Formulir mengabaikan pengetikan karakter selain angka. | Handal |
| **AU-06-02_01** | Pengujian Ubah Dompet | 1. Buka halaman Dompet.<br>2. Pilih ikon Edit pada salah satu dompet.<br>3. Entri perubahan nama dompet.<br>4. Tekan 'Simpan Dompet'. | Nama Lama = 'Dompet QA'<br>Nama Baru = 'Dompet QA Edited' | Jendela form tertutup dan nama dompet pada kartu berubah secara otomatis. | Perubahan nama pada kartu dompet sukses ditampilkan. | Perubahan nama pada kartu dompet sukses ditampilkan. | Handal |
| **AU-06-03_01** | Pengujian Hapus Dompet | 1. Buka halaman Dompet.<br>2. Pilih ikon Hapus pada salah satu dompet.<br>3. Muncul konfirmasi sistem.<br>4. Tekan tombol 'Ya, Hapus'. | Target = Dompet 'Dompet QA Edited' | Dompet yang dihapus langsung menghilang dari halaman tanpa sisa. | Dompet yang dituju tidak lagi ditemukan keberadaannya di daftar. | Dompet yang dituju tidak lagi ditemukan keberadaannya di daftar. | Handal |
| **AU-06-04_01** | Pengujian Tampil Dompet | 1. Masuk ke halaman Dompet.<br>2. Periksa daftar kartu dompet yang ada. | *(N/A)* | Seluruh daftar sumber dana atau dompet yang aktif ditampilkan di layar. | Daftar dompet dan nominal saldonya berhasil dirender dengan benar. | Daftar dompet dan nominal saldonya berhasil dirender dengan benar. | Handal |
| **AU-07-01_01** | Pengujian Transfer Dompet | 1. Buka modal Transfer dari menu Dasbor.<br>2. Pilih dompet pengirim.<br>3. Pilih dompet penerima.<br>4. Entri nominal transfer.<br>5. Tekan tombol 'Simpan Transfer'. | Pengirim = 'Bank A'<br>Penerima = 'Bank B'<br>Nominal = 50000 | Jendela transfer tertutup, saldo dompet pengirim berkurang dan penerima bertambah. | Perpindahan uang antardompet diproses dan ditampilkan seketika. | Perpindahan uang antardompet diproses dan ditampilkan seketika. | Handal |
| **AU-08-01_01** | Pengujian Tambah Anggaran | 1. Masuk ke halaman Anggaran.<br>2. Tekan tombol 'Tambah Anggaran'.<br>3. Pilih Kategori yang belum memiliki anggaran.<br>4. Entri limit bulanan.<br>5. Tekan tombol 'Simpan'. | Kategori = 'Makanan'<br>Batas = 2000000 | Anggaran berhasil dicatat dan muncul sebagai kartu batas pengeluaran baru. | Nama kategori dan batas anggarannya muncul di halaman layar. | Nama kategori dan batas anggarannya muncul di halaman layar. | Handal |
| **AU-08-01_02** | Pengujian Tambah Anggaran Invalid | 1. Masuk ke halaman Anggaran.<br>2. Tekan tombol 'Tambah Anggaran'.<br>3. Entri limit bulanan dengan nilai 0.<br>4. Tekan tombol 'Simpan'. | Kategori = 'Hiburan'<br>Batas = 0 | Sistem melarang pembuatan anggaran jika nilainya nol. | Tombol simpan dinonaktifkan sehingga form tidak terkirim. | Tombol simpan dinonaktifkan sehingga form tidak terkirim. | Handal |
| **AU-08-05_01** | Pengujian Progress Bar Anggaran | 1. Navigasi ke halaman Anggaran.<br>2. Temukan kartu anggaran yang sudah ada.<br>3. Periksa elemen *progress bar*. | Target = Anggaran 'Makanan' (Terpakai 25%) | Lebar visual *progress bar* sesuai dengan rasio penggunaan dan terdapat label "Aman". | Lebar *progress bar* tepat 25% dan muncul teks "Aman". | Lebar *progress bar* tepat 25% dan muncul teks "Aman". | Handal |
| **AU-08-02_01** | Pengujian Ubah Anggaran | 1. Pada kartu Anggaran, tekan tombol Edit.<br>2. Entri batas limit baru.<br>3. Tekan 'Simpan'. | Kategori = 'Makanan'<br>Batas Lama = 2000000<br>Batas Baru = 2500000 | Jendela tertutup dan nominal batas anggaran di kartu berubah dengan angka baru. | Angka batas anggaran diperbarui dengan sukses di halaman. | Angka batas anggaran diperbarui dengan sukses di halaman. | Handal |
| **AU-08-03_01** | Pengujian Hapus Anggaran | 1. Pada kartu Anggaran, tekan tombol Hapus.<br>2. Muncul dialog konfirmasi.<br>3. Tekan 'Ya, Hapus'. | Target = Anggaran 'Makanan' | Dialog konfirmasi selesai dan kartu anggaran dihapus sepenuhnya dari layar. | Kartu anggaran tidak lagi nampak di halaman. | Kartu anggaran tidak lagi nampak di halaman. | Handal |
| **AU-08-04_01** | Pengujian Realokasi Anggaran | 1. Klik ikon 'Subsidi Silang' pada Anggaran surplus.<br>2. Pilih Anggaran tujuan yang defisit.<br>3. Entri nominal dana subsidi.<br>4. Tekan 'Pindahkan'. | Sumber = 'Pendidikan'<br>Tujuan = 'Transportasi'<br>Nominal = 100000 | Batas anggaran pendidikan berkurang dan batas transportasi bertambah. | Rasio diagram menyesuaikan pemindahan nilai antar anggaran. | Rasio diagram menyesuaikan pemindahan nilai antar anggaran. | Handal |
| **AU-08-06_01** | Pengujian Tampil Anggaran | 1. Masuk ke halaman Anggaran.<br>2. Periksa kartu alokasi *budget* bulanan. | *(N/A)* | Seluruh komponen limit pengeluaran per kategori ditampilkan lengkap. | Daftar anggaran bulanan muncul dan tersusun sesuai dengan data aktif. | Daftar anggaran bulanan muncul dan tersusun sesuai dengan data aktif. | Handal |
| **AU-09-01_01** | Pengujian Tambah Target Finansial | 1. Buka halaman Target.<br>2. Tekan 'Tambah Target'.<br>3. Pilih Kategori pemasukan.<br>4. Entri sasaran nilai.<br>5. Tekan 'Simpan'. | Kategori = 'Gaji'<br>Sasaran = 6000000 | Sistem menyajikan kartu target finansial beserta grafiknya. | Nama target baru tercantum jelas di halaman beserta nominalnya. | Nama target baru tercantum jelas di halaman beserta nominalnya. | Handal |
| **AU-09-01_02** | Pengujian Tambah Target Invalid | 1. Buka halaman Target.<br>2. Tekan 'Tambah Target'.<br>3. Entri sasaran nilai 0.<br>4. Tekan 'Simpan'. | Kategori = 'Gaji'<br>Sasaran = 0 | Sistem menolak menyimpan target finansial dengan nominal nol. | Tombol simpan terkunci (disabled) dan form tidak bisa dikirim. | Tombol simpan terkunci (disabled) dan form tidak bisa dikirim. | Handal |
| **AU-09-04_01** | Pengujian Progress Bar Target | 1. Navigasi ke halaman Target.<br>2. Temukan kartu target yang sudah ada.<br>3. Periksa elemen *progress bar*. | Target = 'Gaji' (Terkumpul 50%) | Lebar visual *progress bar* merepresentasikan progres tabungan yang akurat. | Lebar *progress bar* tepat 50% dan muncul teks "Belum Tercapai". | Lebar *progress bar* tepat 50% dan muncul teks "Belum Tercapai". | Handal |
| **AU-09-05_01** | Pengujian Tampil Target | 1. Masuk ke halaman Target.<br>2. Periksa komponen kartu target pemasukan. | *(N/A)* | Seluruh daftar sasaran finansial muncul di antarmuka layar. | Daftar target ditampilkan beserta data nominal masing-masing. | Daftar target ditampilkan beserta data nominal masing-masing. | Handal |
| **AU-09-02_01** | Pengujian Ubah Target Finansial | 1. Pilih kartu Target, tekan Edit.<br>2. Entri sasaran nilai baru.<br>3. Tekan 'Simpan'. | Kategori = 'Gaji'<br>Sasaran Lama = 6000000<br>Sasaran Baru = 8000000 | Diagram persentase pada kartu target otomatis menyesuaikan angka sasaran baru. | Angka target diperbarui dan merubah persentase kelengkapan. | Angka target diperbarui dan merubah persentase kelengkapan. | Handal |
| **AU-09-03_01** | Pengujian Hapus Target Finansial | 1. Pilih kartu Target, tekan Hapus.<br>2. Muncul dialog konfirmasi.<br>3. Tekan 'Ya, Hapus'. | Target = Target 'Gaji' | Kartu target terhapus dan hilang sepenuhnya dari antarmuka. | Target finansial terhapus mutlak dari tampilan layar. | Target finansial terhapus mutlak dari tampilan layar. | Handal |
| **AU-10-01_01** | Pengujian Tampil Analisis Keuangan | 1. Pastikan sudah ada riwayat transaksi.<br>2. Kunjungi menu Analisis.<br>3. Pilih *dropdown* rentang waktu 'Bulan Ini'. | Rentang Waktu = 'Bulan Ini'<br>Data = Ada pengeluaran Makanan dan Transportasi | Grafik donat menyajikan ringkasan proporsi pengeluaran per kategori. | Data keuangan divisualisasikan dengan tepat dan jelas. | Data keuangan divisualisasikan dengan tepat dan jelas. | Handal |
| **AU-10-02_01** | Pengujian Detail (Drilldown) Analisis | 1. Masuk ke halaman Analisis.<br>2. Klik/ketuk salah satu baris elemen kategori di daftar legenda analitik.<br>3. *Drawer* daftar transaksi muncul. | Kategori Terklik = 'Makanan' | Panel rincian samping muncul untuk menampilkan transaksi khusus di kategori itu. | Fitur penyaringan transaksi per kategori berfungsi dengan baik. | Fitur penyaringan transaksi per kategori berfungsi dengan baik. | Handal |
| **AU-10-03_01** | Pengujian Tampil Tren Pengeluaran/Pemasukan | 1. Masuk ke halaman Analisis.<br>2. Periksa grafik tren (Bar Chart).<br>3. Periksa teks "Rata-rata:". | Rentang Waktu = 'Bulan Ini' | Grafik batang muncul dengan penanda batas rata-rata. | Elemen grafik batang (Recharts) dan teks rata-rata tampil di DOM. | Elemen grafik batang (Recharts) dan teks rata-rata tampil di DOM. | Handal |
| **AU-10-04_01** | Pengujian Indikator Ringkasan Metrik | 1. Masuk ke halaman Analisis.<br>2. Periksa baris ringkasan metrik di bagian atas layar. | Data = Pemasukan 10jt, Pengeluaran 2jt | Angka total yang tertera akurat secara matematis. | Tampil Total Pemasukan 10.000.000, Total Pengeluaran 2.000.000, Selisih Bersih 8.000.000. | Tampil Total Pemasukan 10.000.000, Total Pengeluaran 2.000.000, Selisih Bersih 8.000.000. | Handal |
| **AU-11-01_01** | Pengujian Tampil Rekomendasi (Kritis) | 1. Entri Transaksi Pemasukan sejumlah tertentu.<br>2. Entri Transaksi Pengeluaran lebih besar dari Pemasukan.<br>3. Navigasi ke Dasbor / Analisis untuk mengecek Rekomendasi. | Pemasukan Total = 1000000<br>Pengeluaran Total = 2000000 | Sistem menyajikan peringatan "Defisit Arus Kas" secara visual. | Teks peringatan defisit muncul di area kartu rekomendasi. | Teks peringatan defisit muncul di area kartu rekomendasi. | Handal |
| **AU-11-01_02** | Pengujian Tampil Rekomendasi (Info) | 1. Entri pengeluaran apa saja.<br>2. Pastikan tidak ada Anggaran (*Budget*) yang dibuat.<br>3. Cek kartu Rekomendasi. | Pengeluaran = 50000<br>Anggaran = *(kosong)* | Kartu rekomendasi menampilkan saran berupa "Pengeluaran Tanpa Anggaran". | Pesan informasi berhasil ditampilkan oleh sistem sebagai pengingat. | Pesan informasi berhasil ditampilkan oleh sistem sebagai pengingat. | Handal |
| **AU-11-01_03** | Pengujian Tampil Rekomendasi (Positif) | 1. Entri Pemasukan bernilai besar.<br>2. Jangan lakukan pengeluaran apa pun.<br>3. Cek kartu Rekomendasi. | Pemasukan = 15000000<br>Pengeluaran = 0 | Sistem mengapresiasi pengguna dengan kalimat "Kamu Berhasil Berhemat!". | Pesan apresiasi positif muncul dengan sukses di kartu rekomendasi. | Pesan apresiasi positif muncul dengan sukses di kartu rekomendasi. | Handal |
| **AU-12-01_01** | Pengujian Ubah Preferensi Notifikasi | 1. Buka menu Profil.<br>2. Buka submenu Pengaturan Notifikasi.<br>3. Tekan tuas saklar (*toggle*) pada salah satu preferensi untuk menonaktifkan. | Target Preferensi = 'Peringatan Anggaran'<br>Status Baru = 'Off' | Tuas saklar berubah arah berlawanan, menandakan fitur notifikasi menjadi nonaktif. | Pengaturan preferensi berhasil disimpan oleh aplikasi. | Pengaturan preferensi berhasil disimpan oleh aplikasi. | Handal |
| **AU-12-02_01** | Pengujian Batas Harian Notifikasi | 1. Buka menu Pengaturan Notifikasi.<br>2. Entri angka pada kolom 'Batas Maksimum Harian'.<br>3. Tekan 'Simpan Pengaturan'. | Batas Harian = 5 | Konfigurasi angka tersimpan dengan baik di dalam formulir pengaturan. | Sistem mempertahankan angka batas maksimum yang dimasukkan. | Sistem mempertahankan angka batas maksimum yang dimasukkan. | Handal |
| **AU-13-01_01** | Pengujian Menerima Notifikasi | *(Disimulasikan pada Backend Engine PWA)*<br>1. Aplikasi memicu deteksi limit anggaran tersentuh.<br>2. *Service Worker* menembak *Push API*. | Trigger = Limit Anggaran Terlampaui | Muncul pemberitahuan peringatan masuk ke panel kotak masuk notifikasi. | Peringatan sukses dikirim dan tercatat dalam kotak masuk. | Peringatan sukses dikirim dan tercatat dalam kotak masuk. | Handal |
| **AU-14-01_01** | Pengujian Tampil Riwayat Notifikasi | 1. Navigasi ke menu utama.<br>2. Tekan ikon lonceng (Notifikasi) di panel *header*.<br>3. Panel daftar riwayat muncul. | *(Klik Ikon Lonceng)* | Panel samping muncul menampilkan seluruh riwayat informasi dan peringatan. | Daftar riwayat informasi tersedia untuk dibaca oleh pengguna. | Daftar riwayat informasi tersedia untuk dibaca oleh pengguna. | Handal |
| **AU-14-02_01** | Pengujian Status Notifikasi (Read) | 1. Buka panel Notifikasi.<br>2. Cari notifikasi yang berstatus 'Belum Dibaca' (Tebal).<br>3. Klik notifikasi tersebut. | Target = Notifikasi 'Anggaran Defisit' (Unread) | Ketebalan huruf notifikasi memudar yang menandakan pesan sudah dibaca. | Tampilan visual notifikasi berubah untuk menandakan status terbaca. | Tampilan visual notifikasi berubah untuk menandakan status terbaca. | Handal |
| **AU-15-01_01** | Pengujian Sinkronisasi Server | 1. Buka menu Profil.<br>2. Klik Sinkronisasi.<br>3. Tunggu notifikasi muncul. | Target = Tombol Sinkronisasi | Muncul konfirmasi penyelesaian proses berbunyi "Sinkronisasi selesai". | Terdapat pesan pemberitahuan bahwa sinkronisasi telah tuntas. | Terdapat pesan pemberitahuan bahwa sinkronisasi telah tuntas. | Handal |
| **AU-16-01_01** | Pengujian Tampil Operasi Offline | 1. Matikan sambungan Wi-Fi / Data pada perangkat.<br>2. Buka ulang situs/aplikasi (*Refresh*).<br>3. Tinjau apakah UI berhasil dirender. | Koneksi Jaringan = 'Offline' | Muncul tulisan peringatan ketiadaan sinyal ("Offline Wallet") di antarmuka. | Laporan mengenai aplikasi berjalan tanpa internet tercantum di layar. | Laporan mengenai aplikasi berjalan tanpa internet tercantum di layar. | Handal |
| **AU-17-01_01** | Pengujian Ekspor Data Keuangan | 1. Buka menu Profil.<br>2. Buka submenu Ekspor Data.<br>3. Tekan tombol 'Unduh Rekap (XLSX)'. | Tombol Target = 'Unduh Rekap (XLSX)' | Aplikasi merespons dan memulai proses pengunduhan berkas XLSX. | Berkas laporan Excel berhasil disimpan pada perangkat pengguna. | Berkas laporan Excel berhasil disimpan pada perangkat pengguna. | Handal |
| **AU-18-01_01** | Pengujian Penggantian Tema | 1. Cari ikon saklar tema (Matahari/Bulan) di antarmuka.<br>2. Klik ikon tersebut untuk membalik mode. | Tombol Target = Ikon Tema | Tema tampilan antarmuka mengubah warna dasar dari terang ke gelap atau sebaliknya. | Tampilan corak warna aplikasi berubah sepenuhnya. | Tampilan corak warna aplikasi berubah sepenuhnya. | Handal |
| **AU-18-01_02** | Pengujian Tema Persisten | 1. Ubah tema aplikasi menjadi *Dark Mode*.<br>2. *Reload* / Muat ulang tab halaman peramban.<br>3. Tinjau warna tema setelah muat ulang. | Aksi = *Reload* Browser | Tampilan antarmuka tidak kembali ke pengaturan awal saat halaman dimuat ulang. | Aplikasi sukses mengingat preferensi tema terakhir pengguna. | Aplikasi sukses mengingat preferensi tema terakhir pengguna. | Handal |
| **AU-19-01_01** | Pengujian Instalasi PWA | 1. Buka aplikasi menggunakan Chrome / Edge seluler atau Desktop.<br>2. Tekan opsi peramban 'Install App'.<br>3. Luncurkan aplikasi dari *homescreen*. | Aksi = Pilih menu PWA 'Install' dari *browser* | Sistem menawarkan opsi kepada pengguna untuk memasang aplikasi di layar utama. | Aplikasi dapat dijalankan terpisah dari peramban standar layaknya aplikasi biasa. | Aplikasi dapat dijalankan terpisah dari peramban standar layaknya aplikasi biasa. | Handal |
| **AU-20-01_01** | Pengujian Hapus Cache Lokal | 1. Buka Profil -> submenu Reset Data.<br>2. Klik tombol 'Hapus Cache'.<br>3. Tekan 'Ya, Hapus'. | Tombol Target = 'Ya, Hapus' | Muncul pesan konfirmasi "Cache lokal dihapus. Memuat ulang aplikasi...". | Sistem memberikan umpan balik bahwa seluruh data telah dibersihkan. | Sistem memberikan umpan balik bahwa seluruh data telah dibersihkan. | Handal |
