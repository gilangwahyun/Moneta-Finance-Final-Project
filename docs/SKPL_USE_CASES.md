# Moneta Finance - SKPL Use Cases

Dokumen ini berisi daftar skenario penggunaan (use case) untuk aplikasi Moneta Finance, disesuaikan dengan arsitektur yang mendahulukan penggunaan luring (_offline-first_), sinkronisasi data melalui antrean, dan sistem notifikasi tingkat lanjut.

---

## UC-01 Registrasi Akun

**Nama Use Case**  
Registrasi Akun

**Deskripsi Singkat**  
Pengguna membuat akun baru untuk mulai menggunakan aplikasi Moneta.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna belum memiliki akun.
2. Perangkat terhubung ke internet (daring).

**Pos Kondisi**

1. Akun berhasil dibuat dan tersimpan pada server.
2. Pengguna berhasil masuk ke dalam aplikasi.

**Basic Flow**

1. Use case dimulai ketika pengguna membuka halaman pendaftaran.
   - A-1: Pengguna sudah memiliki akun.
2. Pengguna mengisi formulir pendaftaran yang berisi nama, alamat surel, dan kata sandi.
3. Pengguna menekan tombol daftar.
4. Server memvalidasi masukan pengguna.
   - E-1: Data pendaftaran tidak valid atau tidak lengkap.
   - E-2: Alamat surel sudah terdaftar.
   - E-3: Koneksi jaringan terputus.
5. Server menyimpan data pengguna dan mengembalikan penanda sesi yang sah.
6. Sistem mengarahkan pengguna ke halaman utama.
7. Use case selesai.

**Alternative Flow**  
A-1: Pengguna sudah memiliki akun.

1. Pengguna menekan tautan untuk menuju halaman masuk.
2. Use case selesai (berpindah ke Use Case Masuk ke Aplikasi).

**Error Flow**  
E-1: Data pendaftaran tidak valid atau tidak lengkap.

1. Server menemukan format isian tidak sesuai.
2. Sistem menampilkan pesan peringatan pada formulir.
3. Alur kembali ke Basic Flow langkah ke-2.

E-2: Alamat surel sudah terdaftar.

1. Server mendeteksi alamat surel sudah digunakan oleh pengguna lain.
2. Sistem menampilkan pesan bahwa akun sudah ada.
3. Alur kembali ke Basic Flow langkah ke-2.

E-3: Koneksi jaringan terputus.

1. Sistem gagal menghubungi server karena tidak ada koneksi jaringan.
2. Sistem menampilkan pesan kesalahan jaringan.
3. Alur kembali ke Basic Flow langkah ke-3.

---

## UC-02 Masuk ke Aplikasi dan Memuat Data Awal

**Nama Use Case**  
Masuk ke Aplikasi dan Memuat Data Awal

**Deskripsi Singkat**  
Pengguna masuk ke dalam aplikasi dan sistem memuat data riwayat awal dari server.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah mendaftarkan akun.
2. Perangkat terhubung ke internet (daring).

**Pos Kondisi**

1. Pengguna berada di halaman utama.
2. Data keuangan pengguna telah diunduh dan tersimpan secara lokal pada perangkat.

**Basic Flow**

1. Use case dimulai ketika pengguna membuka halaman masuk.
2. Pengguna memasukkan alamat surel dan kata sandi.
3. Pengguna menekan tombol masuk.
4. Server memvalidasi kredensial pengguna.
   - E-1: Kredensial tidak valid.
5. Sistem menarik data riwayat awal keuangan pengguna dari server.
   - E-2: Gagal memuat data riwayat.
6. Sistem menyimpan data riwayat tersebut ke dalam penyimpanan lokal pada perangkat.
7. Sistem mengarahkan pengguna ke halaman utama.
8. Use case selesai.

**Alternative Flow**  
Tidak ada Alternative Flow yang signifikan.

**Error Flow**  
E-1: Kredensial tidak valid.

1. Server menolak kredensial karena surel atau kata sandi tidak cocok.
2. Sistem menampilkan pesan kesalahan pada formulir.
3. Alur kembali ke Basic Flow langkah ke-2.

E-2: Gagal memuat data riwayat.

1. Sistem gagal mengunduh data riwayat awal akibat gangguan jaringan.
2. Sistem menampilkan peringatan gagal memuat data awal.
3. Alur kembali ke Basic Flow langkah ke-3 untuk mengulang permintaan.

---

## UC-03 Melihat Halaman Utama

**Nama Use Case**  
Melihat Halaman Utama

**Deskripsi Singkat**  
Pengguna melihat ringkasan keuangan bulanan, riwayat transaksi terbaru, dan status sinkronisasi data.

**Aktor**  
Pengguna

**Pre Kondisi**

1. Pengguna sudah berhasil masuk ke dalam aplikasi.

**Pos Kondisi**

1. Halaman utama tampil dengan ringkasan keuangan yang mutakhir sesuai data lokal perangkat.

**Basic Flow**

1. Use case dimulai ketika pengguna membuka aplikasi atau menavigasi ke halaman utama.
2. Sistem membaca data keuangan secara langsung dari penyimpanan lokal perangkat.
   - A-1: Data transaksi kosong.
   - E-1: Data lokal rusak.
3. Sistem menghitung dan menampilkan total saldo, pengeluaran, pemasukan bulan berjalan, serta daftar transaksi terbaru.
4. Sistem menampilkan status sinkronisasi pada komponen bilah navigasi.
5. Use case selesai.

**Alternative Flow**  
A-1: Data transaksi kosong.

1. Sistem mendeteksi tidak ada riwayat transaksi pada penyimpanan lokal.
2. Sistem menampilkan antarmuka undangan agar pengguna menambahkan transaksi pertama.
3. Alur berlanjut ke Basic Flow langkah ke-4.

**Error Flow**  
E-1: Data lokal rusak.

1. Sistem gagal membaca data dari penyimpanan lokal perangkat.
2. Sistem menampilkan pesan kesalahan dan menyarankan pengguna untuk menyinkronkan ulang data dari server.
3. Use case selesai.

---

## UC-04 Mengelola Transaksi

**Nama Use Case**  
Mengelola Transaksi

**Deskripsi Singkat**  
Pengguna dapat menambah, mengubah, atau menghapus data transaksi keuangan.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.
2. Pengguna memiliki minimal satu kategori dan satu dompet.

**Pos Kondisi**

1. Data transaksi tersimpan pada perangkat dan disinkronkan ke server jika terhubung.

**Basic Flow**

1. Use case dimulai ketika pengguna memilih aksi pengelolaan transaksi.
   - A-1: Pengguna menambah transaksi melalui tombol Tambah Transaksi/FAB.
   - A-2: Pengguna mengubah transaksi melalui ikon menu titik tiga.
   - A-3: Pengguna menghapus transaksi melalui ikon menu titik tiga dan konfirmasi hapus.
2. Sistem membatasi isian nominal agar hanya menerima nilai yang sah.
3. Sistem menyimpan perubahan transaksi tersebut ke dalam penyimpanan lokal perangkat.
4. Sistem langsung memperbarui antarmuka tampilan pengguna.
5. Sistem mencatat perubahan ke dalam antrean sinkronisasi.
6. Sistem mengirimkan perubahan transaksi tersebut ke server secara latar belakang.
   - A-4: Perangkat dalam keadaan luring.
   - E-1: Pengiriman ke server gagal.
7. Use case selesai.

**Alternative Flow**  
A-1: Pengguna menambah transaksi melalui tombol Tambah Transaksi/FAB.

1. Pengguna memilih aksi "Tambah Transaksi" pada bilah navigasi (desktop) atau tombol aksi mengambang (FAB) pada perangkat seluler.
2. Pengguna mengisi rincian transaksi (nominal, tanggal, kategori, dompet).
3. Pengguna menekan tombol simpan.
4. Alur berlanjut ke Basic Flow langkah ke-2.

A-2: Pengguna mengubah transaksi melalui ikon menu titik tiga.

1. Pengguna menekan ikon menu titik tiga pada item transaksi yang dipilih, kemudian memilih aksi Ubah.
2. Pengguna mengubah rincian transaksi pada formulir yang terbuka.
3. Pengguna menekan tombol simpan.
4. Alur berlanjut ke Basic Flow langkah ke-2.

A-3: Pengguna menghapus transaksi melalui ikon menu titik tiga dan konfirmasi hapus.

1. Pengguna menekan ikon menu titik tiga pada item transaksi yang dipilih, kemudian memilih aksi Hapus.
2. Sistem menampilkan dialog konfirmasi hapus.
3. Pengguna menyetujui konfirmasi.
4. Alur berlanjut ke Basic Flow langkah ke-3. (Sistem menyimpan informasi penghapusan agar tidak hilang saat disinkronkan, bukan menghapus fisik secara langsung).

A-4: Perangkat dalam keadaan luring.

1. Sistem mendeteksi perangkat tidak terhubung ke internet saat akan mengirim perubahan ke server.
2. Sistem mempertahankan perubahan di antrean sinkronisasi lokal.
3. Sistem menampilkan status luring pada antarmuka.
4. Use case selesai. Perubahan akan dikirim secara otomatis saat koneksi internet kembali tersedia.

**Error Flow**  
E-1: Pengiriman ke server gagal.

1. Sistem gagal mengirim data ke server akibat gangguan koneksi sejenak.
2. Sistem menahan data di antrean sinkronisasi untuk dicoba ulang pada siklus berikutnya.
3. Use case selesai.

---

## UC-05 Mengelola Kategori

**Nama Use Case**  
Mengelola Kategori

**Deskripsi Singkat**  
Pengguna dapat membuat, mengubah, atau menghapus kategori untuk mengelompokkan arus kas.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.

**Pos Kondisi**

