# Moneta Glossary

This document defines the core terminology used across the Moneta architecture to ensure alignment among developers and AI assistants.

- **Hydration**: The initial data load process. When a user logs in (or resets local data), the app pulls historical records from the server and populates the local DB. It relies on a bounded history window (e.g., 3 months).
- **Pull Sync**: The process of fetching delta updates (changes made on other devices since `lastSyncedAt`) from the server and merging them into the local DB.
- **Push Sync**: The process of batching local offline mutations from the `sync_queue` and sending them to the server API to be permanently stored.
- **sync_queue**: A local IndexedDB store that acts as a sequential ledger of user mutations (CREATE, UPDATE, DELETE). The Sync Manager processes this queue to execute Push Syncs.
- **Local Mutation**: A user action (e.g., creating a transaction) that updates the local DB and is immediately added to the `sync_queue` to await pushing.
- **Remote Apply**: The act of taking data received from the server (via Pull Sync or Hydration) and writing it to the local DB _without_ adding it to the `sync_queue`.
- **IndexedDB Working Copy**: The local, offline-capable database that serves as the immediate source of truth for the React UI. The UI reads ONLY from this copy.
- **notification_settings**: The user's preferences for alerts (e.g., enable/disable, instant vs batch delivery). Stored locally in IDB and synced to the server.
- **notification_logs**: The actual historical records of generated alerts (e.g., "Budget Exceeded"). Synced across devices so the user sees a consistent inbox history.
- **Financial Target / Target Finansial**: A user-defined financial goal focused on income achievement (Target Pemasukan) that operates independently of strict budgets and is evaluated in real-time on the device using IndexedDB without storing a hardcoded current balance. Unlike Budgets (Anggaran) which limit expenses, Financial Targets are specifically for tracking positive cash flows.
- **notification_subscriptions**: Device-specific web-push tokens mapped to the user. These are never hydrated across devices because a browser token is unique to that specific hardware/browser installation.
- **In-App Notification**: A visual alert rendered purely within the Moneta React UI (e.g., via sonner toasts or an inbox dropdown).
- **System Notification**: A native OS-level notification fired via the browser's Service Worker (`showNotification()`).
- **Server Web Push**: A notification triggered externally by a server-side CRON job or digest script, reaching the user even when the PWA is closed.
- **Nudge**: A gentle notification recommending a positive action or informing the user of general status without implying danger.
- **Recommendation**: Analytical insights served to the user based on spending patterns, designed to improve financial health.
- **clientId**: A robust UUID generated entirely on the client during a local mutation. It serves as the primary anchor for syncing records between IndexedDB and PostgreSQL.
- **serverId**: The internal PostgreSQL ID. It serves as the primary database identifier, though the system heavily relies on `clientId` for offline sync logic.
- **dedupeKey**: A deterministic string (e.g., `BUDGET_USAGE:userId:budgetId:YYYY-MM:WARNING`) used to prevent the system from firing duplicate notification logs for the same recurring event threshold.
- **syncStatus**: An enum field on records (`PENDING`, `SYNCED`, `CONFLICT`) indicating whether a local record has been successfully acknowledged by the server. Deletions are handled via a `deletedAt` timestamp flag rather than a dedicated deletion status.
- **Insight Engine**: A local rule-based system (`nudging.ts` and `local-engine.ts`) that analyzes user data to detect financial anomalies and generate nudges without server processing.
- **Insight Fatigue**: Cognitive overload caused by displaying too many analytical alerts at once, mitigated by weighted sorting and collapsible UI limits.

## Frontend UI/UX Terminology

- **Action Menu**: A compact menu that displays secondary actions such as Edit and Delete on a data item.
- **Bottom Sheet**: An action panel that slides up from the bottom of the screen on mobile devices.
- **Delete Confirmation**: A warning dialog requiring explicit user confirmation before deleting important data.
- **Compact Summary Card**: A compact card on mobile interfaces that displays passive information without taking up much vertical space.
- **Empty State**: A specialized visual state when a list or page has no data to display, often accompanied by instructions to create the first piece of data.
- **Sync Status**: A visual indicator in the UI that informs the user whether local changes are pending, syncing, successfully synced, or failed.
- **Offline-first UI**: An interface designed to respond to user actions instantly with local data, without waiting for a connection or server response.
- **Popover**: A floating menu box in the desktop version that appears near a trigger button.
- **Portal Overlay**: A rendering technique for overlay components (like popovers or modals) outside the parent element structure so they are not clipped by containers with overflow boundaries.
- **Responsive Layout**: Interface design that adapts smoothly from a wide view on desktop (e.g., with a sidebar) to a compact view on mobile devices (e.g., with bottom navigation).

