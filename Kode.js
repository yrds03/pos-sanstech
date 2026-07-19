// ==========================================
// 1. FUNGSI UTAMA (Menampilkan Web)
// ==========================================
function doGet(e) {
  var htmlOutput = HtmlService.createTemplateFromFile('Index').evaluate();
  htmlOutput.setTitle('Sanstech POS & ERP')
            .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return htmlOutput;
}

// ==========================================
// 2. FUNGSI HELPER (Mengubah Data Sheet ke JSON)
// ==========================================
// Membantu mengambil data dari sheet apapun agar mudah dibaca oleh Javascript Frontend
function getDataAsObject(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Jika hanya ada header atau kosong
  
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

// ==========================================
// 3. FUNGSI READ (Mengambil Data untuk UI)
// ==========================================

// Mengambil daftar produk untuk menu Kasir/POS
function getDaftarProduk() {
  return getDataAsObject("Produk");
}

// Mengambil 5 transaksi terakhir untuk ditampilkan di Beranda
function getTransaksiTerbaru() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Penjualan");
  var data = sheet.getDataRange().getValues();
  if(data.length <= 1) return [];

  var headers = data[0];
  var result = [];
  
  // Ambil data dari baris paling bawah (terbaru) maksimal 5 data
  var batas = Math.max(1, data.length - 5);
  for (var i = data.length - 1; i >= batas; i--) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

// ==========================================
// 4. FUNGSI CREATE (Menyimpan Transaksi POS)
// ==========================================
// Fungsi ini akan dipanggil dari Web HTML ketika tombol "Bayar" ditekan
function simpanTransaksiPOS(dataKasir) {
  /* Struktur dataKasir yang diharapkan dari Frontend:
     {
       pelanggan_id: "P001",
       subtotal: 150000,
       diskon: 0,
       pajak: 15000,
       total_akhir: 165000,
       metode_bayar: "QRIS",
       kasir: "Admin1",
       keranjang: [
         {id_produk: "PRD-01", qty: 2, harga: 50000, total: 100000},
         {id_produk: "PRD-02", qty: 1, harga: 50000, total: 50000}
       ]
     }
  */
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetJual = ss.getSheetByName("Penjualan");
  var sheetDetail = ss.getSheetByName("Penjualan_Detail");
  var sheetProduk = ss.getSheetByName("Produk");
  
  var waktuSekarang = new Date();
  // Membuat Nomor Invoice Otomatis (Contoh: INV-240501143055)
  var idInvoice = "INV-" + Utilities.formatDate(waktuSekarang, "GMT+7", "yyMMddHHmmss");
  
  try {
    // 1. Catat ke tab 'Penjualan'
    // Urutan: ID_Invoice, Waktu, ID_Pelanggan, Subtotal, Diskon, Pajak, Total_Akhir, Metode_Pembayaran, Status, Kasir
    sheetJual.appendRow([
      idInvoice, 
      waktuSekarang, 
      dataKasir.pelanggan_id || "Umum", 
      dataKasir.subtotal, 
      dataKasir.diskon, 
      dataKasir.pajak, 
      dataKasir.total_akhir, 
      dataKasir.metode_bayar, 
      "Lunas", 
      dataKasir.kasir
    ]);
    
    // 2. Catat ke tab 'Penjualan_Detail' dan Kurangi Stok di 'Produk'
    var dataProduk = sheetProduk.getDataRange().getValues();
    var headerProduk = dataProduk[0];
    var colIDProduk = headerProduk.indexOf("ID_Produk");
    var colStok = headerProduk.indexOf("Stok_Saat_Ini");

    dataKasir.keranjang.forEach(function(item, index) {
      var idDetail = idInvoice + "-" + (index + 1);
      
      // Simpan Detail Transaksi
      // Urutan: ID_Detail, ID_Invoice, ID_Produk, Qty, Harga_Satuan, Total_Harga
      sheetDetail.appendRow([
        idDetail,
        idInvoice,
        item.id_produk,
        item.qty,
        item.harga,
        item.total
      ]);

      // Pengurangan Stok Aktual (Looping cari ID produk, lalu kurangi angkanya)
      for (var i = 1; i < dataProduk.length; i++) {
        if (dataProduk[i][colIDProduk] == item.id_produk) {
          var stokSekarang = Number(dataProduk[i][colStok]) || 0;
          var stokBaru = stokSekarang - Number(item.qty);
          sheetProduk.getRange(i + 1, colStok + 1).setValue(stokBaru);
          break; // Stop pencarian jika produk sudah ketemu
        }
      }
    });
    
    return { 
      status: "SUKSES", 
      invoice: idInvoice, 
      pesan: "Transaksi berhasil disimpan dan stok telah dikurangi." 
    };
    
  } catch (error) {
    return { status: "GAGAL", pesan: error.message };
  }
}