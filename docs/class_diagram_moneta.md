# Class Diagram per Package — Moneta Finance (Revisi Final)

> **Prinsip Desain yang Diterapkan:**
> 1. Setiap package merepresentasikan **satu user story / fungsi besar** dengan tiga lapisan BCE: `<<boundary>>`, `<<control>>`, `<<entity>>`
> 2. Kelas yang berasal dari package lain ditampilkan hanya sebagai **referensi eksternal** berupa `<<stereotype>> NamaKelas` — tanpa atribut maupun metode — untuk menghindari redundansi dan menjaga keterbacaan diagram
> 3. Package **infrastruktur** (Akses Data Lokal & Server) merupakan pengecualian karena tidak punya user story langsung

---

## Legenda

| Notasi Relasi | Makna |
|---|---|
| `A --> B` | Association — A memiliki referensi ke B |
| `A *-- B` | Aggregation — A memiliki/mengelola koleksi B |
| `A ..> B` | Dependency `<<uses>>` — A bergantung pada B |
| `"1"`, `"1..*"`, `"0..1"` | Multiplisitas pada ujung relasi |

---

## Package 1 — Autentikasi

**User Story:** Pengguna dapat mendaftar, masuk, keluar, memulihkan sesi, memperbarui profil, dan menavigasi aplikasi.

> **Catatan penempatan:** `HalamanBeranda` dan `NavigasiGlobal` ditempatkan di sini karena keduanya diinisialisasi langsung setelah autentikasi berhasil — `NavigasiGlobal` menampilkan `userProfile` dari `KelolaAutentikasi`, dan `HalamanBeranda` adalah halaman pertama yang ditampilkan pasca login.

```mermaid
classDiagram
    %% ── BOUNDARY ──
    class HalamanLogin {
        <<boundary>>
        +Boolean isLoading
        +String error
        +renderData() Void
        +handleSubmit(emailOrUsername String, password String) Void
    }

    class HalamanRegistrasi {
        <<boundary>>
        +Boolean isLoading
        +String error
        +renderData() Void
        +handleSubmit(email String, username String, password String, confirmPassword String) Void
    }

    class NavigasiGlobal {
        <<boundary>>
        +String activePath
        +Boolean isCollapsed
        +String syncStatus
        +Object userProfile
        +handleNavigation(path String) Void
        +handleToggleNavigation() Void
        +handleQuickAddTransaction() Void
        +renderSyncStatus() Void
    }

    class HalamanBeranda {
        <<boundary>>
        +Boolean isLoading
        +String error
        +Object displayData
        +renderData() Void
        +handleRefresh() Void
    }

    class HalamanProfil {
        <<boundary>>
        +Object userProfile
        +renderData() Void
        +handleNavigateToSettings(path String) Void
        +handleForceSync() Void
        +handleClearLocalCache() Void
        +handleExportXlsx() Void
        +handleLogout() Void
    }

    %% ── CONTROL ──
    class KelolaAutentikasi {
        <<control>>
        +Pengguna currentUser
        +Boolean isAuthenticated
        +Boolean isLoading
        +String error
        +login(emailOrUsername String, password String) Pengguna
        +register(email String, username String, password String) Pengguna
        +logout() Void
        +validateSession(userId String) Boolean
        +recoverLocalSession() Pengguna
        +updateUserStatus(userId String, name String, email String) Pengguna
    }

    %% ── ENTITY ──
    class Pengguna {
        <<entity>>
        +String id
        +String email
        +String name
        +Boolean hasSession
        +Pengguna()
        +isLoggedIn() Boolean
    }

    %% ── REFERENSI EKSTERNAL ──
    class DALServerAutentikasi {
        <<gateway>>
    }
    class DALSesiPenggunaLokal {
        <<repository>>
    }
    class ManajerSinkronisasi {
        <<control>>
    }
    class DALServerEkspor {
        <<gateway>>
    }

    %% ── RELASI INTERNAL ──
    HalamanLogin ..> KelolaAutentikasi : <<uses>>
    HalamanRegistrasi ..> KelolaAutentikasi : <<uses>>
    HalamanProfil ..> KelolaAutentikasi : <<uses>>
    HalamanProfil ..> ManajerSinkronisasi : <<uses>>
    HalamanProfil ..> DALServerEkspor : <<uses>>
    NavigasiGlobal ..> KelolaAutentikasi : <<uses>>
    HalamanBeranda ..> KelolaAutentikasi : <<uses>>
    KelolaAutentikasi "1" --> "0..1" Pengguna : currentUser

    %% ── RELASI KE EKSTERNAL ──
    KelolaAutentikasi ..> DALServerAutentikasi : <<uses>>
    KelolaAutentikasi ..> DALSesiPenggunaLokal : <<uses>>
```

