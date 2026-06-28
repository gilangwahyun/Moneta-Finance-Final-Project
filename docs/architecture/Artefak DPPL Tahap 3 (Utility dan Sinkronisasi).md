# Dokumen Rincian Class DPPL - Tahap 3

## Bagian 1 — Catatan Perapian Diksi
Sebelumnya, telah dilakukan perapian diksi pada artefak pemetaan *package* dan rincian kelas tahap awal agar lebih formal, teknis, dan objektif. Istilah metaforis seperti "mengunci keamanan kategori", "regulasi anggaran", "komitmen masuknya kas", "injeksi kuota", dan "mematikan pantauan target secara sepihak" telah diubah menjadi istilah rekayasa perangkat lunak standar seperti "menetapkan batas pengeluaran", "mengelola anggaran", "pencatatan rencana pemasukan", "ditambahkan pada anggaran", dan "menghapus pemantauan target".

---

## Bagian 2 — Rincian Utility & Service Class

### 1. Class `PenghitungRitmeAnggaran`
**Deskripsi:** Class `PenghitungRitmeAnggaran` merupakan *Utility Class* (stateless) yang bertanggung jawab menghitung ritme penggunaan anggaran berdasarkan batas anggaran bulanan, jumlah pengeluaran aktual, dan tanggal evaluasi. Hasil kalkulasinya (seperti *Budget Rhythm*) digunakan semata-mata untuk pelaporan antarmuka sisi klien dan tidak disimpan ke dalam basis data.

**Deskripsi atribut class:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| - | - | Class ini tidak memiliki atribut utama karena berfungsi sebagai *utility/service stateless*. Seluruh parameter dilewatkan melalui argumen fungsi. |

**Deskripsi fungsi pada class:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `hitungRitmeAnggaran()` | `limit` (Number), `spent` (Number), `period` (String) | Object | Mengompilasi seluruh hasil analisis batas harian, sisa anggaran, dan proyeksi akhir bulan ke dalam satu struktur laporan ritme anggaran. |
| `hitungBatasIdealHarian()` | `limit` (Number), `daysInMonth` (Number) | Number | Menghitung porsi nominal yang diizinkan untuk dikeluarkan setiap hari secara merata. |
| `hitungBatasIdealSampaiHariIni()` | `dailyLimit` (Number), `currentDay` (Number) | Number | Menghitung total alokasi yang seharusnya maksimal dikeluarkan sejak awal bulan hingga tanggal evaluasi. |
| `hitungProyeksiAkhirBulan()` | `spent` (Number), `currentDay` (Number), `daysInMonth` (Number) | Number | Menghitung estimasi total pengeluaran di akhir bulan jika ritme pengeluaran harian pengguna terus dipertahankan. |
| `tentukanStatusRitme()` | `spent` (Number), `idealUntilToday` (Number) | Enum/String | Mengevaluasi dan mengembalikan status ritme pengeluaran: *SAFE* (aman), *WARNING* (mendekati batas), atau *DANGER* (melebihi batas ideal). |

---

### 2. Class `PenghitungProgressTarget`
**Deskripsi:** Class `PenghitungProgressTarget` merupakan *Utility Class* (stateless) yang bertugas menghitung progres pencapaian `TargetFinansial` berbasis nilai akumulasi dari `Transaksi` bertipe `INCOME` yang terikat pada kategori maupun periode target terkait. Transaksi `EXPENSE` dan `TRANSFER` tidak dilibatkan dalam kalkulasi progres kelas ini.

**Deskripsi atribut class:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| - | - | Class ini tidak memiliki atribut utama karena berfungsi sebagai *utility/service stateless*. |

**Deskripsi fungsi pada class:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `hitungProgressTarget()` | `target` (TargetFinansial), `transactions` (Array<Transaksi>) | Object | Memanggil sub-fungsi untuk menghasilkan rekap menyeluruh pencapaian sasaran pemasukan. |
| `hitungTotalPemasukanTarget()` | `target` (TargetFinansial), `transactions` (Array<Transaksi>) | Number | Menjumlahkan seluruh nominal transaksi bertipe `INCOME` yang periode dan kategorinya relevan dengan kriteria target. |
| `hitungPersentasePencapaian()` | `totalPemasukan` (Number), `targetAmount` (Number) | Number | Menghitung persentase rasio keberhasilan pencapaian terhadap nominal target akhir. |
| `hitungSisaTarget()` | `targetAmount` (Number), `totalPemasukan` (Number) | Number | Mengevaluasi defisit dana yang masih harus dipenuhi pengguna untuk menyelesaikan target. |
| `tentukanStatusTarget()` | `persentase` (Number) | String | Mengonversi angka kemajuan menjadi klasifikasi status (misal: *Belum Tercapai*, *Tercapai*). |

---

### 3. Class `ManajerSinkronisasi`
**Deskripsi:** Class `ManajerSinkronisasi` adalah *Control/Service Class* yang mengorkestrasi alur utama sinkronisasi asinkron antara data *IndexedDB* (lokal) dan *Server API* (jarak jauh). Class ini menangani eksekusi *push sync*, *pull sync*, serta menerapkan prinsip *progressive remote apply* (per entitas) tanpa memasukkan pembaruan dari server ke dalam antrean unggah (`sync_queue`) lokal.

**Deskripsi atribut class:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `isSyncing` | Boolean | Indikator status apakah sebuah proses *push* atau *pull* sedang berjalan untuk mencegah tumpang tindih eksekusi sinkronisasi ganda. |
| `lastSyncTime` | DateTime | Merekam penanda waktu keberhasilan sinkronisasi massal terakhir untuk acuan batas delta penarikan data (`pull`). |

