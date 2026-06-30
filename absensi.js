/* ================= ABSENSI GURU ================= */

const SEKOLAH_LAT = -6.5437149;
const SEKOLAH_LNG = 108.4291139;

const ABSEN_API = window.ABSEN_API || "";
const SCRIPT_URL = ABSEN_API;

/* ================= HITUNG JARAK ================= */

function getDistance(lat1, lon1, lat2, lon2){
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ================= BASE64 FOTO ================= */

function toBase64(file){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = err => reject(err);
    });
}

/* ================= LOADING ================= */

function showLoading(state, text="Loading..."){

    const el = document.getElementById("loading");
    if(!el) return;

    el.innerText = text;
    el.style.display = state ? "block" : "none";
}

/* ================= NOTIFIKASI ================= */

function showNotif(msg){

    const n = document.getElementById("notif");
    if(!n) return;

    n.innerText = msg;
    n.style.display = "block";

    setTimeout(() => {
        n.style.display = "none";
    }, 3000);
}

/* ================= ABSEN GURU ================= */

async function submitAbsen(){

    try{

        const now = new Date();
        const today = now.toISOString().split("T")[0];

        if(now.getDay() === 0){
            alert("Hari libur");
            return;
        }

        if(HARI_LIBUR.includes(today)){
            alert("Hari libur nasional");
            return;
        }

        const jenis = document.getElementById("jenisAbsen").value;
        const file = document.getElementById("fotoAbsen").files[0];

        if(jenis === "MASUK" && !file){
            alert("Foto wajib diisi");
            return;
        }

        navigator.geolocation.getCurrentPosition(async(position) => {

            try{

                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const jarak = getDistance(lat, lng, SEKOLAH_LAT, SEKOLAH_LNG);

                if(jarak > 500){
                    alert("Diluar radius sekolah");
                    return;
                }

                const lokasiStatus = document.getElementById("lokasiStatus");
                if(lokasiStatus){
                    lokasiStatus.innerHTML = "Jarak ke sekolah: " + Math.round(jarak) + " meter";
                }

                let statusKehadiran =
                    (now.getHours() > 7 ||
                    (now.getHours() === 7 && now.getMinutes() > 15))
                    ? "TERLAMBAT"
                    : "TEPAT WAKTU";

                let foto = "";

                if(jenis === "MASUK"){
                    foto = await toBase64(file);
                }

                const payload = {
                    action: "absenGuru",
                    jenis: jenis,
                    hari: now.toLocaleDateString("id-ID", {weekday:"long"}),
                    tanggal: now.getDate(),
                    bulan: now.toLocaleDateString("id-ID", {month:"long"}),
                    nama: document.getElementById("absenNama").value,
                    kehadiran: document.getElementById("kehadiran").value,
                    masuk: jenis === "MASUK" ? now.toLocaleTimeString("id-ID") : "",
                    pulang: jenis === "PULANG" ? now.toLocaleTimeString("id-ID") : "",
                    statusKehadiran: statusKehadiran,
                    foto: foto
                };

                const formData = new FormData();
                Object.keys(payload).forEach(key => {
                    formData.append(key, payload[key]);
                });

                const response = await fetch(ABSEN_API, {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();

                if(data.status){
                    alert(data.message);
                    document.getElementById("fotoAbsen").value = "";
                }else{
                    alert(data.message);
                }

            }catch(err){
                alert("Error\n" + err);
            }

        },
        err => alert("GPS gagal\n" + err.message),
        {
            enableHighAccuracy:true,
            timeout:15000,
            maximumAge:0
        });

    }catch(err){
        alert(err);
    }
}

/* ================= DOM READY ================= */

document.addEventListener("DOMContentLoaded", () => {

    const jenisAbsen = document.getElementById("jenisAbsen");
    const fotoGroup = document.getElementById("fotoGroup");

    if(jenisAbsen && fotoGroup){

        function toggleFoto(){
            fotoGroup.style.display =
                (jenisAbsen.value === "PULANG") ? "none" : "block";
        }

        jenisAbsen.addEventListener("change", toggleFoto);
        toggleFoto();
    }

    const rekapPage = document.getElementById("rekapGuruPage");
    if(rekapPage){
        loadRekap();
    }

});

/* ================= REKAP GURU ================= */

let rekapGuruData = [];

async function loadRekap(){

    const loading = document.getElementById("loadingRekap");
    const tbody = document.getElementById("rekapBody");

    if(!tbody){
        console.error("rekapBody tidak ditemukan");
        return;
    }

    try{

        if(loading) loading.classList.remove("hidden");

        tbody.innerHTML = "";

        const bulan =
            document.getElementById("filterBulan").value;

        const response = await fetch(
            ABSEN_API +
            "?action=getRekap&bulan=" +
            encodeURIComponent(bulan)
        );

        const data = await response.json();

        if(!data.status){

            tbody.innerHTML =
            `<tr>
                <td colspan="7">Gagal memuat data</td>
            </tr>`;

            return;

        }

        rekapGuruData = data.rekap;

        renderRekapTable(rekapGuruData);

    }catch(err){

        console.error(err);

        tbody.innerHTML =
        `<tr>
            <td colspan="7">Terjadi kesalahan</td>
        </tr>`;

    }finally{

        if(loading)
            loading.classList.add("hidden");

    }

}
/* ================= RENDER TABLE ================= */

function renderRekapTable(data){

    const tbody = document.getElementById("rekapBody");
    tbody.innerHTML = "";

    if(data.length === 0){
        tbody.innerHTML = `<tr><td colspan="7">Tidak ada data</td></tr>`;
        return;
    }

    data.forEach((guru, index) => {

        const persen = Math.min(100,
            Math.max(0, Math.round((guru.hadir / 22) * 100))
        );

        let badge = "badge-green";
        if(persen < 90) badge = "badge-orange";
        if(persen < 75) badge = "badge-red";

        tbody.innerHTML += `
        <tr>
            <td>${index+1}</td>
            <td><b>${guru.nama}</b></td>
            <td>${guru.hadir}</td>
            <td>${guru.terlambat}</td>
            <td>${guru.tidakMasuk}</td>
            <td>
                <span class="badge ${badge}">${persen}%</span>
                <div class="progress">
                    <div class="progress-bar" style="width:${persen}%"></div>
                </div>
            </td>
            <td>
                <button class="btn-primary"
                    onclick="cetakGuru('${guru.nama}','${document.getElementById('filterBulan').value}')">
                    📄 Cetak
                </button>
            </td>
        </tr>`;
    });
}

/* ================= CETAK GURU ================= */

async function cetakGuru(nama, bulan){

    const res = await fetch(ABSEN_API,{
        method:"POST",
        body:new URLSearchParams({
            action:"exportGuruPDF",
            nama:nama,
            bulan:bulan
        })
    });

    const data = await res.json();

    if(data.status){
        window.open(data.url,"_blank");
    }else{
        alert(data.message);
    }

}
/* ================= EXPORT REKAP ================= */

async function exportPDF(){

    const bulan =
        document.getElementById("filterBulan").value;

    const res = await fetch(ABSEN_API,{
        method:"POST",
        body:new URLSearchParams({
            action:"exportRekapPDF",
            bulan:bulan
        })
    });

    const data = await res.json();

    if(data.status){
        window.open(data.url,"_blank");
    }else{
        alert(data.message);
    }

}

let dataSiswa = [];

// ===========================
// LOAD DATA SISWA
// ===========================
async function loadDataSiswa() {

    const res = await fetch(ABSEN_API + "?action=getDataSiswa");
    const result = await res.json();

    if (!result.status) {
        alert(result.message);
        return;
    }

    dataSiswa = result.data;

    const kelasSelect = document.getElementById("kelasFilter");
    const namaSelect = document.getElementById("namaSiswa");
    const kelasInput = document.getElementById("kelasSiswa");

    if (kelasSelect) {

        kelasSelect.innerHTML =
            '<option value="">Pilih Kelas</option>';

        [...new Set(dataSiswa.map(x => x.kelas))]
            .sort()
            .forEach(k => {

                kelasSelect.innerHTML +=
                    `<option value="${k}">${k}</option>`;

            });

    }

    if (namaSelect)
        namaSelect.innerHTML =
            '<option value="">Pilih Nama Siswa</option>';

    if (kelasInput)
        kelasInput.value = "";
}

function filterKelas() {

    const kelas = kelasFilter.value;

    namaSiswa.innerHTML =
        '<option value="">Pilih Nama Siswa</option>';

    kelasSiswa.value = "";

    dataSiswa
        .filter(x => x.kelas === kelas)
        .sort((a, b) => a.nama.localeCompare(b.nama))
        .forEach(x => {

            namaSiswa.innerHTML +=
                `<option value="${x.nama}">${x.nama}</option>`;

        });

}

function pilihSiswa() {

    const siswa = dataSiswa.find(
        x => x.nama === namaSiswa.value
    );

    kelasSiswa.value =
        siswa ? siswa.kelas : "";

}

async function submitAbsenSiswa() {

    if (!namaSiswa.value) {
        alert("Pilih siswa.");
        return;
    }

    const sekarang = new Date();

    const hari = sekarang.toLocaleDateString("id-ID", {
        weekday: "long"
    });

    const tanggal = sekarang.getDate();

    const bulan = sekarang.toLocaleDateString("id-ID", {
        month: "long"
    });

    const jam = sekarang.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
    });

    try {

        const res = await fetch(ABSEN_API, {

            method: "POST",

            body: JSON.stringify({

                action: "absenSiswa",

                hari,

                tanggal,

                bulan,

                nama: namaSiswa.value,

                kelas: kelasSiswa.value,

                kehadiran: kehadiranSiswa.value,

                masuk: jam,

                pulang: "",

                statusKehadiran: ""

            })

        });

        const result = await res.json();

        alert(result.message);

    } catch (err) {

        alert(err);

    }

}