---

## Package 2 — Kelola Kategori

**User Story:** Pengguna dapat menambah, mengubah, dan menghapus kategori transaksi beserta ikon dan warna representasinya.

```mermaid
classDiagram
    %% ── BOUNDARY ──
    class HalamanKategori {
        <<boundary>>
        +Boolean isLoading
        +Array~Kategori~ categoriesList
        +renderData() Void
        +handleOpenActionMenu(id String) Void
        +handleOpenEditForm(id String) Void
        +handleDeleteRequest(id String) Void
        +handleConfirmDelete(id String) Void
        +handleCloseForm() Void
    }

    %% ── CONTROL ──
    class KelolaKategori {
        <<control>>
        +Array~Kategori~ categories
        +Boolean isLoading
        +String error
        +loadCategories(userId String) Array~Kategori~
        +addCategory(userId String, name String, type String, icon String, color String) Kategori
        +editCategory(clientId String, name String, type String, icon String, color String) Kategori
        +deleteCategory(clientId String) Boolean
        +enqueueCategorySync(clientId String) Void
    }

    %% ── ENTITY ──
    class Kategori {
        <<entity>>
        +String clientId
        +String userId
        +String name
        +String type
        +String color
        +String icon
        +String syncStatus
        +DateTime updatedAt
        +DateTime deletedAt
        +Kategori()
        +isIncome() Boolean
        +isExpense() Boolean
        +isDeleted() Boolean
    }

    %% ── REFERENSI EKSTERNAL ──
    class DALKategoriLokal {
        <<repository>>
    }
    class DALAntreanSinkronisasiLokal {
        <<repository>>
    }

    %% ── RELASI INTERNAL ──
    HalamanKategori ..> KelolaKategori : <<uses>>
    KelolaKategori "1" *-- "1..*" Kategori : mengelola

    %% ── RELASI KE EKSTERNAL ──
    KelolaKategori ..> DALKategoriLokal : <<uses>>
    KelolaKategori ..> DALAntreanSinkronisasiLokal : <<uses>>
```

---

## Package 3 — Kelola Dompet

**User Story:** Pengguna dapat menambah, mengubah, dan menghapus sumber dana (dompet), serta melihat saldo berjalan dan mencatat transfer antar dompet.

```mermaid
classDiagram
    %% ── BOUNDARY ──
    class HalamanDompet {
        <<boundary>>
        +Boolean isLoading
        +Array~Dompet~ walletsList
        +renderData() Void
        +handleOpenActionMenu(id String) Void
        +handleOpenEditForm(id String) Void
        +handleOpenTransferForm() Void
        +handleDeleteRequest(id String) Void
        +handleConfirmDelete(id String) Void
        +handleCloseForm() Void
    }

    %% ── CONTROL ──
    class KelolaDompet {
        <<control>>
        +Array~Dompet~ wallets
        +Number totalBalance
        +Boolean isLoading
        +String error
        +loadWallets(userId String) Array~Dompet~
        +addWallet(userId String, name String, type String, initialBalance Number) Dompet
        +editWallet(clientId String, name String, type String, initialBalance Number) Dompet
        +deleteWallet(clientId String) Boolean
        +calculateFinalBalance(walletId String, transactions Array~Transaksi~) Number
        +enqueueWalletSync(clientId String) Void
    }

    %% ── ENTITY ──
    class Dompet {
        <<entity>>
        +String clientId
        +String userId
        +String name
        +String type
        +Number initialBalance
        +String syncStatus
        +DateTime updatedAt
        +DateTime deletedAt
        +Dompet()
        +hasBalance() Boolean
        +isDeleted() Boolean
    }

    %% ── REFERENSI EKSTERNAL ──
    class Transaksi {
        <<entity>>
    }
    class DALDompetLokal {
        <<repository>>
    }
    class DALTransaksiLokal {
        <<repository>>
    }
    class DALAntreanSinkronisasiLokal {
        <<repository>>
    }

    %% ── RELASI INTERNAL ──
    HalamanDompet ..> KelolaDompet : <<uses>>
    KelolaDompet "1" *-- "1..*" Dompet : mengelola
    KelolaDompet ..> Transaksi : uses (kalkulasi saldo)

    %% ── RELASI KE EKSTERNAL ──
    KelolaDompet ..> DALDompetLokal : <<uses>>
    KelolaDompet ..> DALTransaksiLokal : <<uses>>
    KelolaDompet ..> DALAntreanSinkronisasiLokal : <<uses>>
```