1. Kategori tersimpan secara lokal dan sinkron dengan server.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke Profil lalu memilih menu Manajemen Kategori.
2. Pengguna memilih aksi pengelolaan kategori.
   - A-1: Pengguna menambahkan kategori dari halaman kategori.
   - A-2: Pengguna menambahkan kategori dari modal transaksi melalui tombol "Tambah".
   - A-3: Pengguna mengubah kategori melalui ikon menu titik tiga.
   - A-4: Pengguna menghapus kategori melalui ikon menu titik tiga dan konfirmasi hapus.
3. Sistem membatasi isian nama dan ikon kategori agar hanya dapat disimpan ketika data yang diperlukan telah terpenuhi.
4. Sistem menyimpan kategori ke dalam penyimpanan lokal perangkat.
5. Sistem memperbarui antarmuka pengguna seketika.
6. Sistem mendaftarkan perubahan ke dalam antrean sinkronisasi.
7. Sistem mengirim data kategori ke server dengan prioritas pengiriman utama (mendahului transaksi).
   - A-5: Perangkat dalam keadaan luring.
8. Use case selesai.

**Alternative Flow**  
A-1: Pengguna menambahkan kategori dari halaman kategori.

1. Pengguna menekan tombol tambah kategori pada halaman Manajemen Kategori.
2. Pengguna mengisi nama dan ikon kategori.
3. Pengguna menekan tombol simpan.
4. Alur berlanjut ke Basic Flow langkah ke-3.

A-2: Pengguna menambahkan kategori dari modal transaksi melalui tombol "Tambah".

1. Pengguna sedang berada di modal tambah/ubah transaksi.
2. Pengguna menekan tombol "Tambah" pada daftar ikon kategori.
3. Pengguna mengisi nama dan ikon kategori lalu menekan tombol simpan.
4. Sistem menyimpan kategori (menjalankan Basic Flow langkah 3-7).
5. Alur kembali ke formulir transaksi, dan kategori baru tersebut langsung tersedia dan terpilih.

A-3: Pengguna mengubah kategori melalui ikon menu titik tiga.

1. Pengguna menekan ikon menu titik tiga pada kategori tertentu, lalu memilih aksi Ubah.
2. Pengguna menyunting nama dan ikon kategori.
3. Pengguna menekan tombol simpan.
4. Alur berlanjut ke Basic Flow langkah ke-3.

A-4: Pengguna menghapus kategori melalui ikon menu titik tiga dan konfirmasi hapus.

1. Pengguna menekan ikon menu titik tiga pada kategori tertentu, lalu memilih aksi Hapus.
2. Sistem menampilkan dialog konfirmasi hapus.
3. Pengguna menyetujui konfirmasi.
4. Alur berlanjut ke Basic Flow langkah ke-4. (Sistem menyimpan informasi penghapusan agar dapat disinkronkan ke server).

A-5: Perangkat dalam keadaan luring.

1. Sistem mendeteksi ketiadaan internet saat akan mengirim data.
2. Sistem menahan perubahan kategori dalam antrean sinkronisasi.
3. Use case selesai. Pengguna tetap dapat langsung menggunakan kategori baru pada transaksi tanpa menunggu koneksi.

**Error Flow**  
_Tidak ada Error Flow yang signifikan karena isian yang tidak sah dibatasi oleh antarmuka sejak awal._

---

## UC-06 Mengelola Dompet

**Nama Use Case**  
Mengelola Dompet

**Deskripsi Singkat**  
Pengguna dapat membuat, mengubah rincian, atau menghapus sumber dana (dompet).

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.

**Pos Kondisi**

1. Data dompet diperbarui secara lokal dan masuk ke dalam siklus sinkronisasi.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke Profil lalu memilih menu Manajemen Dompet.
2. Pengguna memilih aksi pengelolaan dompet.
   - A-1: Pengguna menambah dompet.
   - A-2: Pengguna mengubah dompet melalui ikon menu titik tiga.
   - A-3: Pengguna menghapus dompet melalui ikon menu titik tiga dan konfirmasi hapus.
3. Sistem membatasi isian data dompet agar hanya dapat disimpan ketika data yang diperlukan telah terpenuhi.
4. Sistem menyimpan data ke penyimpanan lokal.
5. Sistem memperbarui antarmuka pengguna tanpa memuat ulang layar.
6. Sistem mencatat perubahan di antrean sinkronisasi.
7. Sistem mengirimkan data dompet ke server secara berurutan.
   - A-4: Perangkat dalam keadaan luring.
8. Use case selesai.

**Alternative Flow**  
A-1: Pengguna menambah dompet.

1. Pengguna memilih aksi tambah dompet.
2. Pengguna mengisi rincian dompet (nama, saldo awal).
3. Pengguna menekan tombol simpan.
4. Alur berlanjut ke Basic Flow langkah ke-3.

A-2: Pengguna mengubah dompet melalui ikon menu titik tiga.

1. Pengguna menekan ikon menu titik tiga pada dompet tertentu, lalu memilih aksi Ubah.
2. Pengguna mengubah rincian dompet (nama).
3. Pengguna menekan tombol simpan.
4. Alur berlanjut ke Basic Flow langkah ke-3.

A-3: Pengguna menghapus dompet melalui ikon menu titik tiga dan konfirmasi hapus.

1. Pengguna menekan ikon menu titik tiga pada dompet tertentu, lalu memilih aksi Hapus.
2. Sistem menampilkan dialog konfirmasi hapus.
3. Pengguna menyetujui konfirmasi.
4. Alur berlanjut ke Basic Flow langkah ke-4. (Sistem mencatat informasi penghapusan dompet).

A-4: Perangkat dalam keadaan luring.

1. Sistem mendeteksi bahwa perangkat tidak tersambung ke jaringan.
2. Sistem menahan pengiriman ke server dan menyimpannya di antrean sinkronisasi secara aman.
3. Use case selesai.

**Error Flow**  
_Tidak ada Error Flow yang signifikan karena isian yang tidak sah dibatasi oleh antarmuka sejak awal._

---

## UC-07 Mengelola Anggaran

**Nama Use Case**  
Mengelola Anggaran

**Deskripsi Singkat**  
Pengguna menetapkan atau mengubah batas maksimal pengeluaran bulanan untuk suatu kategori.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.
2. Pengguna memiliki setidaknya satu kategori pengeluaran.

**Pos Kondisi**

1. Batas anggaran tersimpan secara lokal dan sinkron dengan server.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke halaman anggaran.
2. Pengguna memilih aksi pengelolaan anggaran.
   - A-1: Pengguna menetapkan anggaran baru melalui tombol "Atur Anggaran".
   - A-2: Pengguna mengubah anggaran melalui ikon menu titik tiga pada kartu anggaran.
   - A-3: Pengguna menghapus anggaran melalui ikon menu titik tiga dan konfirmasi hapus.
   - A-4: Pengguna melakukan subsidi silang anggaran melalui ikon menu titik tiga pada kartu anggaran.
3. Sistem membatasi isian nominal agar hanya menerima nilai yang sah.
4. Sistem menyimpan batasan anggaran ke penyimpanan lokal perangkat.
5. Sistem mengevaluasi pengeluaran bulan ini secara lokal terhadap batas baru tersebut, serta menghitung Ritme Pengeluaran (batas ideal harian dan proyeksi akhir bulan secara dinamis).
6. Sistem memasukkan perubahan ke antrean sinkronisasi.
7. Sistem mengirimkan data anggaran ke server untuk dicatat secara permanen.
   - A-4: Perangkat dalam keadaan luring.
8. Use case selesai.

**Alternative Flow**  
A-1: Pengguna menetapkan anggaran baru melalui tombol "Atur Anggaran".

1. Pengguna menekan tombol "Atur Anggaran".
2. Pengguna memilih satu kategori yang ingin dianggarkan.
3. Pengguna memasukkan batas nominal anggaran.
4. Pengguna menekan tombol simpan.
5. Alur berlanjut ke Basic Flow langkah ke-3.

A-2: Pengguna mengubah anggaran melalui ikon menu titik tiga pada kartu anggaran.

1. Pengguna menekan ikon menu titik tiga pada kartu anggaran tertentu, lalu memilih aksi Ubah.
2. Pengguna mengubah batas nominal anggaran.
3. Pengguna menekan tombol simpan.
4. Alur berlanjut ke Basic Flow langkah ke-3.

A-3: Pengguna menghapus anggaran melalui ikon menu titik tiga dan konfirmasi hapus.

1. Pengguna menekan ikon menu titik tiga pada kartu anggaran tertentu, lalu memilih aksi Hapus.
2. Sistem menampilkan dialog konfirmasi hapus.
3. Pengguna menyetujui konfirmasi.
4. Alur berlanjut ke Basic Flow langkah ke-4. (Sistem mencatat penghapusan agar tersinkronisasi).

A-4: Pengguna melakukan subsidi silang anggaran.

1. Pengguna menekan ikon menu titik tiga pada kartu anggaran sumber, lalu memilih aksi Subsidi Silang.
2. Sistem menampilkan formulir subsidi silang anggaran.
3. Pengguna memilih anggaran tujuan.
4. Pengguna memasukkan nominal anggaran yang akan dipindahkan.
5. Sistem membatasi nominal agar tidak melebihi sisa anggaran sumber dan memastikan anggaran sumber berbeda dari anggaran tujuan.
6. Pengguna menekan tombol konfirmasi.
7. Sistem mengurangi batas anggaran sumber dan menambahkan nominal tersebut ke batas anggaran tujuan.
8. Alur berlanjut ke Basic Flow langkah ke-4.

A-5: Perangkat dalam keadaan luring.