async function loadRekapSiswa() {

    try {

        const bulan = filterBulanSiswa.value;

        const res = await fetch(
            ABSEN_API +
            "?action=getRekapSiswa&bulan=" +
            encodeURIComponent(bulan)
        );

        const result = await res.json();

        if (!result.status) {

            alert(result.message);
            return;

        }

        tampilRekapSiswa(result.rekap);

    } catch (err) {

        alert(err);

    }

}

function tampilRekapSiswa(data) {

    let html = `

<table class="table">

<thead>

<tr>

<th>No</th>
<th>Nama</th>
<th>Kelas</th>
<th>Hadir</th>
<th>Izin</th>
<th>Sakit</th>
<th>Terlambat</th>

</tr>

</thead>

<tbody>

`;

    data.forEach((x, i) => {

        html += `

<tr>

<td>${i + 1}</td>
<td>${x.nama}</td>
<td>${x.kelas}</td>
<td>${x.hadir}</td>
<td>${x.izin}</td>
<td>${x.sakit}</td>
<td>${x.terlambat}</td>

</tr>

`;

    });

    html += `
</tbody>
</table>`;

    rekapSiswaBox.innerHTML = html;

}

function gantiKelasRekap() {

    const kelas = filterKelas.value;

    filterNamaSiswaRekap.innerHTML =
        '<option value="">Semua Siswa</option>';

    dataSiswa
        .filter(x => !kelas || x.kelas === kelas)
        .forEach(x => {

            filterNamaSiswaRekap.innerHTML +=
                `<option value="${x.nama}">${x.nama}</option>`;

        });

    loadRekapSiswa();

}