---

## Package 4 — Kelola Transaksi

**User Story:** Pengguna dapat mencatat, mengubah, dan menghapus transaksi keuangan (pemasukan, pengeluaran, dan transfer antar dompet).

```mermaid
classDiagram
    %% ── BOUNDARY ──
    class HalamanTransaksi {
        <<boundary>>
        +Boolean isLoading
        +Object selectedFilter
        +Array~Transaksi~ transactionsList
        +renderData() Void
        +handleFilterChange(filter Object) Void
        +handleOpenActionMenu(id String) Void
        +handleOpenEditForm(id String) Void
        +handleDeleteRequest(id String) Void
        +handleConfirmDelete(id String) Void
        +handleCloseForm() Void
    }

    %% ── CONTROL ──
    class KelolaTransaksi {
        <<control>>
        +Array~Transaksi~ transactions
        +Object monthlyTotals
        +Boolean isLoading
        +String error
        +loadTransactions(userId String, period String, type String, categoryId String, walletId String) Array~Transaksi~
        +addTransaction(userId String, walletId String, targetWalletId String, categoryId String, type String, amount Number, note String, description String, date String) Transaksi
        +editTransaction(clientId String, walletId String, targetWalletId String, categoryId String, type String, amount Number, note String, description String, date String) Transaksi
        +deleteTransaction(clientId String) Boolean
        +enqueueTransactionSync(clientId String) Void
    }

    %% ── ENTITY ──
    class Transaksi {
        <<entity>>
        +String clientId
        +String id
        +String userId
        +String walletId
        +String targetWalletId
        +String categoryId
        +String type
        +Number amount
        +String note
        +String description
        +String date
        +String syncStatus
        +DateTime createdAt
        +DateTime updatedAt
        +DateTime deletedAt
        +Transaksi()
        +isIncome() Boolean
        +isExpense() Boolean
        +isTransfer() Boolean
        +isDeleted() Boolean
    }

    %% ── REFERENSI EKSTERNAL ──
    class Dompet {
        <<entity>>
    }
    class Kategori {
        <<entity>>
    }
    class DALTransaksiLokal {
        <<repository>>
    }
    class DALAntreanSinkronisasiLokal {
        <<repository>>
    }

    %% ── RELASI INTERNAL ──
    HalamanTransaksi ..> KelolaTransaksi : <<uses>>
    KelolaTransaksi "1" *-- "1..*" Transaksi : mengelola

    %% ── RELASI KE EKSTERNAL (FK reference) ──
    Transaksi "0..*" --> "0..1" Dompet : walletId / targetWalletId
    Transaksi "0..*" --> "0..1" Kategori : categoryId
    KelolaTransaksi ..> DALTransaksiLokal : <<uses>>
    KelolaTransaksi ..> DALAntreanSinkronisasiLokal : <<uses>>
```

---

## Package 5 — Kelola Anggaran

**User Story:** Pengguna dapat menetapkan batas pagu pengeluaran bulanan per kategori, memantau serapannya, dan melakukan realokasi anggaran antar kategori (subsidi silang).