1. Sistem mendeteksi ketiadaan jaringan internet.
2. Sistem mempertahankan batas anggaran baru di dalam antrean sinkronisasi.
3. Use case selesai. Sistem tetap akan memantau transaksi luring terhadap batas baru tersebut.

**Error Flow**  
_(Tidak ada Error Flow karena validasi dijamin oleh antarmuka sejak awal pengisian data)._

---

## UC-08 Melihat Analisis Keuangan

**Nama Use Case**  
Melihat Analisis Keuangan

**Deskripsi Singkat**  
Pengguna melihat metrik keuangan, grafik, dan tren arus kas bulanan berdasarkan data lokal.

**Aktor**  
Pengguna

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.

**Pos Kondisi**

1. Halaman analisis menampilkan grafik dan ringkasan pengeluaran.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke halaman analisis.
2. Sistem membaca seluruh data transaksi bulan berjalan dari penyimpanan lokal perangkat.
   - A-1: Transaksi bulan berjalan kosong.
   - E-1: Gagal membaca data lokal.
3. Sistem memproses data untuk menghitung alokasi per kategori dan total harian.
4. Sistem merender dan menyajikan metrik dalam bentuk grafik visual.
5. Use case selesai.

**Alternative Flow**  
A-1: Transaksi bulan berjalan kosong.

1. Sistem mendeteksi belum ada transaksi pada periode bulan yang dipilih.
2. Sistem melompati proses pembuatan grafik.
3. Sistem merender antarmuka yang menginformasikan bahwa belum ada riwayat transaksi.
4. Use case selesai.

**Error Flow**  
E-1: Gagal membaca data lokal.

1. Sistem mengalami kesalahan tak terduga saat membaca penyimpanan lokal.
2. Sistem menampilkan pesan bahwa data gagal dimuat.
3. Use case selesai.

---

## UC-09 Melihat Insight dan Rekomendasi

**Nama Use Case**  
Melihat Insight dan Rekomendasi

**Deskripsi Singkat**  
Pengguna membaca rekomendasi yang dirangkai secara dinamis oleh sistem berdasarkan pola transaksi nyata.

**Aktor**  
Pengguna

**Pre Kondisi**

1. Pengguna berada di halaman analisis.
2. Pengguna memiliki data transaksi yang cukup untuk dievaluasi.

**Pos Kondisi**

1. Kartu rekomendasi ditampilkan di layar pengguna.

**Basic Flow**

1. Use case dimulai ketika sistem meninjau ulang data pengeluaran bulanan dari penyimpanan lokal secara latar belakang.
   - E-1: Data tidak mencukupi untuk analisis.
2. Sistem menghitung dan mendeteksi kategori dominan, frekuensi transaksi, dan tren pengeluaran (misalnya pola pengeluaran akhir pekan).
3. Sistem mengidentifikasi status keuangan atau anomali.
   - A-1: Adanya anomali atau kategori yang memakan porsi besar.
   - A-2: Keuangan stabil tanpa anomali.
4. Sistem menampilkan teks tersebut pada kartu rekomendasi di bagian bawah halaman analisis.
5. Use case selesai.

**Alternative Flow**  
A-1: Adanya anomali atau kategori yang memakan porsi besar.

1. Sistem merangkai teks peringatan yang kontekstual berdasarkan pola spesifik (menyebutkan nama kategori aktual dan proyeksi pengeluaran).
2. Alur berlanjut ke Basic Flow langkah ke-4.

A-2: Keuangan stabil tanpa anomali.

1. Sistem menyusun saran netral untuk mempertahankan perilaku keuangan saat ini.
2. Alur berlanjut ke Basic Flow langkah ke-4.

**Error Flow**  
E-1: Data tidak mencukupi untuk analisis.

1. Sistem mendeteksi riwayat transaksi terlalu sedikit (misal: hanya ada satu transaksi kecil).
2. Sistem membatalkan proses pembuatan rekomendasi mendalam.
3. Use case selesai (tanpa menampilkan kartu rekomendasi khusus).

---

## UC-10 Menerima Notifikasi Peringatan Anggaran

**Nama Use Case**  
Menerima Notifikasi Peringatan Anggaran

**Deskripsi Singkat**  
Pengguna menerima notifikasi di dalam aplikasi dan pada perangkat apabila pengeluaran mendekati atau melampaui batas anggaran.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna telah memiliki anggaran aktif.
2. Pengguna telah mengaktifkan izin notifikasi pada perangkat.

**Pos Kondisi**

1. Pengguna melihat notifikasi peringatan.
2. Sistem menyimpan riwayat notifikasi secara lokal.

**Basic Flow**

1. Use case dimulai ketika pengguna menyimpan sebuah transaksi baru secara lokal.
2. Sistem mengevaluasi total pengeluaran kategori terkait terhadap batas anggaran secara langsung.
3. Sistem membandingkan persentase pengeluaran terhadap ambang batas.
   - A-1: Pengeluaran melampaui 100% dari anggaran.
   - A-2: Pengeluaran melampaui 20% atau 50% dari anggaran.
4. Sistem memeriksa riwayat notifikasi bulan berjalan untuk memastikan tidak ada duplikasi peringatan untuk tingkat urgensi dan status anggaran yang sama.
5. Sistem **selalu** merekam kejadian ini ke dalam riwayat log notifikasi lokal secara individual dan menampilkannya di halaman Notifikasi. Langkah ini tidak terpengaruh oleh mode pengiriman atau batas harian.
6. Sistem mendaftarkannya ke antrean sinkronisasi untuk dikirim ke server.
7. Sistem memeriksa mode pengiriman notifikasi pengguna.
8. Jika mode **Instan** aktif, sistem memicu notifikasi peringatan pada layar perangkat pengguna secara langsung.
   - A-3: Mode pengiriman adalah Ringkasan.
   - A-4: Mode pengiriman adalah Mati.
   - E-1: Izin notifikasi perangkat belum diberikan.
   - E-2: Batas harian notifikasi perangkat telah tercapai.
9. Use case selesai.

**Alternative Flow**  
A-1: Pengeluaran melampaui 100% dari anggaran.

1. Sistem menetapkan tingkat urgensi kritis.
2. Alur berlanjut ke Basic Flow langkah ke-4. (Pada langkah ke-8, notifikasi perangkat akan diatur sedemikian rupa sehingga membutuhkan tindakan penutupan manual dari pengguna).

A-2: Pengeluaran melampaui 20% atau 50% dari anggaran.

1. Sistem menetapkan tingkat urgensi menengah.
2. Alur berlanjut ke Basic Flow langkah ke-4. (Pada langkah ke-8, notifikasi perangkat muncul secara standar dan tidak memaksa penutupan manual).

A-3: Mode pengiriman adalah Ringkasan.

1. Sistem menahan pengiriman notifikasi perangkat secara individual.
2. Sistem akan merangkum log tersebut bersama log peringatan lainnya menjadi satu notifikasi ringkasan (digest) pada jadwal yang telah ditentukan.
3. Use case selesai.

A-4: Mode pengiriman adalah Mati.

1. Sistem tidak mengirimkan notifikasi pada perangkat pengguna sama sekali.
2. Riwayat penting tetap dapat dilihat di halaman Notifikasi.
3. Use case selesai.

**Error Flow**  
E-1: Izin notifikasi perangkat belum diberikan.

1. Sistem mendeteksi bahwa peramban atau pengguna memblokir notifikasi sistem.
2. Sistem membatalkan pemanggilan notifikasi layar luar.
3. Alur berlanjut ke Basic Flow langkah ke-9 secara aman. (Pengguna hanya melihat log peringatan di halaman Notifikasi dalam aplikasi).

E-2: Batas harian notifikasi perangkat telah tercapai.

1. Sistem memeriksa jumlah notifikasi layar (push) yang telah dikirim hari ini.
2. Sistem mendeteksi bahwa batas maksimal harian telah tercapai.
3. Sistem membatalkan pemanggilan notifikasi layar luar untuk menghindari spam, tetapi log tetap tercatat di halaman Notifikasi.
4. Alur berlanjut ke Basic Flow langkah ke-9 secara aman.

---

## UC-11 Mengatur Preferensi Notifikasi

**Nama Use Case**  
Mengatur Preferensi Notifikasi

**Deskripsi Singkat**  
Pengguna mengatur dan menyesuaikan preferensi mode pengiriman notifikasi (Mati, Instan, Ringkasan) serta batas harian notifikasi layar.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.

**Pos Kondisi**

1. Preferensi notifikasi pengguna diperbarui secara lokal dan tersinkronisasi.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke Profil lalu memilih menu Pengaturan Notifikasi.
2. Sistem memeriksa status izin notifikasi pada perangkat.
3. Pengguna memberikan izin notifikasi jika belum diberikan sebelumnya.
   - E-1: Pengguna menolak izin notifikasi perangkat.
4. Setelah izin aktif, pengguna memilih mode pengiriman notifikasi (Mati, Instan, atau Ringkasan) serta batas harian notifikasi perangkat.
5. Sistem memvalidasi perubahan.
   - E-2: Kegagalan menyimpan preferensi lokal.
6. Sistem memperbarui preferensi tersebut ke dalam penyimpanan lokal seketika.
7. Sistem memasukkan perubahan pengaturan ke dalam antrean sinkronisasi.
8. Sistem mengirimkan pengaturan baru ke server secara latar belakang.
   - A-1: Perangkat dalam keadaan luring.
9. Use case selesai.

**Alternative Flow**  
A-1: Perangkat dalam keadaan luring.

1. Sistem mendeteksi tidak ada sambungan internet.
2. Sistem memberlakukan preferensi notifikasi secara lokal dan menahan data pada antrean sinkronisasi.
3. Use case selesai.

**Error Flow**  
E-1: Pengguna menolak izin notifikasi perangkat.

