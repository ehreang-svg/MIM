const aplikasi = {
  masterData: [],
  isFirstLoad: true, // Penanda untuk membedakan muat pertama vs saat filter diubah

  init: function() {
    this.isFirstLoad = true;
    this.muatDataDariSheets();
  },

  showLoading: function(status) {
    const el = document.getElementById('loadingStatus');
    if (!el) return; 
    if (status) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  },

  muatDataDariSheets: function() {
    this.showLoading(true);
    if (window.KBM_API) {
      fetch(`${window.KBM_API}?action=getMateriData`)
        .then(res => res.json())
        .then(response => {
          if(response.success && response.data) {
            aplikasi.masterData = response.data;
            console.log("Data berhasil dimuat, jumlah:", aplikasi.masterData.length);
            aplikasi.filterDanTampilkan();
          } else {
            alert("Gagal memuat data: " + response.error);
          }
          aplikasi.showLoading(false);
        })
        .catch(err => {
          alert("Sistem Error API: " + err);
          aplikasi.showLoading(false);
        });
    } else {
      console.warn("API KBM tidak ditemukan, menggunakan data simulasi...");
      setTimeout(() => {
        this.masterData = [
          { rowNumber: 2, kelas: "Kelas 1", pelajaran: "Matematika", materi: "Mengenal Angka 1-20 (Simulasi)", status: "🔴 Belum", catatan: "" }
        ];
        this.filterDanTampilkan();
        this.showLoading(false);
      }, 500);
    }
  },

  filterDanTampilkan: function() {
    // 1. Ambil nilai filter Kelas & amankan jika bernilai kosong ("")
    let fKelas = document.getElementById('filterKelas').value;
    if (!fKelas || fKelas.trim() === "") {
      fKelas = "Semua";
    }
    
    const fPelajaran = document.getElementById('filterPelajaran').value;
    const fStatus = document.getElementById('filterStatus').value;

    console.log(`Menjalankan filter -> Kelas: ${fKelas}, Mapel: ${fPelajaran}, Status: ${fStatus}`);

    let filtered = this.masterData.filter(item => {
      // A. Ekstrak angka saja dari kolom kelas spreadsheet (mengubah "Kelas 1" menjadi "1")
      const angkaKelasSaja = String(item.kelas || '').replace(/\D/g, '').trim(); 
      const matchKelas = (fKelas === "Semua" || angkaKelasSaja === fKelas);
      
      // B. Filter Pelajaran (Pencarian fleksibel sebagian karakter / case-insensitive)
      const mapelTarget = String(item.pelajaran || '').toLowerCase().trim();
      const mapelFilter = fPelajaran.toLowerCase().trim();
      const matchPelajaran = (fPelajaran === "Semua" || mapelTarget.includes(mapelFilter) || mapelFilter.includes(mapelTarget));
      
      // C. Filter Status Belajar (Membaca teks murni ataupun emoji pendukung)
      let matchStatus = false;
      if (fStatus === "Semua") {
        matchStatus = true;
      } else {
        const itemStatus = String(item.status || '').toLowerCase();
        if (fStatus.includes("Belum") && (itemStatus.includes("belum") || itemStatus.includes("🔴"))) matchStatus = true;
        if (fStatus.includes("Proses") && (itemStatus.includes("proses") || itemStatus.includes("dibaca") || itemStatus.includes("🟡"))) matchStatus = true;
        if (fStatus.includes("Selesai") && (itemStatus.includes("selesai") || itemStatus.includes("paham") || itemStatus.includes("🟢"))) matchStatus = true;
      }

      return matchKelas && matchPelajaran && matchStatus;
    });

    // PENGAMAN BERDASARKAN LIFE-CYCLE LOAD PERTAMA
    if (this.isFirstLoad && filtered.length === 0 && this.masterData.length > 0) {
      console.warn("Kondisi awal tidak sinkron, menampilkan seluruh data asli.");
      filtered = this.masterData;
    }
    
    // Matikan status load pertama setelah filter dijalankan atau diubah manual oleh pengguna
    this.isFirstLoad = false;

    // Perbarui Angka Statistik Real-time Dashboard KBM
    const total = filtered.length;
    const selesai = filtered.filter(i => {
      const s = String(i.status || '').toLowerCase();
      return s.includes("selesai") || s.includes("paham") || s.includes("🟢");
    }).length;
    
    const proses = filtered.filter(i => {
      const s = String(i.status || '').toLowerCase();
      return s.includes("proses") || s.includes("dibaca") || s.includes("🟡");
    }).length;
    
    const persen = total > 0 ? Math.round((selesai / total) * 100) : 0;

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statSelesai').innerText = selesai;
    document.getElementById('statProses').innerText = proses;
    document.getElementById('statPersen').innerText = persen + "%";

    const tbody = document.getElementById('tabelMateriBody');
    const emptyState = document.getElementById('emptyState');
    
    if(!tbody) return;
    tbody.innerHTML = "";

    // Jika benar-benar tidak ada data yang cocok setelah difilter oleh user
    if (filtered.length === 0) {
      if(emptyState) emptyState.classList.remove('hidden');
      return;
    } else {
      if(emptyState) emptyState.classList.add('hidden');
    }

    // Render baris data ke dalam tabel HTML
    filtered.forEach((item) => {
      const tr = document.createElement('tr');
      const sStr = String(item.status || '').toLowerCase();
      
      const isBelum = sStr.includes('belum') || sStr.includes('🔴');
      const isProses = sStr.includes('proses') || sStr.includes('dibaca') || sStr.includes('🟡');
      const isSelesai = sStr.includes('selesai') || sStr.includes('paham') || sStr.includes('🟢');

      tr.innerHTML = `
        <td class="text-center font-bold text-slate-600 py-3 px-4">${item.kelas || '-'}</td>
        <td class="font-semibold text-slate-700 py-3 px-4">${item.pelajaran || '-'}</td>
        <td class="text-slate-800 font-medium py-3 px-4">${item.materi || '-'}</td>
        <td class="text-center py-3 px-4">
          <select onchange="aplikasi.ubahStatus(${item.rowNumber}, this.value)" class="w-full text-sm rounded border border-slate-300 p-1 bg-white">
            <option value="🔴 Belum" ${isBelum ? 'selected' : ''}>🔴 Belum</option>
            <option value="🟡 Proses" ${isProses ? 'selected' : ''}>🟡 Proses</option>
            <option value="🟢 Selesai" ${isSelesai ? 'selected' : ''}>🟢 Selesai</option>
          </select>
        </td>
        <td class="py-3 px-4">
          <input type="text" value="${item.catatan || ''}" placeholder="Tambahkan link / catatan..." 
                 onchange="aplikasi.ubahCatatan(${item.rowNumber}, this.value)" class="w-full text-xs p-1.5 border border-slate-200 rounded">
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  ubahStatus: function(rowNumber, newStatus) {
    this.showLoading(true);
    if (window.KBM_API) {
      fetch(`${window.KBM_API}?action=updateStatusMateri&rowNumber=${rowNumber}&newStatus=${encodeURIComponent(newStatus)}`)
        .then(res => res.json())
        .then(res => {
          if(res.success) {
            const idx = this.masterData.findIndex(item => item.rowNumber === rowNumber);
            if(idx !== -1) this.masterData[idx].status = newStatus;
            this.filterDanTampilkan();
          } else {
            alert("Gagal merubah status: " + res.error);
          }
          this.showLoading(false);
        })
        .catch(err => {
          alert("Gagal menyimpan ke server: " + err);
          this.showLoading(false);
        });
    }
  },

  ubahCatatan: function(rowNumber, newCatatan) {
    this.showLoading(true);
    if (window.KBM_API) {
      fetch(`${window.KBM_API}?action=updateCatatanMateri&rowNumber=${rowNumber}&newCatatan=${encodeURIComponent(newCatatan)}`)
        .then(res => res.json())
        .then(res => {
          if(res.success) {
            const idx = this.masterData.findIndex(item => item.rowNumber === rowNumber);
            if(idx !== -1) this.masterData[idx].catatan = newCatatan;
          } else {
            alert("Gagal menyimpan catatan: " + res.error);
          }
          this.showLoading(false);
        })
        .catch(err => {
          alert("Gagal menyimpan ke server: " + err);
          this.showLoading(false);
        });
    }
  }
};