```mermaid
classDiagram
    %% ── BOUNDARY ──
    class HalamanAnggaran {
        <<boundary>>
        +Boolean isLoading
        +Array~RingkasanAnggaran~ budgetData
        +String selectedPeriod
        +renderData() Void
        +handlePeriodChange(period String) Void
        +handleStatusFilterChange(status String) Void
        +handleOpenReallocation(id String) Void
        +handleOpenActionMenu(id String) Void
        +handleOpenEditForm(id String) Void
        +handleDeleteRequest(id String) Void
        +handleConfirmDelete(id String) Void
        +handleCloseForm() Void
    }

    %% ── CONTROL ──
    class KelolaAnggaran {
        <<control>>
        +Array~Anggaran~ budgets
        +Array~RingkasanAnggaran~ budgetsWithStats
        +Boolean isLoading
        +String currentPeriod
        +loadBudgets(userId String, period String) Array~Anggaran~
        +addBudget(clientId String, userId String, categoryId String, amount Number, period String) Anggaran
        +editBudget(clientId String, userId String, categoryId String, amount Number, period String) Anggaran
        +deleteBudget(clientId String) Boolean
        +handleSubsidiSilang(sourceClientId String, destinationClientId String, amount Number) Void
        +enqueueBudgetSync(clientId String) Void
    }

    %% ── ENTITY ──
    class Anggaran {
        <<entity>>
        +String clientId
        +String id
        +String userId
        +String categoryId
        +Number amount
        +String period
        +String syncStatus
        +DateTime createdAt
        +DateTime updatedAt
        +DateTime deletedAt
        +Anggaran()
        +isActive() Boolean
        +isDeleted() Boolean
        +belongsToCategory(categoryId String) Boolean
        +isForPeriod(period String) Boolean
    }

    %% ── DTO ──
    class RingkasanAnggaran {
        <<DTO>>
        +Anggaran budget
        +Number spent
        +Number percentage
        +String status
    }

    %% ── REFERENSI EKSTERNAL ──
    class Kategori {
        <<entity>>
    }
    class DALAnggaranLokal {
        <<repository>>
    }
    class DALTransaksiLokal {
        <<repository>>
    }
    class DALAntreanSinkronisasiLokal {
        <<repository>>
    }

    %% ── RELASI INTERNAL ──
    HalamanAnggaran ..> KelolaAnggaran : <<uses>>
    KelolaAnggaran "1" *-- "1..*" Anggaran : mengelola
    KelolaAnggaran ..> RingkasanAnggaran : produces
    RingkasanAnggaran "1" --> "1" Anggaran : wraps

    %% ── RELASI KE EKSTERNAL ──
    Anggaran "0..*" --> "1" Kategori : categoryId
    KelolaAnggaran ..> DALAnggaranLokal : <<uses>>
    KelolaAnggaran ..> DALTransaksiLokal : <<uses>>
    KelolaAnggaran ..> DALAntreanSinkronisasiLokal : <<uses>>
```

---

## Package 6 — Kelola Target Finansial

**User Story:** Pengguna dapat menetapkan, memantau, dan mengelola target akumulasi pendapatan dalam periode tertentu.

```mermaid
classDiagram
    %% ── BOUNDARY ──
    class HalamanTargetFinansial {
        <<boundary>>
        +Boolean isLoading
        +Array~TargetFinansial~ targetsList
        +renderData() Void
        +handleOpenActionMenu(id String) Void
        +handleOpenEditForm(id String) Void
        +handleDeleteRequest(id String) Void
        +handleConfirmDelete(id String) Void
        +handleCloseForm() Void
        +handleSubmit(data Object) Void
    }

    %% ── CONTROL ──
    class KelolaTargetFinansial {
        <<control>>
        +Array~TargetFinansial~ targets
        +Boolean isLoading
        +String error
        +loadFinancialTargets(userId String) Array~TargetFinansial~
        +addFinancialTarget(userId String, name String, type String, targetAmount Number, period String, startDate String, endDate String, categoryId String, note String) TargetFinansial
        +editFinancialTarget(clientId String, name String, type String, targetAmount Number, period String, startDate String, endDate String, categoryId String, isActive Boolean, note String) TargetFinansial
        +deleteFinancialTarget(clientId String) Boolean
    }

    %% ── ENTITY ──
    class TargetFinansial {
        <<entity>>
        +String clientId
        +String id
        +String userId
        +String name
        +String type
        +Number targetAmount
        +String period
        +String startDate
        +String endDate
        +String categoryId
        +String walletId
        +Boolean isActive
        +String note
        +String syncStatus
        +DateTime createdAt
        +DateTime updatedAt
        +DateTime deletedAt
        +TargetFinansial()
        +isIncomeTarget() Boolean
        +isActiveOnDate(date String) Boolean
        +isDeleted() Boolean
        +belongsToCategory(categoryId String) Boolean
    }

    %% ── REFERENSI EKSTERNAL ──
    class Kategori {
        <<entity>>
    }
    class DALTargetFinansialLokal {
        <<repository>>
    }
    class DALTransaksiLokal {
        <<repository>>
    }
    class DALAntreanSinkronisasiLokal {
        <<repository>>
    }

    %% ── RELASI INTERNAL ──
    HalamanTargetFinansial ..> KelolaTargetFinansial : <<uses>>
    KelolaTargetFinansial "1" *-- "1..*" TargetFinansial : mengelola

    %% ── RELASI KE EKSTERNAL ──
    TargetFinansial "0..*" --> "0..1" Kategori : categoryId (opsional)
    KelolaTargetFinansial ..> DALTargetFinansialLokal : <<uses>>
    KelolaTargetFinansial ..> DALTransaksiLokal : <<uses>>
    KelolaTargetFinansial ..> DALAntreanSinkronisasiLokal : <<uses>>
```