1. Pengguna memblokir izin notifikasi pada sistem operasi atau peramban.
2. Sistem menampilkan pesan bahwa preferensi yang membutuhkan notifikasi perangkat tidak dapat diaktifkan.
3. Alur kembali ke Basic Flow langkah ke-1 (pengguna tetap dapat menyesuaikan pengaturan lain yang tidak bergantung pada notifikasi perangkat, jika ada).

E-2: Kegagalan menyimpan preferensi lokal.

1. Sistem mendeteksi kerusakan pada basis data lokal saat akan menyimpan preferensi.
2. Sistem memunculkan pesan kesalahan dan menggagalkan perubahan antarmuka.
3. Alur kembali ke Basic Flow langkah ke-4.

---

## UC-12 Melakukan Sinkronisasi Data Latar Belakang

**Nama Use Case**  
Melakukan Sinkronisasi Data Latar Belakang

**Deskripsi Singkat**  
Sistem menyelaraskan data penyimpanan lokal dengan data pada server secara sekuensial dan mengatasi pembaruan bertumpuk.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Perangkat terhubung ke internet.
2. Terdapat item yang menunggu di dalam antrean sinkronisasi, atau jadwal sinkronisasi otomatis berjalan.

**Pos Kondisi**

1. Data lokal dan server sejalan secara utuh.

**Basic Flow**

1. Use case dimulai ketika sistem membaca seluruh perubahan data di dalam antrean sinkronisasi lokal.
2. Sistem mengirimkan perubahan ke server secara bertahap mengikuti urutan prioritas yang ketat.
   - E-1: Koneksi jaringan terputus.
3. Server merespons konfirmasi penyimpanan.
4. Sistem membersihkan perubahan yang berhasil dari antrean lokal.
5. Sistem mengambil data pembaruan dari perangkat lain melalui server.
6. Sistem memperbarui penyimpanan lokal secara aman.
   - A-1: Resolusi konflik data.
7. Sistem memeriksa apakah ada transaksi baru yang diantrekan selama proses sinkronisasi berjalan.
   - A-2: Sinkronisasi lanjutan berjalan.
8. Use case selesai.

**Alternative Flow**  
A-1: Resolusi konflik data.

1. Saat menarik pembaruan, sistem menemukan data lokal berbenturan dengan data baru dari server.
2. Sistem membandingkan waktu modifikasi dan mempertahankan data yang paling akhir diubah.
3. Alur berlanjut ke Basic Flow langkah ke-7.

A-2: Sinkronisasi lanjutan berjalan.

1. Sistem mendeteksi bahwa pengguna telah membuat mutasi baru saat langkah sinkronisasi tadi sedang berlangsung.
2. Sistem secara otomatis memutar ulang siklus sinkronisasi baru untuk membersihkan sisa antrean.
3. Alur kembali ke Basic Flow langkah ke-1 (dibatasi maksimal 3 siklus berturut-turut untuk keamanan).

**Error Flow**  
E-1: Koneksi jaringan terputus.

1. Sistem kehilangan sambungan secara tiba-tiba di tengah pengiriman atau pengambilan data.
2. Sistem membatalkan proses sinkronisasi saat itu juga.
3. Sistem menunda sisa antrean untuk dikerjakan pada jadwal sinkronisasi berikutnya.
4. Use case selesai.

---

## UC-13 Menggunakan Aplikasi Saat Luring

**Nama Use Case**  
Menggunakan Aplikasi Saat Luring

**Deskripsi Singkat**  
Pengguna membuka dan bernavigasi ke berbagai halaman aplikasi secara utuh tanpa menggunakan koneksi internet.

**Aktor**  
Pengguna, peramban/PWA

**Pre Kondisi**

1. Pengguna sebelumnya telah memuat aplikasi saat terhubung ke internet.
2. Perangkat saat ini luring.

**Pos Kondisi**

1. Pengguna berhasil menavigasi, dan merubah data aplikasi.

**Basic Flow**

1. Use case dimulai ketika pengguna membuka aplikasi dari peramban atau layar perangkat.
   - A-1: Aplikasi diakses tanpa riwayat cache yang memadai.
2. Peramban menggunakan halaman aplikasi yang tersimpan secara lokal (cache) untuk memuat kerangka layar.
3. Sistem mengambil informasi pengguna (transaksi, dompet, kategori) dari penyimpanan lokal.
4. Pengguna bernavigasi antar halaman melalui antarmuka.
   - E-1: Mengakses fitur khusus daring.
5. Sistem merender halaman tujuan secara utuh tanpa permintaan ke server.
6. Use case selesai.

**Alternative Flow**  
A-1: Aplikasi diakses tanpa riwayat cache yang memadai.

1. Pengguna membuka melalui jendela samaran tanpa koneksi internet atau cache telah terhapus.
2. Peramban gagal memuat antarmuka.
3. Use case selesai.

**Error Flow**  
E-1: Mengakses fitur khusus daring.

1. Pengguna mengeklik menu ekspor dokumen keuangan.
2. Sistem menolak tindakan dan menampilkan peringatan bahwa fitur ekspor mewajibkan akses internet.
3. Alur kembali ke Basic Flow langkah ke-3 (tetap di halaman semula).

---

## UC-14 Mengekspor Data Keuangan

**Nama Use Case**  
Mengekspor Data Keuangan

**Deskripsi Singkat**  
Pengguna meminta salinan riwayat transaksi dalam bentuk dokumen spreadsheet untuk keperluan pelaporan.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.
2. Pengguna memiliki riwayat transaksi.
3. Perangkat terhubung ke internet (daring).

**Pos Kondisi**

1. Dokumen format XLSX terunduh ke perangkat pengguna.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke halaman profil.
2. Pengguna menekan tombol untuk mengekspor data transaksi.
   - E-1: Perangkat luring saat meminta ekspor.
3. Sistem mengirimkan permintaan ekspor secara langsung ke server.
4. Server menyusun seluruh transaksi dari basis data menjadi format spreadsheet.
5. Server mengirimkan dokumen tersebut kembali kepada sistem klien.
6. Sistem memicu unduhan dokumen pada peramban pengguna.
7. Use case selesai.

**Alternative Flow**  
(Tidak terdapat aliran alternatif yang signifikan untuk use case ini karena berfokus pada hasil unduhan tunggal).

**Error Flow**  
E-1: Perangkat luring saat meminta ekspor.

1. Sistem mendeteksi tidak ada koneksi saat tombol ekspor ditekan.
2. Sistem menolak mengirimkan permintaan ke server dan menampilkan pesan peringatan butuh koneksi.
3. Alur kembali ke Basic Flow langkah ke-1.

---

## UC-15 Mengakses Profil dan Pengaturan Aplikasi

**Nama Use Case**  
Mengakses Profil dan Pengaturan Aplikasi

**Deskripsi Singkat**  
Pengguna melihat informasi akun dan mengakses berbagai pengaturan aplikasi serta fungsi manajemen data.

**Aktor**  
Pengguna

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.

**Pos Kondisi**

1. Pengguna berhasil melihat informasi akun atau diarahkan ke fungsi pengaturan terkait.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke halaman Profil.
2. Sistem menampilkan informasi akun dasar pengguna secara hanya-baca (read-only).
3. Pengguna memilih salah satu menu navigasi atau aksi yang tersedia:
   - A-1: Pengguna mengakses halaman Manajemen Dompet.
   - A-2: Pengguna mengakses halaman Manajemen Kategori.
   - A-3: Pengguna mengakses halaman Pengaturan Notifikasi.
   - A-4: Pengguna mengekspor data (mengarah ke UC-14 Mengekspor Data Keuangan).
   - A-5: Pengguna memaksa sinkronisasi ulang dengan server.
   - A-6: Pengguna menghapus cache lokal (membersihkan penyimpanan lokal).
   - A-7: Pengguna keluar dari aplikasi (logout).
4. Sistem mengarahkan pengguna atau mengeksekusi aksi yang dipilih.
5. Use case selesai.

**Alternative Flow**  
A-1: Pengguna mengakses halaman Manajemen Dompet.

1. Pengguna menekan menu Manajemen Dompet.
2. Alur berlanjut ke UC-06 Mengelola Dompet.

A-2: Pengguna mengakses halaman Manajemen Kategori.

1. Pengguna menekan menu Manajemen Kategori.
2. Alur berlanjut ke UC-05 Mengelola Kategori.

A-3: Pengguna mengakses halaman Pengaturan Notifikasi.

1. Pengguna menekan menu Pengaturan Notifikasi.
2. Alur berlanjut ke UC-11 Mengatur Preferensi Notifikasi.

A-4: Pengguna mengekspor data.

1. Pengguna menekan tombol Ekspor.
2. Alur berlanjut ke UC-14 Mengekspor Data Keuangan.

A-5: Pengguna memaksa sinkronisasi ulang dengan server.

1. Pengguna menekan tombol paksa sinkronisasi.
2. Sistem mengeksekusi siklus sinkronisasi baru secara utuh.
3. Use case selesai.

A-6: Pengguna menghapus cache lokal (membersihkan penyimpanan lokal).

1. Pengguna menekan tombol hapus cache lokal.
2. Sistem menampilkan peringatan konfirmasi.
3. Pengguna menyetujui, dan sistem mengosongkan _IndexedDB_ (penyimpanan lokal).
4. Sistem mengarahkan pengguna ke layar awal/login.
5. Use case selesai.

A-7: Pengguna keluar dari aplikasi (logout).

1. Pengguna menekan tombol keluar.
2. Sistem mengosongkan token sesi pengguna dan mengarahkan ke halaman masuk.
3. Use case selesai.

**Error Flow**  
_(Tidak ada Error Flow yang spesifik pada halaman profil ini karena tindakan di atas bersifat navigasional atau akan dilanjutkan di Use Case masing-masing)._

