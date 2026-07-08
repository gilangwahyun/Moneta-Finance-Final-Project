/********** Handler API (GET /api/export) yang mengekspor SELURUH transaksi pengguna dalam format XLSX.
 *
 *  Keputusan Arsitektur: Data diambil langsung dari database PostgreSQL (bukan IndexedDB)
 *  untuk menjamin keutuhan dan kelengkapan dataset resmi, bahkan jika cache lokal klien telah dihapus.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import * as XLSX from "xlsx";

/********** GET /api/export **********/

/**
 * Memproses permintaan ekspor data transaksi pengguna ke file Excel (.xlsx).
 *
 * @param request - NextRequest dari pengguna yang terautentikasi.
 * @returns Response berupa file unduhan XLSX berisikan sheet Ringkasan dan sheet Transaksi, atau pesan error jika gagal.
 */
export async function GET(request: NextRequest) {
  try {
    /********** 1. Pengecekan Autentikasi. */
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload || !tokenPayload.sub) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } },
        { status: 401 }
      );
    }

    const userId = tokenPayload.sub;

    /********** Pengambilan Data Transaksi **********/
    /********** Mengambil semua transaksi aktif (tidak terhapus) beserta relasi kategori dan dompet. */
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            name: true,
            type: true,
          },
        },
        wallet: {
          select: {
            name: true,
          },
        },
        targetWallet: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    /********** Validasi eksistensi data transaksi. */
    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_DATA", message: "Tidak ada transaksi untuk diekspor." } },
        { status: 404 }
      );
    }

    /********** Pengaturan & Helper Pemformatan **********/
    /********** Menggunakan format standar akuntansi agar kompatibel di berbagai locale sistem. */
    const rupiahFormatSummary = '"Rp" #,##0;"-Rp" #,##0;"Rp" 0;@';
    const numberFormat = '#,##0;-#,##0;0;@';
    /* Format tanggal standar yang kompatibel di semua locale Excel. */
    const dateFormat = '[$-id-ID]dd mmmm yyyy;@';

    function formatIndonesianDateStr(dateVal: Date | string): string {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      const day = d.getDate();
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }

    function formatWaktuDicatat(createdAtVal: Date | string): string {
      const d = new Date(createdAtVal);
      if (isNaN(d.getTime())) return "—";
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    /********** Perhitungan Metrik Ringkasan **********/
    const totalTransactions = transactions.length;
    let totalIncome = 0;
    let totalExpense = 0;
    let countIncome = 0;
    let countExpense = 0;
    let countTransfer = 0;
    const categoryExpense: Record<string, number> = {};

    transactions.forEach((t) => {
      const amt = Number(t.amount);
      if (t.type === "INCOME") {
        totalIncome += amt;
        countIncome++;
      } else if (t.type === "EXPENSE") {
        totalExpense += amt;
        countExpense++;
        const catName = t.category?.name || "Tanpa Kategori";
        categoryExpense[catName] = (categoryExpense[catName] || 0) + amt;
      } else if (t.type === "TRANSFER") {
        countTransfer++;
      }
    });

    const netBalance = totalIncome - totalExpense;
    const avgExpense = countExpense > 0 ? totalExpense / countExpense : 0;
    
    let topExpenseCategory = "—";
    let topExpenseAmount = 0;
    if (Object.keys(categoryExpense).length > 0) {
      const entries = Object.entries(categoryExpense).sort((a, b) => b[1] - a[1]);
      topExpenseCategory = entries[0][0];
      topExpenseAmount = entries[0][1];
    }

    let periodString = "Semua Periode";
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    
    let filename = `moneta-transaksi-${formatYMD(new Date())}.xlsx`;

    if (transactions.length > 0) {
      const dates = transactions.map((t) => new Date(t.date).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      periodString = `${formatIndonesianDateStr(minDate)} sampai ${formatIndonesianDateStr(maxDate)}`;
      filename = `moneta-transaksi-${formatYMD(minDate)}_sampai_${formatYMD(maxDate)}.xlsx`;
    }

    /********** Penyusunan Sheet 1 (Ringkasan) **********/
    const summaryRows = [
      ["LAPORAN KEUANGAN MONETA"],
      [],
      ["Informasi Laporan", ""],
      ["Tanggal Ekspor", new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB"],
      ["Cakupan Data", "Seluruh transaksi tersinkronisasi"],
      ["Periode Transaksi", periodString],
      [],
      ["Metrik Transaksi", ""],
      ["Jumlah Transaksi Total", totalTransactions],
      ["Jumlah Transaksi Pemasukan", countIncome],
      ["Jumlah Transaksi Pengeluaran", countExpense],
      ["Jumlah Transaksi Transfer", countTransfer],
      [],
      ["Metrik Keuangan", ""],
      ["Total Pemasukan", totalIncome],
      ["Total Pengeluaran", totalExpense],
      ["Saldo Bersih", netBalance],
      ["Rata-rata Pengeluaran", avgExpense],
      ["Kategori Pengeluaran Terbesar", topExpenseCategory],
      ["Total Pengeluaran Kategori Terbesar", topExpenseAmount]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    
    /********** Atur lebar kolom sheet Ringkasan. */
    wsSummary["!cols"] = [
      { wch: 35 }, /* Label */
      { wch: 45 }  /* Nilai */
    ];

    /********** Format angka mata uang pada cell tertentu di sheet Ringkasan. */
    const summaryCurrencyCells = ["B15", "B16", "B17", "B18", "B20"];
    summaryCurrencyCells.forEach(cell => {
      if (wsSummary[cell]) {
        wsSummary[cell].t = "n";
        wsSummary[cell].z = rupiahFormatSummary;
      }
    });

    /********** Gabungkan cell untuk judul laporan di sheet Ringkasan. */
    wsSummary["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
    ];

    /********** Penyusunan Sheet 2 (Transaksi) **********/
    const transRows = transactions.map((t) => {
      /********** Gunakan objek Date asli agar Excel dapat mengurutkan dan memvalidasi tanggal. */
      const tDate = new Date(t.date);
      const tTime = formatWaktuDicatat(t.createdAt);
      
      let typeText = "Lainnya";
      if (t.type === "INCOME") typeText = "Pemasukan";
      else if (t.type === "EXPENSE") typeText = "Pengeluaran";
      else if (t.type === "TRANSFER") typeText = "Transfer";

      const catText = t.category?.name || (t.type === "TRANSFER" ? "Transfer" : "Tanpa Kategori");

      let walletText = t.wallet?.name || "—";
      if (t.type === "TRANSFER" && t.targetWallet?.name) {
        walletText = `${t.wallet.name} → ${t.targetWallet.name}`;
      }

      const descText = t.description || "";
      const noteText = t.note || "-"; /* Catatan kosong ditampilkan sebagai "-" */
      
      const nominalVal = Number(t.amount);
      
      let arusKasVal: number | null = null;
      if (t.type === "INCOME") {
        arusKasVal = nominalVal;
      } else if (t.type === "EXPENSE") {
        arusKasVal = -nominalVal;
      } /* Untuk transfer, dibiarkan null. */

      return [
        tDate,
        tTime,
        typeText,
        catText,
        walletText,
        descText,
        nominalVal,
        arusKasVal,
        noteText
      ];
    });

    const transHeaders = [
      "Tanggal",
      "Waktu Dicatat",
      "Jenis Transaksi",
      "Kategori",
      "Dompet",
      "Deskripsi",
      "Nominal (Rp)",
      "Arus Kas (Rp)",
      "Catatan"
    ];
    const wsTransData = [transHeaders, ...transRows];
    
    /********** Instruksikan SheetJS untuk memproses tanggal dengan benar. */
    const wsTrans = XLSX.utils.aoa_to_sheet(wsTransData, { cellDates: true });

    /********** Atur lebar kolom sheet Transaksi. */
    wsTrans["!cols"] = [
      { wch: 20 }, /* Tanggal */
      { wch: 15 }, /* Waktu Dicatat */
      { wch: 18 }, /* Jenis Transaksi */
      { wch: 20 }, /* Kategori */
      { wch: 35 }, /* Dompet */
      { wch: 35 }, /* Deskripsi */
      { wch: 18 }, /* Nominal (Rp) */
      { wch: 18 }, /* Arus Kas (Rp) */
      { wch: 35 }  /* Catatan */
    ];

    /********** Pembekuan baris header dan konfigurasi Auto Filter. */
    const endRow = transactions.length + 1;
    wsTrans["!views"] = [{ state: "frozen", ySplit: 1 }];
    wsTrans["!autofilter"] = { ref: `A1:I${endRow}` };

    /********** Format tipe dan tampilan data pada sheet Transaksi. */
    const startRow = 2;
    for (let r = startRow; r <= endRow; r++) {
      /* Kolom A: Tanggal (sebagai Date) */
      const dateCell = wsTrans[`A${r}`];
      if (dateCell && dateCell.t === 'd') {
        dateCell.z = dateFormat;
      }

      /* Kolom G: Nominal */
      const nominalCell = wsTrans[`G${r}`];
      if (nominalCell) {
        nominalCell.t = "n";
        nominalCell.z = numberFormat;
      }

      /* Kolom H: Arus Kas */
      const arusKasCell = wsTrans[`H${r}`];
      if (arusKasCell) {
        if (arusKasCell.v !== null && arusKasCell.v !== undefined) {
          arusKasCell.t = "n";
          arusKasCell.z = numberFormat;
        } else {
          /* Jika transfer, pasang string kosong agar tidak menampilkan 0. */
          arusKasCell.t = "s";
          arusKasCell.v = "";
        }
      }
    }

    /********** Pembuatan & Penulisan Workbook **********/
    const wb = XLSX.utils.book_new();
    
    /********** Tambahkan metadata workbook untuk tampilan profesional. */
    wb.Props = {
      Title: "Laporan Keuangan Moneta",
      Author: "Moneta",
      CreatedDate: new Date()
    };

    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsTrans, "Transaksi");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    /********** Kembalikan file buffer XLSX sebagai respons unduhan. */
    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Export failed." } },
      { status: 500 }
    );
  }
}