---

## Package 7 — Analisis dan Insight

**User Story:** Pengguna dapat melihat ringkasan performa keuangan bulanan dalam bentuk grafik, distribusi kategori, tren, dan rekomendasi finansial berbasis aturan.

```mermaid
classDiagram
    %% ── BOUNDARY ──
    class HalamanAnalisis {
        <<boundary>>
        +Boolean isLoading
        +RekapKeuangan analysisData
        +String selectedPeriod
        +renderData() Void
        +handlePeriodChange(period String) Void
        +handleTabChange(tab String) Void
        +handleInsightAction(ctaTarget String) Void
        +handleOpenCategoryDetail(categoryId String) Void
        +handleCloseDrawer() Void
    }

    %% ── CONTROL ──
    class KelolaAnalisis {
        <<control>>
        +RekapKeuangan currentRecap
        +Boolean isLoading
        +String selectedPeriod
        +String error
        +loadAnalysisData(userId String, period String) Array~Transaksi~
        +calculateMonthlySummary(transactions Array~Transaksi~) RekapKeuangan
        +generateTransactionTrend(transactions Array~Transaksi~) Array~Object~
        +generateCategoryDistribution(transactions Array~Transaksi~) Array~Object~
        +generateInsights(recap RekapKeuangan) Array~ItemInsight~
        +generateRuleBasedRecommendations(recap RekapKeuangan) Array~ItemInsight~
    }

    %% ── DTO ──
    class RekapKeuangan {
        <<DTO>>
        +String period
        +Number totalIncome
        +Number totalExpense
        +Number netBalance
        +Array categoryDistribution
        +Array trendData
        +RekapKeuangan()
        +isPositive() Boolean
        +getSavingsRate() Number
    }

    class ItemInsight {
        <<DTO>>
        +String type
        +String message
        +String ctaLabel
        +String ctaTarget
    }

    %% ── REFERENSI EKSTERNAL ──
    class Transaksi {
        <<entity>>
    }
    class DALTransaksiLokal {
        <<repository>>
    }
    class DALAnggaranLokal {
        <<repository>>
    }
    class DALTargetFinansialLokal {
        <<repository>>
    }

    %% ── RELASI INTERNAL ──
    HalamanAnalisis ..> KelolaAnalisis : <<uses>>
    HalamanAnalisis --> RekapKeuangan : renders
    KelolaAnalisis "1" --> "1" RekapKeuangan : currentRecap
    KelolaAnalisis ..> RekapKeuangan : produces
    KelolaAnalisis ..> ItemInsight : produces
    KelolaAnalisis ..> Transaksi : reads

    %% ── RELASI KE EKSTERNAL ──
    KelolaAnalisis ..> DALTransaksiLokal : <<uses>>
    KelolaAnalisis ..> DALAnggaranLokal : <<uses>>
    KelolaAnalisis ..> DALTargetFinansialLokal : <<uses>>
```

---

## Package 8 — Notifikasi

**User Story:** Pengguna dapat menerima peringatan otomatis berbasis kondisi keuangan, membaca log notifikasi, dan mengatur preferensi serta izin push notification.