---

## UC-16 Menginstal Aplikasi sebagai Aplikasi Web Progresif

**Nama Use Case**  
Menginstal Aplikasi sebagai Aplikasi Web Progresif

**Deskripsi Singkat**  
Pengguna memasang pintasan aplikasi ke layar utama perangkat untuk penggunaan penuh tanpa gangguan jendela peramban.

**Aktor**  
Pengguna, peramban/PWA

**Pre Kondisi**

1. Pengguna mengakses situs Moneta menggunakan peramban modern yang mendukung fitur instalasi aplikasi luring.

**Pos Kondisi**

1. Aplikasi terpasang dan dapat diluncurkan langsung dari layar perangkat.

**Basic Flow**

1. Use case dimulai ketika peramban secara otomatis mendeteksi kapabilitas aplikasi web progresif dari situs web Moneta.
   - E-1: Perangkat tidak mendukung kapabilitas tersebut.
2. Peramban menampilkan opsi pemasangan aplikasi kepada pengguna.
   - A-1: Opsi otomatis tidak muncul sehingga pengguna melakukan instalasi manual.
3. Pengguna menyetujui opsi pemasangan.
4. Peramban menginstal aplikasi dan menambahkan ikon ke layar perangkat pengguna.
5. Pengguna meluncurkan aplikasi dengan pengalaman layar penuh.
6. Use case selesai.

**Alternative Flow**  
A-1: Opsi otomatis tidak muncul sehingga pengguna melakukan instalasi manual.

1. Peramban tidak memicu opsi pemasangan.
2. Pengguna menekan menu opsi peramban dan secara mandiri memilih "Tambahkan ke Layar Utama".
3. Alur berlanjut ke Basic Flow langkah ke-3.

**Error Flow**  
E-1: Perangkat tidak mendukung kapabilitas tersebut.

1. Peramban pengguna terlalu lawas atau sistem operasi menolak instalasi aplikasi web.
2. Peramban menahan opsi instalasi sehingga tidak muncul.
3. Use case selesai. Pengguna tetap menggunakan aplikasi melalui tab peramban biasa.

---

## UC-17 Melihat Riwayat Notifikasi

**Nama Use Case**  
Melihat Riwayat Notifikasi

**Deskripsi Singkat**  
Pengguna melihat daftar riwayat notifikasi yang pernah diterima dan menandai notifikasi sebagai telah dibaca.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.
2. Sistem memiliki riwayat notifikasi pada penyimpanan lokal.

**Pos Kondisi**

1. Riwayat notifikasi ditampilkan kepada pengguna.
2. Status baca notifikasi diperbarui apabila pengguna membuka atau menandai notifikasi.

**Basic Flow**

1. Use case dimulai ketika pengguna membuka halaman Notifikasi.
2. Sistem membaca riwayat notifikasi dari penyimpanan lokal.
   - A-1: Riwayat notifikasi kosong.
3. Sistem menampilkan daftar notifikasi kepada pengguna.
4. Pengguna memilih atau membuka notifikasi tertentu.
5. Sistem menandai notifikasi sebagai telah dibaca.
6. Sistem mencatat perubahan status baca ke dalam antrean sinkronisasi.
7. Use case selesai.

**Alternative Flow**  
A-1: Riwayat notifikasi kosong.

1. Sistem mendeteksi belum ada riwayat notifikasi pada penyimpanan lokal.
2. Sistem menampilkan tampilan kosong yang informatif.
3. Use case selesai.

**Error Flow**  
_Tidak ada Error Flow yang signifikan._

---

## UC-18 Keluar dari Aplikasi

**Nama Use Case**  
Keluar dari Aplikasi

**Deskripsi Singkat**  
Pengguna mengakhiri sesi aktif dan keluar dari aplikasi Moneta secara resmi.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sedang dalam kondisi telah masuk ke dalam aplikasi.
2. Perangkat terhubung ke internet (daring).

**Pos Kondisi**

1. Sesi pengguna dihapus dari server.
2. Pengguna diarahkan ke halaman masuk.
3. Data lokal pada perangkat tetap tersimpan untuk sesi berikutnya.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke halaman Profil.
2. Pengguna menekan tombol Keluar (_Logout_).
3. Sistem menampilkan dialog konfirmasi sebelum melanjutkan proses keluar.
   - A-1: Pengguna membatalkan proses keluar.
4. Pengguna mengonfirmasi.
5. Sistem mengirimkan permintaan keluar ke server untuk menghapus penanda sesi.
   - E-1: Perangkat dalam keadaan luring saat konfirmasi ditekan.
6. Server mengonfirmasi penghapusan sesi.
7. Sistem menghapus penanda sesi lokal pengguna.
8. Sistem mengarahkan pengguna ke halaman masuk.
9. Use case selesai.

**Alternative Flow**  
A-1: Pengguna membatalkan proses keluar.

1. Pengguna menekan tombol batal pada dialog konfirmasi.
2. Sistem menutup dialog dan pengguna tetap berada di halaman Profil.
3. Use case selesai.

**Error Flow**  
E-1: Perangkat dalam keadaan luring saat konfirmasi ditekan.

1. Sistem mendeteksi tidak ada koneksi internet ketika mencoba menghubungi server untuk keluar.
2. Sistem membatalkan proses keluar.
3. Sistem menampilkan pesan peringatan bahwa proses keluar membutuhkan koneksi internet.
4. Pengguna tetap berada dalam sesi aktif dan diarahkan kembali ke halaman Profil.
5. Use case selesai.

---

## UC-19 Transfer Antar Dompet

**Nama Use Case**  
Transfer Antar Dompet

**Deskripsi Singkat**  
Pengguna memindahkan saldo dari satu dompet ke dompet lain tanpa mencatatnya sebagai pemasukan atau pengeluaran.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.
2. Pengguna memiliki minimal dua dompet aktif.

**Pos Kondisi**

1. Saldo dompet sumber berkurang sesuai nominal transfer.
2. Saldo dompet tujuan bertambah sesuai nominal transfer.
3. Transfer tersimpan secara lokal dan masuk ke antrean sinkronisasi.

**Basic Flow**

1. Use case dimulai ketika pengguna membuka modal transaksi melalui tombol Transfer Antar Dompet pada halaman manajemen dompet, atau memilih tab Transfer pada modal transaksi biasa.
2. Pengguna memilih dompet sumber (Dari Dompet).
3. Pengguna memilih dompet tujuan (Ke Dompet).
4. Pengguna memasukkan nominal transfer.
5. Sistem membatasi isian agar dompet sumber dan tujuan berbeda serta nominal bernilai lebih dari nol.
6. Pengguna menekan tombol simpan.
7. Sistem menyimpan transfer ke penyimpanan lokal sebagai transaksi bertipe TRANSFER.
8. Sistem memperbarui saldo dompet sumber dan dompet tujuan seketika pada antarmuka.
9. Sistem mencatat perubahan ke antrean sinkronisasi.
10. Sistem mengirimkan perubahan ke server saat koneksi tersedia.
11. Use case selesai.

**Alternative Flow**  
A-1: Perangkat dalam keadaan luring.

1. Sistem menyimpan transfer ke penyimpanan lokal.
2. Sistem menahan perubahan di antrean sinkronisasi.
3. Use case selesai. Transfer akan dikirim ke server saat koneksi internet tersedia kembali.

**Error Flow**  
_Tidak ada Error Flow yang signifikan karena isian yang tidak sah dibatasi oleh antarmuka sejak awal._

---

## UC-20 Mengelola Target Finansial

**Nama Use Case**  
Mengelola Target Finansial

**Deskripsi Singkat**  
Pengguna menetapkan dan memantau Target Pemasukan (Income Target) pada periode waktu tertentu untuk mengukur performa pemasukan.

**Aktor**  
Pengguna, server

**Pre Kondisi**

1. Pengguna sudah masuk ke dalam aplikasi.

**Pos Kondisi**

1. Target pemasukan tersimpan secara lokal dan sinkron dengan server.
2. Pengguna dapat melihat progres pencapaian pemasukannya.

**Basic Flow**

1. Use case dimulai ketika pengguna menavigasi ke halaman Target Keuangan.
2. Pengguna memilih aksi tambah target pemasukan.
3. Pengguna mengisi detail target (nama, periode, nominal target, dan kategori pemasukan jika spesifik).
4. Sistem menyimpan data ke penyimpanan lokal perangkat.
5. Sistem mengevaluasi riwayat transaksi pemasukan (tipe INCOME) untuk memantau progres. Transaksi pengeluaran (expense) atau transfer tidak memengaruhi target ini.
6. Sistem memasukkan perubahan ke antrean sinkronisasi (Sinkronisasi Pull Progresif pada saat memuat).
7. Use case selesai.

**Alternative Flow**  
A-1: Transaksi di luar periode target
1. Pengguna merekam pemasukan di luar rentang tanggal aktif target.
2. Sistem mengecualikan transaksi tersebut dari kalkulasi progres target.
3. Alur berlanjut dengan aman.

**Error Flow**  
_(Tidak ada Error Flow signifikan karena validasi dijamin oleh antarmuka)._

---

## 3.2 Kebutuhan Fungsional

Bagian ini mendokumentasikan seluruh kebutuhan fungsional sistem Moneta Finance yang diturunkan dari skenario penggunaan (_use case_) yang telah ditetapkan. Setiap kebutuhan fungsional mewakili kemampuan konkret yang harus disediakan oleh sistem kepada pengguna.

---

### 3.2.1 Registrasi Akun

