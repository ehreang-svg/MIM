const aplikasi = {
  masterData: [],

  init: function() {
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
            console.log("Berhasil mengamankan data ke aplikasi.masterData:", aplikasi.masterData);
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
      console.warn("API KBM tidak ditemukan, mengaktifkan data simulasi...");
      setTimeout(() => {
        this.masterData = [
          { rowNumber: 2, kelas: 1, pelajaran: "Matematika", materi: "Mengenal Angka 1-20 (Simulasi)", status: "🔴 Belum", catatan: "" }
        ];
        this.filterDanTampilkan();
        this.showLoading(false);
      }, 500);
    }
  },

  filterDanTampilkan: function() {
    const fKelas = document.getElementById('filterKelas').value;
    const fPelajaran = document.getElementById('filterPelajaran').value;
    const fStatus = document.getElementById('filterStatus').value;

    let filtered = this.masterData.filter(item => {
      // 1. Ambil angka kelas saja dari spreadsheet (kebal terhadap tulisan "Kelas 1" atau angka "1")
      const angkaKelasSaja = String(item.kelas || '').toLowerCase().replace('kelas', '').trim();
      const matchKelas = (fKelas === "Semua" || angkaKelasSaja === fKelas);
      
      // 2. Filter Pelajaran menggunakan .includes() agar lebih fleksibel terhadap spasi/teks tambahan
      const mapelTarget = String(item.pelajaran || '').toLowerCase().trim();
      const mapelFilter = fPelajaran.toLowerCase().trim();
      const matchPelajaran = (fPelajaran === "Semua" || mapelTarget.includes(mapelFilter) || mapelFilter.includes(mapelTarget));
      
      // 3. Filter Status Belajar
      let matchStatus = false;
      if (fStatus === "Semua") {
        matchStatus = true;
      } else {
        const itemStatus = String(item.status || '').toLowerCase();
        if (fStatus.includes("Belum") && itemStatus.includes("belum")) matchStatus = true;
        if (fStatus.includes("Proses") && (itemStatus.includes("proses") || itemStatus.includes("dibaca"))) matchStatus = true;
        if (fStatus.includes("Selesai") && (itemStatus.includes("selesai") || itemStatus.includes("paham"))) matchStatus = true;
      }

      return matchKelas && matchPelajaran && matchStatus;
    });

    // JIKA filter menghasilkan data, matikan mode bypass agar penyaringan bekerja normal
    // JIKA hasil filter benar-benar 0 baru sistem akan memunculkan emptyState
    const totalSemuaData = this.masterData.length;

    // Hitung Statistik Berdasarkan Hasil Filter yang Valid
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

    if (filtered.length === 0) {
      if(emptyState) emptyState.classList.remove('hidden');
      return;
    } else {
      if(emptyState) emptyState.classList.add('hidden');
    }

    // Render data hasil filter ke tabel HTML
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