```mermaid
classDiagram
    %% ── BOUNDARY ──
    class HalamanNotifikasi {
        <<boundary>>
        +Boolean isLoading
        +Array~LogNotifikasi~ notificationsList
        +Number unreadCount
        +renderData() Void
        +handleMarkAsRead(id String) Void
        +handleNotificationClick(id String) Void
        +handleCtaAction(actionId String) Void
        +handleFilterUnread(onlyUnread Boolean) Void
    }

    class HalamanPengaturanNotifikasi {
        <<boundary>>
        +PengaturanNotifikasi preferences
        +renderData() Void
        +handleRequestPermission() Void
        +handleDeliveryModeChange(mode String) Void
        +handleDailyCapChange(cap Number) Void
        +handleSavePreferences() Void
    }

    %% ── CONTROL ──
    class KelolaNotifikasi {
        <<control>>
        +Array~LogNotifikasi~ notifications
        +Number unreadCount
        +Boolean isLoading
        +loadLogs(userId String) Array~LogNotifikasi~
        +createLog(userId String, title String, body String, type String) LogNotifikasi
        +markAsRead(id String) Void
        +evaluateAlertNeeds(recap RekapKeuangan, ruleType String) Void
        +preventDuplicateAlerts(dedupeKey String) Boolean
    }

    %% ── ENTITY ──
    class PengaturanNotifikasi {
        <<entity>>
        +String clientId
        +String userId
        +Boolean isEnabled
        +String deliveryMode
        +Boolean instantAlerts
        +Boolean dailyDigest
        +String digestTime
        +Number dailyCap
        +DateTime updatedAt
        +PengaturanNotifikasi()
        +isAlertActive(type String) Boolean
        +togglePush() Void
    }

    class LogNotifikasi {
        <<entity>>
        +String clientId
        +String userId
        +String dedupeKey
        +String title
        +String body
        +String type
        +DateTime readAt
        +String ctaLabel
        +String ctaRoute
        +String syncStatus
        +DateTime createdAt
        +DateTime updatedAt
        +LogNotifikasi()
        +markAsRead() Void
        +isUnread() Boolean
    }

    %% ── REFERENSI EKSTERNAL ──
    class RekapKeuangan {
        <<DTO>>
    }
    class DALLogNotifikasiLokal {
        <<repository>>
    }
    class DALPengaturanNotifikasiLokal {
        <<repository>>
    }
    class DALServerNotifikasi {
        <<gateway>>
    }

    %% ── RELASI INTERNAL ──
    HalamanNotifikasi ..> KelolaNotifikasi : <<uses>>
    HalamanPengaturanNotifikasi ..> KelolaNotifikasi : <<uses>>
    HalamanPengaturanNotifikasi --> PengaturanNotifikasi : renders
    KelolaNotifikasi "1" *-- "1..*" LogNotifikasi : mengelola
    KelolaNotifikasi "1" --> "1" PengaturanNotifikasi : reads preferences
    KelolaNotifikasi ..> RekapKeuangan : evaluates

    %% ── RELASI KE EKSTERNAL ──
    KelolaNotifikasi ..> DALLogNotifikasiLokal : <<uses>>
    KelolaNotifikasi ..> DALPengaturanNotifikasiLokal : <<uses>>
    KelolaNotifikasi ..> DALServerNotifikasi : <<uses>>
```

---

## Package 9 — Sinkronisasi Offline-first

**User Story:** Sistem secara otomatis mendeteksi koneksi jaringan dan menyinkronkan perubahan data lokal ke server cloud (push), serta menarik pembaruan dari server (pull) dengan resolusi konflik Last-Write-Wins.

> **Catatan khusus:** Package ini adalah layanan latar belakang (background service) yang tidak memiliki halaman UI khusus. Status sinkronisasi ditampilkan melalui `NavigasiGlobal` (`syncStatus`) di Package Autentikasi, dan sinkronisasi manual dapat dipicu dari `HalamanProfil`. Oleh karena itu, **tidak ada kelas `<<boundary>>` yang dimiliki sendiri** oleh package ini — ini adalah pengecualian yang wajar untuk package infrastruktur aktif.

