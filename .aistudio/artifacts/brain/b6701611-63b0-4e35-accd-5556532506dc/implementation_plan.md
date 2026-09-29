# Rencana Pengembangan: Halaman Interaktif "Surat Cinta Langit Biru" untuk Viia (`pesan.html`)

Sebuah halaman kedua interaktif berlatar langit biru romantis (*romantic sky ambience*) dengan alur cerita mengalir ke bawah (*cascading reveal flow*): setiap tombol **Next** ditekan, bagian selanjutnya akan terbuka di bawahnya dengan animasi halus, sementara pesan-pesan sebelumnya tetap berada di tempatnya dan dapat terus dilihat atau dibaca kembali.

---

## 1. Alur Bertingkat Mengalir ke Bawah (*Cascading Sequential Flow*)

### Langkah 1: Kotak Pembuka (*The Ambience & First Prompt*)
- **Latar Belakang**: Langit biru lembut (*soft dreamy blue sky*) dengan pergerakan awan halus dan partikel hati-hati kecil berterbangan lembut.
- **Musik Latar**: Otomatis memutar lagu *"Kita Lewati Berdua"* (`assets/music/song.mp3`) dengan tombol kontrol pemutar di sudut atas.
- **Tampilan**:
  - Kotak kaca romantis (*glassmorphism card*) dengan teks:
    > *"Cobaa pencet tombol ini..."*
  - Tombol **Next** berada di bagian kanan bawah kotak teks.
- **Aksi Klik Next**:
  - Langkah 1 tetap tampil di tempatnya.
  - Langkah 2 muncul tepat di bawah Langkah 1 dengan animasi fade-in lembut, dan halaman melakukan *smooth scroll* otomatis ke Langkah 2.

### Langkah 2: Surat Cinta Tulus dari Yass (*The Heartfelt Message*)
- **Tampilan**: Muncul di bawah Langkah 1. Menampilkan seluruh pesan cinta tulus dari Yass:
  ```text
  Haiii Viiaaaa Sayaangg kuuu, 
  Akuuu saayyaaannggg banngeeettt saamaaa kaamuuu, Akuu Ciinnttaaaaa banngeettt samaa kamuu🥰 🥰 . 
  Kalau akuuu adaa salah, Akuuu minntaaa maaff yaaa🙏 
  Maakkassiihh yaaaa buuaattt seemmuuaaaa yangg udahh kamuu berikan ke Aku❤️ 
  Akuuuu gaaa aakaannnn ninggalin kamu, bakal setiaa teruss saamaaa kamuuu, JAANNJJIIII.
  Kamuu jangann pernah merasa sendiri yaa, kann kamuu punyaa akuuu🤭 
  Akuu Bakall Nerima Kamuu Apa Adanya, mau kamu bilang kamu itu ga sempurna atau apa, akuu tetap bakal mauu samaa kamuu👉 👈 
  Aku Berharap kamuu jugaa nerima aku apa adanya, bakal tetep milih bertahan sama aku apapun yang terjadi. 
  Aku Takutt bangett kamuu ninggalin aku, takut kamu udah ga sayang aku lagi. 

  I Love You❤️ 
  From I'am/Yass
  ```
- **Aksi**: Di bagian akhir surat ini terdapat tombol **Next**.
- **Aksi Klik Next**:
  - Langkah 1 dan Langkah 2 **tetap dapat dilihat utuh di atasnya** (tanpa tombol popup/accordion terpisah).
  - Langkah 3 terbuka tepat di bawah Langkah 2 dengan animasi transisi yang mulus.

### Langkah 3: Animasi ❤️ Loop & Form Balasan Cinta
- **Tampilan**:
  - Kotak estetik dengan animasi **hati (❤️) bersinar yang berdenyut berulang-ulang tanpa henti** (*looping glowing heart animation*).
  - Tombol **"Balas Pesan"**.
- **Saat Tombol "Balas Pesan" Ditekan**:
  - Form balasan muncul langsung di dalam kotak tersebut:
    1. **Dari**: Input teks nama pengirim (default otomatis terisi: `Viia`).
    2. **Pesanmu**: Area teks untuk mengetik balasan isi hati.
    3. **Kata Kata Singkat**: Input singkat (contoh placeholder: `I Love You too❤️`).
  - Viia dapat dengan mudah melirik ke atas untuk membaca kembali setiap kalimat yang ditulis Yass di Langkah 2.
  - Tombol **"Selesai"**.
- **Setelah Tombol "Selesai" Ditekan**:
  - Kotak form berganti menampilkan pratinjau teks balasan dengan struktur format:
    ```text
    (pesanmu)

    (kata kata singkat)

    From (dari)
    ```
  - Muncul 2 tombol aksi:
    1. **Tombol Copy**: Menyalin seluruh struktur format pesan ke clipboard perangkat dan menampilkan pesan konfirmasi: *"Pesan cinta berhasil disalin! ✨"*.
    2. **Tombol Kirim**: Otomatis menyalin pesan ke clipboard dan langsung membuka aplikasi/web Discord menuju profil **`yasszz_09`** (`https://discord.com/users/yasszz_09`) agar Viia tinggal menempelkan (*paste*) pesan balasan langsung ke chat Yass.

---

## 2. Struktur File & Implementasi

1. **`pesan.html`**:
   - Struktur HTML5 halaman penuh dengan navigasi *"← Kembali ke Cerita Kita"* (`index.html`).
   - Kontainer vertikal yang menampung Langkah 1, Langkah 2, dan Langkah 3 secara berurutan.
   - Pemutar audio terintegrasi memainkan `assets/music/song.mp3`.
2. **`css/pesan.css`**:
   - Palet warna langit biru pastel romantis (*Sky Romantic* - gradien biru lembut dan putih awan).
   - Efek kartu kaca berkilau (*glassmorphism*).
   - Animasi detak hati SVG/CSS yang berdenyut dinamis dan bersinar (*heartbeat glow effect*).
   - Animasi kemunculan (*reveal animation*) dengan efek mengambang lembut saat setiap langkah dibuka.
3. **`js/pesan.js`**:
   - Logika tampilan sekuensial bertingkat (*step-by-step reveal*): membuka langkah baru di bawah tanpa menyembunyikan langkah sebelumnya.
   - Partikel kanvas hati-hati mini di latar belakang langit biru.
   - Validasi input form balasan, penyusunan format teks, fungsionalitas tombol **Copy** (Clipboard API), dan tombol **Kirim** (membuka profil Discord `yasszz_09`).
4. **Integrasi di `index.html`**:
   - Menambahkan tautan navigasi di navbar: **💌 SURAT UNTUK VIIA** yang langsung mengarah ke `pesan.html`.
5. **Sinkronisasi Build & GitHub Pages**:
   - Memastikan `pesan.html`, `css/pesan.css`, dan `js/pesan.js` disalin ke folder `dist/` pada script `build` di `package.json`.
   - Menguji aplikasi dengan `compile_applet` dan `lint_applet`.

---

## 3. Rencana Pengujian
- Memverifikasi saat tombol Next di Langkah 1 ditekan, Langkah 2 muncul di bawahnya dan Langkah 1 tetap tampak.
- Memverifikasi saat tombol Next di Langkah 2 ditekan, Langkah 3 muncul di bawahnya dan pesan cinta Yass tetap terbaca jelas di atasnya.
- Memverifikasi animasi ❤️ berdenyut looping berjalan stabil.
- Memverifikasi tombol Copy menyalin format pesan dengan benar.
- Memverifikasi tombol Kirim membuka URL Discord `yasszz_09` dengan lancar di browser/ponsel.