---

# Glosarium Moneta (Versi Bahasa Indonesia)

Dokumen ini mendefinisikan terminologi inti yang digunakan di seluruh arsitektur Moneta untuk menyamakan pemahaman antara pengembang dan asisten AI.

- **Hidrasi (Hydration)**: Proses pemuatan data awal. Saat pengguna masuk (login) atau mereset data lokal, aplikasi menarik riwayat data dari server dan memasukkannya ke *database* lokal (IndexedDB). Proses ini biasanya dibatasi oleh jendela waktu tertentu (misalnya, 3 bulan terakhir).
- **Sinkronisasi Pull (Pull Sync)**: Proses mengambil pembaruan data yang berubah (delta) dari server yang dilakukan di perangkat lain sejak sinkronisasi terakhir (`lastSyncedAt`), lalu menggabungkannya ke dalam *database* lokal.
- **Sinkronisasi Push (Push Sync)**: Proses mengelompokkan (batch) semua mutasi data lokal yang sedang menunggu di `sync_queue`, untuk kemudian dikirim ke API server agar disimpan secara permanen.
- **sync_queue**: Penyimpanan IndexedDB lokal yang bertindak sebagai buku besar berurutan untuk mencatat setiap mutasi data dari pengguna (CREATE, UPDATE, DELETE). Manajer Sinkronisasi (Sync Manager) membaca antrean ini saat menjalankan Sinkronisasi Push.
- **Mutasi Lokal (Local Mutation)**: Aksi pengguna (seperti membuat transaksi baru) yang langsung memperbarui *database* lokal dan seketika ditambahkan ke `sync_queue` untuk menunggu dikirim (push) ke server.
- **Penerapan Jarak Jauh (Remote Apply)**: Tindakan menerima data dari server (melalui Sinkronisasi Pull atau Hidrasi) dan menuliskannya ke *database* lokal *tanpa* memasukkannya ke `sync_queue`.
- **Salinan Kerja IndexedDB (IndexedDB Working Copy)**: *database* lokal berkemampuan luring (offline) yang bertindak sebagai sumber kebenaran (source of truth) instan bagi antarmuka React UI. UI HANYA membaca data dari salinan ini.
- **notification_settings**: Preferensi pengaturan peringatan bagi pengguna (contoh: aktif/nonaktif, pengiriman langsung vs rangkuman/batch). Disimpan secara lokal di IDB dan disinkronkan ke server.
- **notification_logs**: Rekaman riwayat dari setiap peringatan yang pernah dihasilkan sistem (contoh: "Anggaran Terlampaui"). Disinkronkan antarperangkat agar pengguna melihat kotak masuk notifikasi yang konsisten.
- **Target Finansial (Financial Target)**: Tujuan keuangan buatan pengguna yang difokuskan pada pencapaian pemasukan. Ini beroperasi terpisah dari anggaran ketat, dan dievaluasi secara *real-time* di perangkat menggunakan IndexedDB tanpa harus menyimpan total saldo di dalam *database*. Berbeda dengan Anggaran (Budget) yang membatasi pengeluaran, Target Finansial digunakan khusus untuk memantau aliran dana masuk.
- **notification_subscriptions**: Token web-push spesifik-perangkat yang ditautkan ke pengguna. Data ini tidak pernah dihidrasi antarperangkat, karena token *browser* sangat unik pada instalasi peramban/perangkat keras tersebut.
- **Notifikasi Dalam-Aplikasi (In-App Notification)**: Peringatan visual yang dirender di dalam antarmuka UI React Moneta (contoh: *toast* atau kotak masuk pop-up).
- **Notifikasi Sistem (System Notification)**: Notifikasi *push* asli dari sistem operasi (OS) yang dipicu melalui fungsi `showNotification()` pada Service Worker browser.
- **Server Web Push**: Notifikasi *push* yang dipicu dari luar aplikasi oleh tugas terjadwal (CRON) atau skrip rangkuman di sisi server, yang mampu menjangkau pengguna meski aplikasi PWA sedang ditutup.
- **Nudge (Dorongan Halus)**: Notifikasi yang menyarankan tindakan positif atau sekadar menginformasikan status umum kepada pengguna tanpa menyiratkan bahaya kritis.
- **Rekomendasi (Recommendation)**: Wawasan (insight) analitis yang disajikan kepada pengguna berdasarkan pola pengeluaran mereka, dirancang untuk meningkatkan kesehatan finansial.
- **clientId**: UUID tangguh yang dihasilkan di klien saat terjadi mutasi lokal. Berfungsi sebagai kunci penanda utama saat menyinkronkan data antara IndexedDB dan PostgreSQL.
- **serverId**: Pengidentifikasi internal pada PostgreSQL. Berfungsi sebagai ID utama di *database* server, namun sistem lebih mengandalkan `clientId` untuk logika sinkronisasi *offline*.
- **dedupeKey**: *String* deterministik (misalnya, `BUDGET_USAGE:userId:budgetId:YYYY-MM:WARNING`) yang digunakan untuk mencegah sistem memicu log notifikasi ganda untuk kejadian ambang batas yang sama.
- **syncStatus**: Kolom berjenis *enum* pada data (`PENDING`, `SYNCED`, `CONFLICT`) yang menandakan apakah data lokal telah sukses diakui oleh server. Penghapusan data ditangani melalui *timestamp* `deletedAt` (*soft delete*), bukan status sinkronisasi penghapusan.
- **Mesin Insight (Insight Engine)**: Sistem berbasis aturan lokal (`nudging.ts` dan `local-engine.ts`) yang menganalisis data pengguna untuk menemukan anomali finansial dan membuat dorongan tanpa membutuhkan pemrosesan server.
- **Insight Fatigue (Kelelahan Wawasan)**: Beban kognitif yang disebabkan oleh terlalu banyaknya peringatan analitis yang muncul di layar, dicegah dengan sistem penyortiran prioritas berbobot dan pembatasan UI.