```mermaid
classDiagram
    %% ── CONTROL ──
    class ManajerSinkronisasi {
        <<control>>
        +Boolean isSyncing
        +DateTime lastSyncTime
        +Array syncErrors
        +pushLocalChanges(userId String) Boolean
        +pullRemoteChanges(userId String) Boolean
        +applyProgressiveData(serverData Array~Object~) Void
        +reconcileLWW(localData Object, remoteData Object) Object
        +updateLastSyncTime(timestamp DateTime) Void
    }

    class PengaturAntreanSinkronisasi {
        <<control>>
        +Array~ItemAntreanSinkronisasi~ queueItems
        +Boolean isProcessing
        +Number maxRetryLimit
        +scheduleSyncTimer() Void
        +executeRetry() Void
        +drainQueue(userId String) Void
        +handleSyncFailure(queueItemId String, errorMessage String) Void
    }

    %% ── DTO ──
    class ItemAntreanSinkronisasi {
        <<DTO>>
        +String id
        +String entityName
        +String operationType
        +Object payload
        +Number retryCount
        +String status
        +ItemAntreanSinkronisasi()
        +incrementRetry() Void
        +isMaxRetryReached(limit Number) Boolean
    }

    %% ── REFERENSI EKSTERNAL ──
    class DALServerSinkronisasi {
        <<gateway>>
    }
    class DALAntreanSinkronisasiLokal {
        <<repository>>
    }

    %% ── RELASI INTERNAL ──
    ManajerSinkronisasi ..> PengaturAntreanSinkronisasi : <<uses>>
    PengaturAntreanSinkronisasi "1" *-- "1..*" ItemAntreanSinkronisasi : mengelola

    %% ── RELASI KE EKSTERNAL ──
    ManajerSinkronisasi ..> DALServerSinkronisasi : <<uses>>
    ManajerSinkronisasi ..> DALAntreanSinkronisasiLokal : <<uses>>
    PengaturAntreanSinkronisasi ..> DALAntreanSinkronisasiLokal : <<uses>>
```

---

## Package 10 — Akses Data Lokal

**Peran Arsitektur:** Lapisan infrastruktur repository yang mengabstraksi seluruh operasi CRUD pada IndexedDB (penyimpanan luring peramban). Tidak merepresentasikan user story langsung.

> **Catatan:** Semua kelas `DAL*Lokal` standar mengimplementasikan kontrak fungsi yang seragam: `getAll()`, `getByClientId()`, `create()`, `update()`, `softDelete()`, `bulkUpsert()`. Dua kelas memiliki fungsi tambahan khusus.

```mermaid
classDiagram
    %% ── REPOSITORY STANDAR ──
    class DALKategoriLokal {
        <<repository>>
        +String storeName
        +getAll(userId String) Array~Kategori~
        +getByClientId(clientId String) Kategori
        +create(data Kategori) Kategori
        +update(clientId String, data Partial) Kategori
        +softDelete(clientId String) Boolean
        +bulkUpsert(dataList Array) Void
    }

    class DALDompetLokal {
        <<repository>>
        +String storeName
        +getAll(userId String) Array~Dompet~
        +getByClientId(clientId String) Dompet
        +create(data Dompet) Dompet
        +update(clientId String, data Partial) Dompet
        +softDelete(clientId String) Boolean
        +bulkUpsert(dataList Array) Void
    }

    class DALTransaksiLokal {
        <<repository>>
        +String storeName
        +getAll(userId String) Array~Transaksi~
        +getByClientId(clientId String) Transaksi
        +create(data Transaksi) Transaksi
        +update(clientId String, data Partial) Transaksi
        +softDelete(clientId String) Boolean
        +bulkUpsert(dataList Array) Void
    }

    class DALAnggaranLokal {
        <<repository>>
        +String storeName
        +getAll(userId String) Array~Anggaran~
        +getByClientId(clientId String) Anggaran
        +create(data Anggaran) Anggaran
        +update(clientId String, data Partial) Anggaran
        +softDelete(clientId String) Boolean
        +bulkUpsert(dataList Array) Void
    }

    class DALTargetFinansialLokal {
        <<repository>>
        +String storeName
        +getAll(userId String) Array~TargetFinansial~
        +getByClientId(clientId String) TargetFinansial
        +create(data TargetFinansial) TargetFinansial
        +update(clientId String, data Partial) TargetFinansial
        +softDelete(clientId String) Boolean
        +bulkUpsert(dataList Array) Void
    }

    class DALLogNotifikasiLokal {
        <<repository>>
        +String storeName
        +getAll(userId String) Array~LogNotifikasi~
        +getByClientId(clientId String) LogNotifikasi
        +create(data LogNotifikasi) LogNotifikasi
        +update(clientId String, data Partial) LogNotifikasi
        +softDelete(clientId String) Boolean
        +bulkUpsert(dataList Array) Void
    }

    class DALPengaturanNotifikasiLokal {
        <<repository>>
        +String storeName
        +getAll(userId String) Array~PengaturanNotifikasi~
        +getByClientId(clientId String) PengaturanNotifikasi
        +create(data PengaturanNotifikasi) PengaturanNotifikasi
        +update(clientId String, data Partial) PengaturanNotifikasi
        +softDelete(clientId String) Boolean
        +bulkUpsert(dataList Array) Void
    }

    %% ── REPOSITORY KHUSUS: Sesi Pengguna ──
    class DALSesiPenggunaLokal {
        <<repository>>
        +String storeName
        +saveSession(user Pengguna) Void
        +getSession() Pengguna
        +clearSession() Void
    }

    %% ── REPOSITORY KHUSUS: Antrean Sinkronisasi ──
    class DALAntreanSinkronisasiLokal {
        <<repository>>
        +String storeName
        +enqueueItem(entityName String, entityClientId String, operation String, payload Object) ItemAntreanSinkronisasi
        +getPendingItems(userId String) Array~ItemAntreanSinkronisasi~
        +updateRetryCount(queueItemId String, errorMessage String) Void
        +markAsSuccess(queueItemId String) Void
        +removeSyncedItems(userId String) Void
    }

    %% ── REFERENSI EKSTERNAL ──
    class ItemAntreanSinkronisasi {
        <<DTO>>
    }
    class Pengguna {
        <<entity>>
    }

    %% ── RELASI ──
    DALAntreanSinkronisasiLokal ..> ItemAntreanSinkronisasi : produces
    DALSesiPenggunaLokal ..> Pengguna : manages
```