**ID Requirement**: FR-MONETA-001
**Deskripsi**: Sistem harus memampukan pengguna baru mendaftarkan akun dengan mengisi nama, alamat surel, dan kata sandi. Sistem harus memvalidasi keunikan alamat surel dan menyimpan data akun pada server. Setelah pendaftaran berhasil, sistem harus mengarahkan pengguna ke halaman utama.

---

### 3.2.2 Masuk ke Aplikasi dan Memuat Data Awal

**ID Requirement**: FR-MONETA-002
**Deskripsi**: Sistem harus memampukan pengguna yang telah terdaftar untuk masuk menggunakan alamat surel dan kata sandi. Setelah autentikasi berhasil, sistem harus mengunduh data riwayat keuangan awal dari server dan menyimpannya ke penyimpanan lokal perangkat sebelum mengarahkan pengguna ke halaman utama.

---

### 3.2.3 Keluar dari Aplikasi

**ID Requirement**: FR-MONETA-003
**Deskripsi**: Sistem harus memampukan pengguna untuk keluar dari sesi aktif. Sistem harus menghapus penanda sesi dan mengarahkan pengguna ke halaman masuk. Fungsi ini dapat diakses melalui halaman Profil.

---

### 3.2.4 Menampilkan Halaman Utama (Dashboard)

**ID Requirement**: FR-MONETA-004
**Deskripsi**: Sistem harus memampukan pengguna melihat ringkasan keuangan bulanan yang mencakup total saldo, total pengeluaran, total pemasukan, dan daftar transaksi terbaru. Seluruh data harus dibaca secara langsung dari penyimpanan lokal perangkat tanpa bergantung pada koneksi internet. Sistem harus menampilkan status sinkronisasi pada komponen navigasi.

---

### 3.2.5 Menambah Transaksi

**ID Requirement**: FR-MONETA-005
**Deskripsi**: Sistem harus memampukan pengguna menambah transaksi keuangan baru dengan mengisi nominal, tanggal, kategori, dan dompet. Penambahan transaksi dapat dilakukan melalui tombol "Tambah Transaksi" pada bilah navigasi sisi (desktop) atau tombol aksi mengambang (_floating action button_/FAB) pada perangkat seluler. Sistem harus membatasi isian nominal agar hanya menerima nilai yang sah. Transaksi yang tersimpan harus segera tampil pada antarmuka melalui penyimpanan lokal dan dicatat ke dalam antrean sinkronisasi.

---

### 3.2.6 Melihat Daftar Transaksi

**ID Requirement**: FR-MONETA-006
**Deskripsi**: Sistem harus memampukan pengguna melihat daftar riwayat transaksi keuangan yang tersimpan secara lokal. Daftar harus menampilkan informasi ringkas per transaksi, termasuk nominal, tanggal, kategori, dan dompet. Sistem harus menampilkan tampilan kosong (_empty state_) apabila belum ada riwayat transaksi.

---

### 3.2.7 Mengubah Transaksi

**ID Requirement**: FR-MONETA-007
**Deskripsi**: Sistem harus memampukan pengguna mengubah rincian transaksi yang telah ada. Aksi ubah harus dapat diakses melalui ikon menu titik tiga pada item transaksi yang dipilih. Perubahan harus disimpan secara lokal terlebih dahulu, antarmuka diperbarui seketika, kemudian perubahan dicatat ke dalam antrean sinkronisasi.

---

### 3.2.8 Menghapus Transaksi

**ID Requirement**: FR-MONETA-008
**Deskripsi**: Sistem harus memampukan pengguna menghapus transaksi yang telah ada. Aksi hapus harus dapat diakses melalui ikon menu titik tiga pada item transaksi yang dipilih. Sistem harus menampilkan dialog konfirmasi sebelum menjalankan penghapusan. Penghapusan dilakukan secara logis (_soft delete_) agar dapat disinkronkan ke server.

---

### 3.2.9 Menyaring dan Mencari Transaksi

**ID Requirement**: FR-MONETA-009
**Deskripsi**: Sistem harus memampukan pengguna menyaring daftar transaksi berdasarkan periode atau parameter yang relevan, sehingga pengguna dapat menemukan transaksi yang dicari dari data lokal yang tersedia.

---

### 3.2.10 Mengelola Kategori

**ID Requirement**: FR-MONETA-010
**Deskripsi**: Sistem harus memampukan pengguna mengelola kategori pengelompokan arus kas melalui halaman Manajemen Kategori yang diakses dari Profil. Pengelolaan mencakup penambahan kategori baru, pengubahan nama dan ikon kategori melalui ikon menu titik tiga, serta penghapusan kategori dengan konfirmasi melalui ikon menu titik tiga. Perubahan kategori harus disimpan secara lokal dan dicatat ke dalam antrean sinkronisasi dengan prioritas pengiriman utama.

---

### 3.2.11 Menambahkan Kategori dari Modal Transaksi

**ID Requirement**: FR-MONETA-011
**Deskripsi**: Sistem harus memampukan pengguna menambahkan kategori baru langsung dari formulir tambah atau ubah transaksi, melalui tombol "Tambah" pada daftar ikon kategori. Setelah kategori baru berhasil disimpan, alur harus kembali ke formulir transaksi dan kategori tersebut harus segera tersedia dan dapat dipilih pada formulir yang sama.

---

### 3.2.12 Mengelola Dompet

**ID Requirement**: FR-MONETA-012
**Deskripsi**: Sistem harus memampukan pengguna mengelola sumber dana (dompet) melalui halaman Manajemen Dompet yang diakses dari Profil. Pengelolaan mencakup penambahan dompet baru beserta saldo awal, pengubahan nama dompet melalui ikon menu titik tiga, serta penghapusan dompet dengan konfirmasi melalui ikon menu titik tiga. Seluruh perubahan harus disimpan secara lokal dan dicatat ke dalam antrean sinkronisasi.

---

### 3.2.13 Mengelola Anggaran

**ID Requirement**: FR-MONETA-013
**Deskripsi**: Sistem harus memampukan pengguna menetapkan, mengubah, dan menghapus batas pengeluaran bulanan per kategori. Penetapan anggaran baru dilakukan melalui tombol "Atur Anggaran". Pengubahan dan penghapusan dilakukan melalui ikon menu titik tiga pada kartu anggaran, disertai konfirmasi untuk penghapusan. Sistem harus membatasi isian nominal agar hanya menerima nilai yang sah. Perubahan harus dicatat ke dalam antrean sinkronisasi.

---

### 3.2.14 Visualisasi dan Pemantauan Anggaran

**ID Requirement**: FR-MONETA-014
**Deskripsi**: Sistem harus memampukan pengguna memantau sisa anggaran bulan berjalan melalui visualisasi ringkas pada daftar anggaran (contoh: bilah progres) yang dihitung langsung dari data transaksi lokal tanpa penundaan.

---

### 3.2.15 Subsidi Silang Anggaran

**ID Requirement**: FR-MONETA-029
**Deskripsi**: Sistem harus memampukan pengguna memindahkan sebagian sisa batas anggaran dari satu kategori anggaran ke kategori anggaran lain dalam periode berjalan. Sistem harus membatasi nominal pemindahan agar tidak melebihi sisa anggaran sumber dan memastikan anggaran sumber berbeda dari anggaran tujuan. Perubahan pada anggaran sumber dan anggaran tujuan harus disimpan secara lokal dan dicatat ke dalam antrean sinkronisasi.

---

### 3.2.16 Analisis Keuangan

**ID Requirement**: FR-MONETA-015
**Deskripsi**: Sistem harus memampukan pengguna melihat analisis keuangan bulanan dalam bentuk grafik dan metrik yang dihitung dari data transaksi lokal. Analisis harus mencakup distribusi pengeluaran per kategori dan tren arus kas harian. Sistem harus menampilkan tampilan kosong yang informatif apabila belum ada data transaksi pada periode yang dipilih.

---

### 3.2.16 Insight dan Rekomendasi Keuangan Berbasis Aturan

**ID Requirement**: FR-MONETA-016
**Deskripsi**: Sistem harus memampukan pengguna melihat rekomendasi keuangan kontekstual yang dirangkai secara otomatis berdasarkan pola transaksi aktual, mencakup deteksi kategori dominan, frekuensi transaksi, dan anomali pengeluaran. Rekomendasi harus ditampilkan pada halaman analisis dan hanya dihasilkan apabila data transaksi tersedia dalam jumlah yang cukup.

---

### 3.2.17 Notifikasi Peringatan Anggaran

**ID Requirement**: FR-MONETA-017
**Deskripsi**: Sistem harus memampukan pengguna menerima peringatan secara otomatis apabila pengeluaran suatu kategori mendekati atau melampaui batas anggaran yang ditetapkan. Peringatan harus muncul di dalam antarmuka aplikasi dan, apabila izin notifikasi perangkat telah diberikan, juga dikirim sebagai notifikasi perangkat. Sistem harus membedakan tingkat urgensi berdasarkan persentase penggunaan anggaran. Sistem harus mencegah notifikasi ganda untuk ambang batas yang sama dalam satu periode.

---

### 3.2.18 Izin dan Preferensi Notifikasi

**ID Requirement**: FR-MONETA-018
**Deskripsi**: Sistem harus memampukan pengguna mengatur preferensi notifikasi melalui halaman Pengaturan Notifikasi yang diakses dari Profil. Sistem harus memeriksa status izin notifikasi perangkat sebelum memungkinkan pengguna mengaktifkan preferensi yang membutuhkan notifikasi perangkat. Apabila izin ditolak, sistem harus memberitahukan pengguna bahwa preferensi terkait tidak dapat diaktifkan. Pengaturan preferensi harus disimpan secara lokal dan dicatat ke dalam antrean sinkronisasi.

---

### 3.2.19 Pembatasan dan Deduplikasi Notifikasi

