# CRUD Validation QA Checklist

Tanggal: 2026-06-02
Scope: Real API CRUD forms dan note modals.
Tujuan: memastikan input invalid diblokir di frontend dan input valid berhasil tersimpan tanpa 422.

## Cara Pakai

1. Login ke aplikasi Real API.
2. Buka halaman/form sesuai daftar di bawah.
3. Jalankan skenario Invalid lalu Valid.
4. Expected Invalid: tampil pesan error di UI dan request tidak terkirim.
5. Expected Valid: request terkirim, sukses toast muncul, data ter-update.

## 1) Petani

Halaman: /real/petani/new, /real/petani/:id/edit

Skenario invalid:
- NIK kurang dari 16 digit.
- NIK mengandung huruf.
- Kode wilayah tidak konsisten (misal kabupaten tidak sesuai provinsi).
- HP diisi format tidak valid.

Skenario valid:
- NIK 16 digit unik.
- Rantai wilayah lengkap dan konsisten.
- Submit berhasil create/update.
- Upload foto: preview harus langsung berubah saat file dipilih.

## 2) Lahan

Halaman: /real/lahan/new, /real/lahan/:id/edit

Skenario invalid:
- Kode lahan kosong.
- Kode lahan duplikat.
- Luas <= 0.
- Kepemilikan di luar nilai yang diizinkan.
- Wilayah diisi parsial (tidak lengkap sampai desa).
- Koordinat hanya lat/lng salah satu.
- Koordinat < 3 titik tapi dipaksa polygon.
- Koordinat di luar range (lat > 90, lng > 180).
- Foto lahan format selain jpg/png/webp.
- Foto lahan > 5MB.

Skenario valid:
- Kode unik, luas valid, kepemilikan valid.
- Wilayah lengkap dan konsisten.
- Koordinat valid 3+ titik.
- Submit berhasil create/update.
- Preview foto lahan langsung berubah saat pilih file.

## 3) Produksi Tanam

Halaman: /real/produksi-tanam/new, /real/produksi-tanam/:id/edit

Skenario invalid:
- Kode kosong atau > 50 karakter.
- Kode duplikat.
- Tanggal mulai bukan format YYYY-MM-DD.
- Petani tidak dipilih.
- Lahan tidak sesuai petani terpilih.
- Status bukan rencana/berjalan/selesai.
- Luas garapan <= 0.
- Angka opsional negatif.
- Tanggal akhir < tanggal mulai.
- Saat status selesai, aktual_tanggal_akhir kosong.
- Saat status selesai, aktual_hasil_produksi_kering kosong.

Skenario valid:
- Field wajib benar.
- Submit berhasil create/update.

## 4) Produksi Minyak

Halaman: /real/produksi-minyak/new, /real/produksi-minyak/:id/edit

Skenario invalid:
- Kode kosong atau > 50 karakter.
- Kode duplikat.
- Tanggal mulai invalid.
- Petani tidak dipilih.
- Lahan tidak sesuai petani terpilih.
- Status di luar enum.
- Nilai numerik negatif.
- Tanggal akhir < tanggal mulai.
- Saat status selesai, aktual_tanggal_akhir kosong.
- Saat status selesai, berat_kering_bahan kosong.
- Saat status selesai, aktual_hasil_minyak kosong.

Skenario valid:
- Field wajib benar.
- Submit berhasil create/update.

## 5) Mitra

Halaman: /real/mitra/new, /real/mitra/:id/edit

Skenario invalid:
- Nama kosong.
- Alamat kosong.
- Email format invalid.
- HP format invalid.
- Website tanpa protocol http/https.
- Wilayah tidak lengkap.
- Kode wilayah tidak konsisten.

Skenario valid:
- Semua field wajib valid.
- Optional field valid format.
- Submit berhasil create/update.

## 6) Produk Expense

Halaman: /real/produk-biaya/new, /real/produk-biaya/:id/edit

Skenario invalid:
- Nama kosong.
- Harga negatif atau bukan angka.
- Satuan kosong.

Skenario valid:
- Nama, harga, satuan valid.
- Submit berhasil create/update.

## 7) Produk Penjualan

Halaman: /real/produk-penjualan/new, /real/produk-penjualan/:id/edit

Skenario invalid:
- Nama kosong.
- Jenis bukan barang/jasa.
- Harga negatif atau bukan angka.
- Satuan kosong.

Skenario valid:
- Semua field valid.
- Submit berhasil create/update.

## 8) Expense List Modal

Halaman: /real/expense (Tambah/Edit)

Skenario invalid:
- Nama kosong.
- Tanggal invalid.
- Petani kosong.
- Produk kosong.
- Harga negatif.
- Quantity <= 0.
- planting_production_id invalid UUID.
- oil_production_id invalid UUID.

Skenario valid:
- Field wajib valid.
- UUID opsional benar jika diisi.
- Submit berhasil create/update.

## 9) Expense Modal per Petani

Halaman: modal di detail/list petani

Skenario invalid:
- Nama kosong.
- Tanggal invalid.
- Produk kosong.
- Harga negatif.
- Quantity <= 0.

Skenario valid:
- Submit berhasil create/update.

## 10) Note Produksi Tanam

Halaman: modal catatan di list produksi tanam

Skenario invalid:
- Tanggal invalid.
- Catatan kosong.
- Catatan > 2000 karakter.

Skenario valid:
- Tambah, edit, hapus catatan berhasil.

## 11) Note Produksi Minyak

Halaman: modal catatan di list produksi minyak

Skenario invalid:
- Tanggal invalid.
- Catatan kosong.
- Catatan > 2000 karakter.

Skenario valid:
- Tambah, edit, hapus catatan berhasil.

## Smoke Test Akhir

1. Create satu data valid di tiap modul utama:
- Petani
- Lahan
- Produksi Tanam
- Produksi Minyak
- Mitra
- Produk Expense
- Produk Penjualan
- Expense

2. Lakukan edit dan delete minimal 1 data per modul.
3. Cek console browser: tidak ada uncaught error baru.
4. Cek Network: tidak ada respons 422 untuk skenario valid.