**Deskripsi fungsi pada class:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `lakukanSinkronisasiPenuh()` | - | Void | Menjalankan siklus komprehensif yang memicu fungsi *push* lalu dilanjutkan dengan *pull* data secara berurutan. |
| `pushPerubahan()` | - | Boolean | Mengirim susunan data dalam `DALAntreanSinkronisasi` secara massal menuju antarmuka server. Mengembalikan status keberhasilan transmisi. |
| `pullPembaruan()` | `lastSyncTime` (DateTime) | Object | Meminta catatan data yang berubah (*delta*) dari antarmuka server semenjak waktu sinkronisasi terakhir. |
| `terapkanDataServer()` | Data pembaruan *server* | Void | Menerapkan (*apply*) setiap *record* rekonsiliasi yang diterima dari server langsung ke dalam *IndexedDB* secara progresif, serta melewati kelas `PenyelesaiKonflik` bila ditemukan anomali versi waktu. |
| `terapkanDataPerEntitas()`| Data entitas tunggal | Void | Modul pemecah blok data *pull* yang memperbarui repositori per entitas guna memicu render antarmuka pengguna secara bertahap (*progressive remote apply*). |
| `perbaruiWaktuSinkronisasiTerakhir()`| `timestamp` (DateTime) | Void | Menyimpan penanda waktu terkini setelah rute *pull* selesai agar sinkronisasi berikutnya menjadi lebih ringan. |

---

### 4. Class `PengaturAntreanSinkronisasi`
**Deskripsi:** Class `PengaturAntreanSinkronisasi` bertindak sebagai *Control/Service Class* yang bertanggung jawab mengelola perilaku alur penumpukan perubahan luring. Fungsinya berfokus pada mekanisme *scheduling* (penjadwalan waktu jeda /*debounce*), percobaan ulang otomatis (*retry*), serta memicu pendorongan antrean (*drain*). Class ini terpisah dan tidak berfungsi membaca/menulis tabel secara langsung, fungsi repositorinya ditangani khusus oleh `DALAntreanSinkronisasi`.

**Deskripsi atribut class:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `maxRetryAttempts` | Number | Konstanta batasan jumlah maksimal percobaan kembali pengiriman *payload* yang gagal jaringan. |
| `syncInterval` | Number | Jeda waktu statis penjadwalan sinkronisasi berkala di latar belakang (misal: setiap 5 menit). |

**Deskripsi fungsi pada class:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `jadwalkanSinkronisasi()` | - | Void | Memanggil pemicu *debounced* untuk menyatukan panggilan perubahan lokal ganda menjadi satu pendorongan eksekusi di waktu tunggu yang telah disepakati. |
| `paksaSinkronisasi()` | - | Void | Membatalkan semua batas tunggu jeda dan memaksa orkestrasi `ManajerSinkronisasi` berjalan secara instan (umumnya karena pemicu manual pengguna). |
| `mulaiSinkronisasiBerkala()` | - | Void | Menjalankan pengulangan *timer* latar belakang (*background worker*) untuk merutinkan _pull sync_ saat aplikasi aktif. |
| `prosesAntreanDenganRetry()`| - | Void | Memerintahkan pendorongan (*drain*) perubahan *Data Access* ke server sekaligus mencatat siklus kegagalan bila transmisi terputus di jalan. |
| `tanganiKegagalanSinkronisasi()`| Galat Jaringan | Void | Melakukan inkrementasi skor *retry* pada antrean, mencatatkan galat teknis di entitas terkait, dan menyusun pemberitahuan batas waktu tunggu tambahan (*back-off*). |

---

### 5. Class `PenyelesaiKonflik`
**Deskripsi:** Class `PenyelesaiKonflik` merupakan *Utility Class* spesifik yang bertugas menentukan dan memenangkan versi rekaman data paling relevan manakala terjadi tumbukan (_conflict_) pada riwayat lokal versus *cloud* server. Strategi penyelesaian konflik diimplementasikan secara teguh menggunakan algoritma evaluasi parameter waktu *Last-Write-Wins* (LWW) berbasis nilai `updatedAt`.

**Deskripsi atribut class:**
| Nama atribut | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| - | - | Class ini tidak memiliki atribut utama karena berfungsi sebagai *utility/service stateless*. |

**Deskripsi fungsi pada class:**
| Fungsi | Input | Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| `selesaikanKonflik()` | `localRecord` (Object), `serverRecord` (Object) | Object | Menerima dua sumber entitas data dengan ID klien yang identik, dan mendistribusikannya pada fungsi perbandingan untuk memperoleh data final yang valid. |
| `bandingkanWaktuPembaruan()` | `localTime` (DateTime), `serverTime` (DateTime)| Number | Menganalisis selisih nilai absolut matriks parameter waktu (*updatedAt*) dari format kalender standar antar rekaman. |
| `pilihVersiTerbaru()` | `localRecord`, `serverRecord` | Object | Mengaplikasikan logika *Last-Write-Wins*: Jika `updatedAt` lokal lebih baru daripada server, kembalikan versi lokal, dan sebaliknya (menerapkan prioritas mutlak yang objektif). |

---

## Bagian 3 — Rekomendasi Tahap Berikutnya
Infrastruktur dan fungsionalitas inti sisi *Business Logic* beserta alat utilitas *Offline-First* klien telah dijabarkan sepenuhnya. Rekomendasi langkah penyusunan tahap final untuk DPPL ini adalah merinci spesifikasi **Data Access Layer**. Rincian tahap selanjutnya difokuskan pada:
1. `DALTransaksiLokal`, `DALAnggaranLokal`, dan entitas luring IndexedDB terkait.
2. `DALAntreanSinkronisasi` sebagai penyimpanan *payload* transit _push sync_.
3. Penjelasan fungsional ringkas dan *endpoints* untuk `DALServerSinkronisasi`.