async function loadKelasRekap() {

    await loadDataSiswa();

    const select = document.getElementById("filterKelas");

    select.innerHTML =
        '<option value="">Semua Kelas</option>';

    [...new Set(dataSiswa.map(x => x.kelas))]
        .sort()
        .forEach(k => {

            select.innerHTML +=
                `<option value="${k}">${k}</option>`;

        });

    console.log(select.innerHTML);
}

function loadFilterNamaSiswa() {

    filterNamaSiswaRekap.innerHTML =
        '<option value="">Semua Siswa</option>';

    dataSiswa.forEach(x => {

        filterNamaSiswaRekap.innerHTML +=
            `<option value="${x.nama}">${x.nama}</option>`;

    });

}

function tampilRekapSiswa(data){

    let html = `
    <table class="table">

    <thead>
    <tr>
        <th>No</th>
        <th>Nama</th>
        <th>Kelas</th>
        <th>Hadir</th>
        <th>Izin</th>
        <th>Sakit</th>
        <th>Terlambat</th>
        <th>%</th>
        <th>Aksi</th>
    </tr>
    </thead>

    <tbody>
    `;

    data.forEach((x,i)=>{

        const persen =
            Math.round((x.hadir/22)*100);

        html += `
        <tr>

        <td>${i+1}</td>
        <td>${x.nama}</td>
        <td>${x.kelas}</td>
        <td>${x.hadir}</td>
        <td>${x.izin}</td>
        <td>${x.sakit}</td>
        <td>${x.terlambat}</td>
        <td>${persen}%</td>

        <td>

        <button
        onclick="cetakSiswa(
        '${x.nama}',
        '${document.getElementById("filterBulanSiswa").value}'
        )">

        📄 Cetak

        </button>

        </td>

        </tr>
        `;

    });

    html += `
    </tbody>
    </table>
    `;

    rekapSiswaBox.innerHTML = html;

}

async function cetakSiswa(nama,bulan){

    const res = await fetch(ABSEN_API,{

        method:"POST",

        body:new URLSearchParams({

            action:"exportSiswaPDF",

            nama:nama,

            bulan:bulan

        })

    });

    const data = await res.json();

    if(data.status){

        window.open(data.url,"_blank");

    }else{

        alert(data.message);

    }

}

async function exportPDFSiswa(){

    const bulan =
        document.getElementById("filterBulanSiswa").value;

    const kelas =
        document.getElementById("filterKelas").value;

    const res = await fetch(ABSEN_API,{

        method:"POST",

        body:new URLSearchParams({

            action:"exportRekapSiswaPDF",

            bulan:bulan,

            kelas:kelas

        })

    });

    const data = await res.json();

    if(data.status){

        window.open(data.url,"_blank");

    }else{

        alert(data.message);

    }

}