**ID Requirement**: FR-MONETA-019
**Deskripsi**: Sistem harus memampukan pembatasan jumlah notifikasi yang ditampilkan dalam satu hari sesuai preferensi pengguna. Selain itu, sistem harus mencegah pengiriman notifikasi berulang untuk kategori, ambang batas, dan periode yang sama agar notifikasi tidak bersifat berlebihan (_spam_). Apabila batas notifikasi harian telah tercapai, sistem tidak boleh menampilkan notifikasi tambahan sebagai notifikasi terkirim pada hari yang sama.

---

### 3.2.20 Kotak Masuk dan Riwayat Notifikasi

**ID Requirement**: FR-MONETA-020
**Deskripsi**: Sistem harus memampukan pengguna melihat riwayat seluruh notifikasi yang pernah diterima melalui kotak masuk notifikasi. Riwayat notifikasi harus disimpan secara lokal dan dapat dilihat tanpa memerlukan koneksi internet. Sistem harus menampilkan jumlah notifikasi yang belum dibaca pada komponen navigasi.

---

### 3.2.21 Status Baca Notifikasi

**ID Requirement**: FR-MONETA-021
**Deskripsi**: Sistem harus memampukan pengguna menandai notifikasi sebagai telah dibaca. Perubahan status baca harus disimpan secara lokal dan disinkronkan ke server sehingga status terbaca konsisten di seluruh perangkat pengguna.

---

### 3.2.22 Sinkronisasi Data Latar Belakang

**ID Requirement**: FR-MONETA-022
**Deskripsi**: Sistem harus memampukan sinkronisasi data dua arah antara penyimpanan lokal dan server secara otomatis di latar belakang ketika koneksi internet tersedia. Sinkronisasi harus mencakup pengiriman perubahan lokal ke server (_push_) mengikuti urutan prioritas, pengambilan pembaruan dari server (_pull_), dan penanganan konflik data berdasarkan waktu modifikasi terakhir.

---

### 3.2.23 Penggunaan Aplikasi Saat Luring

**ID Requirement**: FR-MONETA-023
**Deskripsi**: Sistem harus memampukan pengguna menggunakan seluruh fungsi utama aplikasi—termasuk melihat dashboard, menambah dan mengubah transaksi, serta menavigasi antar halaman—tanpa memerlukan koneksi internet, dengan menggunakan data yang telah tersimpan pada penyimpanan lokal. Perubahan yang dilakukan saat luring harus dicatat ke dalam antrean sinkronisasi untuk dikirim secara otomatis ketika koneksi tersedia kembali.

---

### 3.2.24 Paksa Sinkronisasi (_Force Sync_)

**ID Requirement**: FR-MONETA-024
**Deskripsi**: Sistem harus memampukan pengguna memicu siklus sinkronisasi penuh secara manual melalui tombol yang tersedia di halaman Profil. Fungsi ini berguna ketika pengguna ingin memastikan data lokal dan server selaras tanpa menunggu jadwal sinkronisasi otomatis.

---

### 3.2.25 Hapus Cache Lokal

**ID Requirement**: FR-MONETA-025
**Deskripsi**: Sistem harus memampukan pengguna mengosongkan seluruh data yang tersimpan pada penyimpanan lokal perangkat melalui fungsi yang tersedia di halaman Profil. Sistem harus menampilkan dialog konfirmasi sebelum menjalankan penghapusan. Setelah cache dikosongkan, sistem harus mengarahkan pengguna ke halaman masuk.

---

### 3.2.26 Ekspor Laporan Keuangan

**ID Requirement**: FR-MONETA-026
**Deskripsi**: Sistem harus memampukan pengguna mengunduh riwayat transaksi dalam format _spreadsheet_ (XLSX) melalui fungsi ekspor yang dapat diakses dari halaman Profil. Fungsi ini memerlukan koneksi internet aktif karena pembuatan dokumen dilakukan di sisi server. Sistem harus menampilkan pesan peringatan apabila pengguna mencoba mengekspor dalam kondisi luring.

---

### 3.2.27 Pengaturan Visual Aplikasi (Tema Tampilan)

**ID Requirement**: FR-MONETA-027
**Deskripsi**: Sistem harus memampukan pengguna beralih antara mode tampilan terang (_light mode_) dan gelap (_dark mode_). Tombol pengaturan tema harus dapat diakses dari area tata letak utama aplikasi, yaitu pada bilah navigasi atau bilah atas, bukan di dalam halaman Profil.

---

### 3.2.28 Instalasi Aplikasi sebagai PWA

**ID Requirement**: FR-MONETA-028
**Deskripsi**: Sistem harus mendukung instalasi sebagai Aplikasi Web Progresif (_Progressive Web App_/PWA) pada perangkat pengguna. Peramban yang mendukung harus dapat menampilkan opsi pemasangan secara otomatis. Pengguna juga harus dapat memasang aplikasi secara manual melalui menu opsi peramban. Setelah terpasang, aplikasi harus dapat diluncurkan layaknya aplikasi bawaan dengan tampilan layar penuh.

---

### 3.2.29 Transfer Antar Dompet

**ID Requirement**: FR-MONETA-030
**Deskripsi**: Sistem harus memampukan pengguna memindahkan saldo dari satu dompet ke dompet lain melalui jenis transaksi Transfer tanpa mencatatnya sebagai pemasukan atau pengeluaran. Transfer antar dompet harus mengurangi saldo dompet sumber dan menambah saldo dompet tujuan, disimpan terlebih dahulu pada penyimpanan lokal, serta dicatat ke dalam antrean sinkronisasi untuk dikirim ke server ketika koneksi tersedia.

---

## 3.3 Pemetaan FR ke Use Case

Tabel berikut memetakan setiap kebutuhan fungsional ke skenario penggunaan (_use case_) yang menjadi sumber turunannya, guna memastikan keterlacakan (_traceability_) antara kebutuhan dan skenario.

| ID Requirement | Nama Requirement                                 | Use Case Terkait                                                                    |
| -------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| FR-MONETA-001  | Registrasi Akun                                  | UC-01 Registrasi Akun                                                               |
| FR-MONETA-002  | Masuk ke Aplikasi dan Memuat Data Awal           | UC-02 Masuk ke Aplikasi dan Memuat Data Awal                                        |
| FR-MONETA-003  | Keluar dari Aplikasi                             | UC-18 Keluar dari Aplikasi                                                          |
| FR-MONETA-004  | Menampilkan Halaman Utama (Dashboard)            | UC-03 Melihat Halaman Utama                                                         |
| FR-MONETA-005  | Menambah Transaksi                               | UC-04 Mengelola Transaksi                                                           |
| FR-MONETA-006  | Melihat Daftar Transaksi                         | UC-03 Melihat Halaman Utama, UC-04 Mengelola Transaksi                              |
| FR-MONETA-007  | Mengubah Transaksi                               | UC-04 Mengelola Transaksi                                                           |
| FR-MONETA-008  | Menghapus Transaksi                              | UC-04 Mengelola Transaksi                                                           |
| FR-MONETA-009  | Menyaring dan Mencari Transaksi                  | UC-04 Mengelola Transaksi                                                           |
| FR-MONETA-010  | Mengelola Kategori                               | UC-05 Mengelola Kategori                                                            |
| FR-MONETA-011  | Menambahkan Kategori dari Modal Transaksi        | UC-05 Mengelola Kategori (A-2)                                                      |
| FR-MONETA-012  | Mengelola Dompet                                 | UC-06 Mengelola Dompet                                                              |
| FR-MONETA-013  | Mengelola Anggaran                               | UC-07 Mengelola Anggaran                                                            |
| FR-MONETA-014  | Visualisasi dan Pemantauan Anggaran              | UC-07 Mengelola Anggaran, UC-10 Menerima Notifikasi Peringatan Anggaran             |
| FR-MONETA-015  | Analisis Keuangan                                | UC-08 Melihat Analisis Keuangan                                                     |
| FR-MONETA-016  | Insight dan Rekomendasi Keuangan Berbasis Aturan | UC-09 Melihat Insight dan Rekomendasi                                               |
| FR-MONETA-017  | Notifikasi Peringatan Anggaran                   | UC-10 Menerima Notifikasi Peringatan Anggaran                                       |
| FR-MONETA-018  | Izin dan Preferensi Notifikasi                   | UC-11 Mengatur Preferensi Notifikasi                                                |
| FR-MONETA-019  | Pembatasan dan Deduplikasi Notifikasi            | UC-10 Menerima Notifikasi Peringatan Anggaran, UC-11 Mengatur Preferensi Notifikasi |
| FR-MONETA-020  | Kotak Masuk dan Riwayat Notifikasi               | UC-17 Melihat Riwayat Notifikasi                                                    |
| FR-MONETA-021  | Status Baca Notifikasi                           | UC-17 Melihat Riwayat Notifikasi                                                    |
| FR-MONETA-022  | Sinkronisasi Data Latar Belakang                 | UC-12 Melakukan Sinkronisasi Data Latar Belakang                                    |
| FR-MONETA-023  | Penggunaan Aplikasi Saat Luring                  | UC-13 Menggunakan Aplikasi Saat Luring                                              |
| FR-MONETA-024  | Paksa Sinkronisasi (Force Sync)                  | UC-15 Mengakses Profil dan Pengaturan Aplikasi                                      |
| FR-MONETA-025  | Hapus Cache Lokal                                | UC-15 Mengakses Profil dan Pengaturan Aplikasi                                      |
| FR-MONETA-026  | Ekspor Laporan Keuangan                          | UC-14 Mengekspor Data Keuangan                                                      |
| FR-MONETA-027  | Pengaturan Visual Aplikasi (Tema Tampilan)       | Tata Letak Utama Aplikasi                                                           |
| FR-MONETA-028  | Instalasi Aplikasi sebagai PWA                   | UC-16 Menginstal Aplikasi sebagai Aplikasi Web Progresif                            |
| FR-MONETA-029  | Subsidi Silang Anggaran                          | UC-07 Mengelola Anggaran                                                            |
| FR-MONETA-030  | Transfer Antar Dompet                            | UC-19 Transfer Antar Dompet                                                         |

