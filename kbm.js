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

    // Jika berjalan di hosting luar dan menggunakan API URL kustom
    if (window.KBM_API) {
      fetch(`${window.KBM_API}?action=getMateriData`)
        .then(res => res.json())
        .then(response => {
          if(response.success) {
            this.masterData = response.data;
            this.filterDanTampilkan();
          } else {
            alert("Gagal memuat data: " + response.error);
          }
          this.showLoading(false);
        })
        .catch(err => {
          alert("Sistem Error API: " + err);
          this.showLoading(false);
        });
    } else {
      // Mock data cadangan jika API belum diisi
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

    const filtered = this.masterData.filter(item => {
      const matchKelas = (fKelas === "Semua" || String(item.kelas) === fKelas);
      const matchPelajaran = (fPelajaran === "Semua" || item.pelajaran === fPelajaran);
      const matchStatus = (fStatus === "Semua" || item.status === fStatus);
      return matchKelas && matchPelajaran && matchStatus;
    });

    const total = filtered.length;
    const selesai = filtered.filter(i => i.status.includes("Selesai") || i.status.includes("Paham")).length;
    const proses = filtered.filter(i => i.status.includes("Proses") || i.status.includes("Dibaca")).length;
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

    filtered.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-bold text-slate-600 py-3 px-4">${item.kelas}</td>
        <td class="font-semibold text-slate-700 py-3 px-4">${item.pelajaran}</td>
        <td class="text-slate-800 font-medium py-3 px-4">${item.materi}</td>
        <td class="text-center py-3 px-4">
          <select onchange="aplikasi.ubahStatus(${item.rowNumber}, this.value)" class="w-full text-sm rounded border border-slate-300 p-1 bg-white">
            <option value="🔴 Belum" ${item.status.includes('Belum') ? 'selected':''}>🔴 Belum</option>
            <option value="🟡 Proses" ${item.status.includes('Proses') || item.status.includes('Dibaca') ? 'selected':''}>🟡 Proses</option>
            <option value="🟢 Selesai" ${item.status.includes('Selesai') || item.status.includes('Paham') ? 'selected':''}>🟢 Selesai</option>
          </select>
        </td>
        <td class="py-3 px-4">
          <input type="text" value="${item.catatan}" placeholder="Tambahkan link / catatan..." 
                 onchange="aplikasi.ubahCatatan(${item.rowNumber}, this.value)" class="w-full text-xs p-1.5 border border-slate-200 rounded">
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  ubahStatus: function(rowNumber, newStatus) {
    this.showLoading(true);

    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler((res) => {
          if(res.success) {
            const idx = this.masterData.findIndex(item => item.rowNumber === rowNumber);
            if(idx !== -1) this.masterData[idx].status = newStatus;
            this.filterDanTampilkan();
          } else {
            alert("Gagal merubah status: " + res.error);
          }
          this.showLoading(false);
        })
        .updateStatusMateri(rowNumber, newStatus);
    } else {
      console.log(`[Lokal] Berhasil mengubah baris ${rowNumber} menjadi status: ${newStatus}`);
      const idx = this.masterData.findIndex(item => item.rowNumber === rowNumber);
      if(idx !== -1) this.masterData[idx].status = newStatus;
      this.filterDanTampilkan();
      this.showLoading(false);
    }
  },

  ubahCatatan: function(rowNumber, newCatatan) {
    this.showLoading(true);

    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler((res) => {
          if(res.success) {
            const idx = this.masterData.findIndex(item => item.rowNumber === rowNumber);
            if(idx !== -1) this.masterData[idx].catatan = newCatatan;
          } else {
            alert("Gagal menyimpan catatan: " + res.error);
          }
          this.showLoading(false);
        })
        .updateCatatanMateri(rowNumber, newCatatan);
    } else {
      console.log(`[Lokal] Berhasil menyimpan catatan pada baris ${rowNumber}: ${newCatatan}`);
      const idx = this.masterData.findIndex(item => item.rowNumber === rowNumber);
      if(idx !== -1) this.masterData[idx].catatan = newCatatan;
      this.showLoading(false);
    }
  }
}; // <--- Tanda kurung kurawal ini wajib menutup objek utama aplikasi