## Terminologi Frontend UI/UX

- **Menu Aksi (Action Menu)**: Menu ringkas yang menampilkan tindakan sekunder seperti Edit dan Hapus pada sebuah data.
- **Bottom Sheet (Panel Bawah)**: Panel aksi yang muncul bergeser dari bawah layar, khusus untuk tata letak pada perangkat seluler.
- **Konfirmasi Penghapusan (Delete Confirmation)**: Dialog peringatan yang mewajibkan konfirmasi eksplisit dari pengguna sebelum menghapus data penting.
- **Kartu Ringkasan Padat (Compact Summary Card)**: Kartu ringkas pada antarmuka seluler yang menyajikan info pasif tanpa memakan terlalu banyak ruang vertikal.
- **Empty State (Status Kosong)**: Tampilan visual khusus ketika sebuah daftar belum memiliki data, yang umumnya disertai petunjuk aksi untuk membuat data pertama.
- **Status Sinkronisasi (Sync Status)**: Indikator visual di antarmuka yang memberi tahu pengguna apakah perubahan lokal sedang menunggu, sedang diproses, berhasil disinkronkan, atau gagal.
- **Offline-first UI (Antarmuka Luring Utama)**: Antarmuka yang dirancang merespons tindakan pengguna secara instan menggunakan data lokal, tanpa menunggu koneksi atau respons dari server.
- **Popover**: Kotak menu melayang di versi *desktop* yang biasanya muncul di dekat elemen pemicunya.
- **Portal Overlay**: Teknik rendering komponen *overlay* (seperti *popover* atau *modal*) di luar hierarki struktur induknya, agar tidak terpotong (clipped) oleh batasan kontainer.
- **Responsive Layout (Tata Letak Responsif)**: Desain antarmuka yang beradaptasi dengan mulus dari tampilan lebar pada *desktop* (misalnya menggunakan *sidebar*) menuju tampilan padat di seluler (menggunakan navigasi bawah).