---

## 3.4 Kebutuhan Non-Fungsional

Bagian ini mendokumentasikan kebutuhan non-fungsional sistem Moneta Finance yang mengatur kualitas, keandalan, keamanan, dan karakteristik operasional sistem secara keseluruhan.

---

### 3.4.1 Performa (_Performance_)

**ID Requirement**: NFR-MONETA-001
**Deskripsi**: Sistem harus memberikan respons antarmuka yang cepat untuk seluruh operasi yang bersumber dari penyimpanan lokal, seperti menambah, mengubah, menghapus transaksi, serta memuat halaman utama, analisis, dan anggaran. Perubahan data yang disimpan secara lokal harus terlihat pada antarmuka tanpa penundaan yang dirasakan oleh pengguna, tanpa menunggu konfirmasi dari server.

---

### 3.4.2 Keandalan (_Reliability_)

**ID Requirement**: NFR-MONETA-002
**Deskripsi**: Sistem harus menjamin bahwa data yang telah disimpan secara lokal tidak hilang, bahkan apabila perangkat kehilangan koneksi internet secara tiba-tiba. Setiap perubahan yang belum berhasil dikirim ke server harus tetap tersimpan di dalam antrean sinkronisasi dan dikirim ulang secara otomatis pada kesempatan berikutnya ketika koneksi internet tersedia.

---

### 3.4.3 Ketersediaan Saat Luring (_Offline Availability_)

**ID Requirement**: NFR-MONETA-003
**Deskripsi**: Fungsi-fungsi utama sistem harus tetap dapat digunakan selama penyimpanan lokal tersedia, tanpa bergantung pada koneksi internet. Fungsi yang harus tetap dapat diakses dalam kondisi luring mencakup: melihat dashboard, menambah dan mengubah transaksi, mengelola kategori dan dompet, memantau anggaran, melihat analisis keuangan, serta melihat riwayat notifikasi lokal. Fungsi yang secara eksplisit membutuhkan koneksi internet—seperti ekspor laporan—harus menampilkan pesan peringatan yang jelas kepada pengguna.

---

### 3.4.4 Keandalan Sinkronisasi (_Synchronization Reliability_)

**ID Requirement**: NFR-MONETA-004
**Deskripsi**: Sistem harus menyinkronkan seluruh perubahan lokal ke server mengikuti urutan prioritas yang telah ditetapkan, setiap kali koneksi internet tersedia. Apabila pengiriman gagal di tengah siklus, sistem harus mempertahankan sisa antrean untuk dicoba kembali pada siklus sinkronisasi berikutnya. Sistem harus menampilkan status sinkronisasi kepada pengguna secara berkelanjutan, termasuk status _pending_, sedang berlangsung, berhasil, dan gagal.

---

### 3.4.5 Kemudahan Penggunaan (_Usability_)

**ID Requirement**: NFR-MONETA-005
**Deskripsi**: Antarmuka sistem harus dirancang agar dapat dipahami dan digunakan oleh pengguna awam tanpa pelatihan khusus. Aksi tambah, ubah, dan hapus pada seluruh entitas data harus menggunakan pola interaksi yang konsisten di seluruh halaman. Aksi ubah dan hapus tidak boleh hanya mengandalkan efek _hover_ sebagai satu-satunya cara akses. Setiap aksi penghapusan data penting harus selalu diikuti oleh dialog konfirmasi eksplisit dari pengguna.

---

### 3.4.6 Responsivitas Tata Letak (_Responsiveness_)

**ID Requirement**: NFR-MONETA-006
**Deskripsi**: Sistem harus dapat digunakan dengan baik pada perangkat desktop maupun perangkat seluler. Tata letak antarmuka harus beradaptasi secara mulus terhadap ukuran layar yang berbeda. Pada perangkat seluler, tata letak harus ringkas dan tidak memaksa pengguna melakukan _scroll_ berlebihan untuk mengakses informasi yang bersifat pasif.

---

### 3.4.7 Keamanan (_Security_)

**ID Requirement**: NFR-MONETA-007
**Deskripsi**: Sistem harus melindungi sesi pengguna dengan mekanisme penanda sesi (_session token_) yang sah. Kata sandi pengguna tidak boleh disimpan dalam bentuk teks biasa; sistem harus menyimpannya dalam bentuk _hash_ menggunakan algoritma yang aman. Akses ke seluruh data keuangan dan fitur aplikasi harus dibatasi hanya untuk pengguna yang telah terautentikasi.

---

### 3.4.8 Privasi Data (_Privacy_)

**ID Requirement**: NFR-MONETA-008
**Deskripsi**: Data keuangan milik seorang pengguna tidak boleh dapat diakses, dilihat, atau ditampilkan kepada pengguna lain. Seluruh proses analisis, rekomendasi, dan peringatan anggaran harus didasarkan semata-mata pada data pengguna yang sedang aktif, tanpa percampuran data lintas akun.

---

### 3.4.9 Kompatibilitas (_Compatibility_)

**ID Requirement**: NFR-MONETA-009
**Deskripsi**: Sistem harus dapat berjalan pada peramban modern yang mendukung teknologi Aplikasi Web Progresif (PWA), mencakup _Service Worker_, _IndexedDB_, _Cache API_, dan _Web Push API_. Fitur yang bergantung pada dukungan perangkat atau peramban tertentu—seperti instalasi PWA dan notifikasi perangkat—harus tetap berfungsi secara _graceful degradation_, sehingga fitur lain tidak terganggu apabila fitur tersebut tidak didukung.

---

### 3.4.10 Kemampuan Pemeliharaan (_Maintainability_)

**ID Requirement**: NFR-MONETA-010
**Deskripsi**: Seluruh komponen antarmuka yang dikembangkan harus mengikuti panduan desain yang telah ditetapkan dalam dokumen `docs/FRONTEND_UI_GUIDELINES.md`. Pola-pola antarmuka standar—seperti _action menu_ dengan ikon menu titik tiga, _bottom sheet_ pada perangkat seluler, _modal_ formulir, dan dialog konfirmasi hapus—harus diimplementasikan secara konsisten di seluruh halaman aplikasi menggunakan komponen yang telah tersedia.

---

### 3.4.11 Aksesibilitas (_Accessibility_)

**ID Requirement**: NFR-MONETA-011
**Deskripsi**: Seluruh elemen antarmuka yang bersifat interaktif harus memiliki label yang jelas dan dapat dibaca oleh teknologi bantu. Tombol yang hanya menampilkan ikon harus dilengkapi dengan atribut `aria-label` yang deskriptif. Seluruh aksi penting—termasuk menambah, mengubah, dan menghapus data—harus dapat diakses melalui interaksi yang setara pada perangkat desktop maupun perangkat seluler.

---

### 3.4.12 Integritas Data (_Data Integrity_)

**ID Requirement**: NFR-MONETA-012
**Deskripsi**: Sistem harus menjaga integritas data selama seluruh siklus pengelolaan data, termasuk saat penghapusan, sinkronisasi, dan resolusi konflik. Penghapusan data yang telah tersinkronisasi harus dilakukan secara logis (_soft delete_) untuk menjaga konsistensi riwayat dan mencegah kerusakan relasi antar data. Sistem harus memastikan bahwa data yang ditarik dari server tidak secara keliru masuk ke dalam antrean sinkronisasi lokal, untuk mencegah terjadinya _loop_ sinkronisasi.

---

## 3.5 Pemetaan NFR ke Atribut Kualitas

Tabel berikut memetakan setiap kebutuhan non-fungsional ke atribut kualitas sistem yang relevan untuk memudahkan pengujian dan verifikasi.

| ID Requirement | Atribut Kualitas         | Area Terkait                                                               |
| -------------- | ------------------------ | -------------------------------------------------------------------------- |
| NFR-MONETA-001 | Performa                 | Operasi lokal, pembaruan antarmuka, waktu respons                          |
| NFR-MONETA-002 | Keandalan                | Persistensi data lokal, antrean sinkronisasi, kondisi luring               |
| NFR-MONETA-003 | Ketersediaan Saat Luring | Mode _offline_, _Service Worker_, _Cache API_, penyimpanan lokal           |
| NFR-MONETA-004 | Keandalan Sinkronisasi   | Antrean sinkronisasi, resolusi konflik, indikator status sinkronisasi      |
| NFR-MONETA-005 | Kemudahan Penggunaan     | Konsistensi pola aksi, konfirmasi hapus, aksesibilitas aksi                |
| NFR-MONETA-006 | Responsivitas Tata Letak | Tata letak adaptif, navigasi mobile, tata letak desktop                    |
| NFR-MONETA-007 | Keamanan                 | Autentikasi, _hashing_ kata sandi, kontrol akses berbasis sesi             |
| NFR-MONETA-008 | Privasi Data             | Isolasi data per pengguna, analisis berbasis data lokal                    |
| NFR-MONETA-009 | Kompatibilitas           | PWA, _Service Worker_, _IndexedDB_, _Web Push API_, _graceful degradation_ |
| NFR-MONETA-010 | Kemampuan Pemeliharaan   | Panduan UI, komponen bersama, konsistensi pola antarmuka                   |
| NFR-MONETA-011 | Aksesibilitas            | Label elemen interaktif, `aria-label`, aksesibilitas lintas perangkat      |
| NFR-MONETA-012 | Integritas Data          | _Soft delete_, resolusi konflik sinkronisasi, pencegahan _sync loop_       |