---

## Package 11 — Akses Data Server

**Peran Arsitektur:** Lapisan gateway yang mengabstraksi seluruh komunikasi HTTP ke API Routes server (Next.js + PostgreSQL via Prisma). Tidak merepresentasikan user story langsung.

```mermaid
classDiagram
    %% ── GATEWAY ──
    class DALServerAutentikasi {
        <<gateway>>
        +String apiEndpoint
        +requestLogin(credentials Object) Object
        +requestLogout() Void
        +verifySession() Boolean
    }

    class DALServerSinkronisasi {
        <<gateway>>
        +String apiEndpoint
        +pushChanges(userId String, items Array~ItemAntreanSinkronisasi~) Object
        +pullChanges(userId String, lastSyncTime DateTime) Object
    }

    class DALServerNotifikasi {
        <<gateway>>
        +String apiEndpoint
        +registerPushSubscription(subscription Object) Void
        +updateSubscription(subscription Object) Void
        +removeSubscription(endpoint String) Void
    }

    class DALServerEkspor {
        <<gateway>>
        +String apiEndpoint
        +requestExport(userId String, periodStart String, periodEnd String) Blob
    }

    %% ── REFERENSI EKSTERNAL ──
    class ItemAntreanSinkronisasi {
        <<DTO>>
    }

    %% ── RELASI ──
    DALServerSinkronisasi ..> ItemAntreanSinkronisasi : uses (payload)
```

---

## Ringkasan Distribusi Kelas BCE per Package

| Package | Boundary | Control | Entity / DTO |
|---|---|---|---|
| **Autentikasi** | `HalamanLogin`, `HalamanRegistrasi`, `NavigasiGlobal`, `HalamanBeranda`, `HalamanProfil` | `KelolaAutentikasi` | `Pengguna` |
| **Kelola Kategori** | `HalamanKategori` | `KelolaKategori` | `Kategori` |
| **Kelola Dompet** | `HalamanDompet` | `KelolaDompet` | `Dompet` |
| **Kelola Transaksi** | `HalamanTransaksi` | `KelolaTransaksi` | `Transaksi` |
| **Kelola Anggaran** | `HalamanAnggaran` | `KelolaAnggaran` | `Anggaran`, `RingkasanAnggaran` |
| **Kelola Target Finansial** | `HalamanTargetFinansial` | `KelolaTargetFinansial` | `TargetFinansial` |
| **Analisis dan Insight** | `HalamanAnalisis` | `KelolaAnalisis` | `RekapKeuangan`, `ItemInsight` |
| **Notifikasi** | `HalamanNotifikasi`, `HalamanPengaturanNotifikasi` | `KelolaNotifikasi` | `LogNotifikasi`, `PengaturanNotifikasi` |
| **Sinkronisasi Offline-first** | *(background service — tidak ada UI langsung)* | `ManajerSinkronisasi`, `PengaturAntreanSinkronisasi` | `ItemAntreanSinkronisasi` |
| **Akses Data Lokal** | — | 9 `<<repository>>` | — |
| **Akses Data Server** | — | 4 `<<gateway>>` | — |
