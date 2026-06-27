/* ================= ABSENSI GURU ================= */
const SEKOLAH_LAT=-6.5437149; const SEKOLAH_LNG=108.4291139;
function getDistance(lat1, lon1, lat2, lon2){
    const R=6371e3; const φ1=lat1*Math.PI/180; const φ2=lat2*Math.PI/180;
    const Δφ=(lat2-lat1)*Math.PI/180; const Δλ=(lon2-lon1)*Math.PI/180;
    const a= Math.sin(Δφ/2)*Math.sin(Δφ/2)+ Math.cos(φ1)*Math.cos(φ2)* Math.sin(Δλ/2)*Math.sin(Δλ/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function toBase64(file){
    return new Promise((resolve,reject)=>{
        const reader=new FileReader(); reader.readAsDataURL(file);
        reader.onload=()=> resolve(reader.result); reader.onerror=err=> reject(err);
    });
}

async function submitAbsen(){

    try{

        const now = new Date();
        const today = now.toISOString().split("T")[0];

        if(now.getDay()==0){
            alert("Hari libur");
            return;
        }

        if(HARI_LIBUR.includes(today)){
            alert("Hari libur nasional");
            return;
        }

        const jenis = document.getElementById("jenisAbsen").value;

        const file = document.getElementById("fotoAbsen").files[0];

        // Foto hanya wajib saat absen masuk
        if(jenis=="MASUK" && !file){
            alert("Foto wajib diisi");
            return;
        }

        navigator.geolocation.getCurrentPosition(async(position)=>{

            try{

                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const jarak = getDistance(
                    lat,
                    lng,
                    SEKOLAH_LAT,
                    SEKOLAH_LNG
                );

                if(jarak>500){
                    alert("Diluar radius sekolah");
                    return;
                }

                lokasiStatus.innerHTML =
                    "Jarak ke sekolah : " +
                    Math.round(jarak) +
                    " meter";

                let statusKehadiran = "TEPAT WAKTU";

                if(
                    now.getHours()>7 ||
                    (
                        now.getHours()==7 &&
                        now.getMinutes()>15
                    )
                ){
                    statusKehadiran="TERLAMBAT";
                }

                let foto = "";

                if(jenis=="MASUK"){
                    foto = await toBase64(file);
                }

                const payload = {

                    action:"absenGuru",

                    jenis:jenis,

                    hari:now.toLocaleDateString(
                        "id-ID",
                        {weekday:"long"}
                    ),

                    tanggal:now.getDate(),

                    bulan:now.toLocaleDateString(
                        "id-ID",
                        {month:"long"}
                    ),

                    nama:absenNama.value,

                    kehadiran:kehadiran.value,

                    masuk:
                        jenis=="MASUK"
                        ? now.toLocaleTimeString("id-ID")
                        : "",

                    pulang:
                        jenis=="PULANG"
                        ? now.toLocaleTimeString("id-ID")
                        : "",

                    statusKehadiran:statusKehadiran,

                    foto:foto

                };

                const formData = new FormData();

                Object.keys(payload).forEach(key=>{
                    formData.append(key,payload[key]);
                });

                const response = await fetch(
                    ABSEN_API,
                    {
                        method:"POST",
                        body:formData
                    }
                );

                const data = await response.json();

                if(data.status){

                    alert(data.message);

                    fotoAbsen.value="";

                }else{

                    alert(data.message);

                }

            }catch(err){

                alert("Error\n"+err);

            }

        },
        err=>{
            alert("GPS gagal\n"+err.message);
        },
        {
            enableHighAccuracy:true,
            timeout:15000,
            maximumAge:0
        });

    }catch(err){

        alert(err);

    }

}

document.addEventListener("DOMContentLoaded", () => {

    const jenisAbsen = document.getElementById("jenisAbsen");
    const fotoGroup = document.getElementById("fotoGroup");

    function toggleFoto() {
        fotoGroup.style.display = (jenisAbsen.value === "PULANG") ? "none" : "block";
    }

    jenisAbsen.addEventListener("change", toggleFoto);
    toggleFoto();

});


    async function loadFilterNamaSiswa(){

    const kelas =
    document.getElementById(
        "filterKelas"
    ).value;

    try{

        const res =
        await fetch(
            ABSEN_API +
            "?action=getDataSiswa"
        );

        const data =
        await res.json();

        if(!data.status) return;

        const select =
        document.getElementById(
            "filterNamaSiswaRekap"
        );

        select.innerHTML =
        '<option value="">Semua Siswa</option>';

        let siswaData = data.data;

        if(kelas){

            siswaData =
            siswaData.filter(
                s => s.kelas === kelas
            );

        }

        siswaData
        .sort((a,b)=>
            a.nama.localeCompare(b.nama)
        )
        .forEach(siswa=>{

            select.innerHTML += `
                <option value="${siswa.nama}">
                    ${siswa.nama}
                </option>
            `;

        });

    }catch(err){

        console.error(err);

    }

}
    

/* =====================================================
   LOAD REKAP ABSENSI GURU
===================================================== */

let rekapGuruData = [];

async function loadRekap(){

    const loading = document.getElementById("loadingRekap");
    const tbody = document.getElementById("rekapBody");

    try{

        loading.classList.remove("hidden");

        tbody.innerHTML = "";

        const bulan = document.getElementById("filterBulan").value;

        const user =
            JSON.parse(localStorage.getItem("user")) || {};

        const response = await fetch(
            ABSEN_API +
            "?action=getRekap&bulan=" +
            encodeURIComponent(bulan)
        );

        const data = await response.json();

        if(!data.status){

            tbody.innerHTML =
            `<tr>
                <td colspan="7">
                    Gagal memuat data
                </td>
            </tr>`;

            return;

        }

        rekapGuruData = data.rekap;

        if(
            ["guru","wali kelas"].includes(
                (user.status || "").toLowerCase()
            )
        ){

            rekapGuruData =
            rekapGuruData.filter(r=>

                r.nama
                .trim()
                .toLowerCase()

                ===

                user.nama
                .trim()
                .toLowerCase()

            );

        }

        updateStatistik(rekapGuruData);

        renderRekapTable(rekapGuruData);

    }

    catch(err){

        console.error(err);

        tbody.innerHTML =
        `<tr>
            <td colspan="7">
                Terjadi kesalahan.
            </td>
        </tr>`;

    }

    finally{

        loading.classList.add("hidden");

    }

}


/* =====================================================
   UPDATE CARD STATISTIK
===================================================== */

function updateStatistik(data){

    let totalGuru = data.length;

    let hadir = 0;

    let terlambat = 0;

    let tidakMasuk = 0;

    data.forEach(r=>{

        hadir += Number(r.hadir);

        terlambat += Number(r.terlambat);

        tidakMasuk += Number(r.tidakMasuk);

    });

    document.getElementById("statGuru").innerHTML =
        totalGuru;

    document.getElementById("statHadir").innerHTML =
        hadir;

    document.getElementById("statTerlambat").innerHTML =
        terlambat;

    document.getElementById("statTidakMasuk").innerHTML =
        tidakMasuk;

}


/* =====================================================
   RENDER TABLE
===================================================== */

function renderRekapTable(data){

    const tbody =
        document.getElementById("rekapBody");

    tbody.innerHTML = "";

    if(data.length===0){

        tbody.innerHTML=

        `<tr>

            <td colspan="7">

                Tidak ada data

            </td>

        </tr>`;

        return;

    }

    data.sort((a,b)=>{

        if(b.hadir===a.hadir){

            return a.nama.localeCompare(b.nama);

        }

        return b.hadir-a.hadir;

    });

    data.forEach((guru,index)=>{

        let persen =

            Math.round(

                (guru.hadir/22)

                *100

            );

        if(persen>100) persen=100;

        if(persen<0) persen=0;

        let badge="badge-green";

        if(persen<90){

            badge="badge-orange";

        }

        if(persen<75){

            badge="badge-red";

        }

        tbody.innerHTML +=

        `
        <tr>

            <td>

                ${index+1}

            </td>

            <td>

                <b>${guru.nama}</b>

            </td>

            <td>

                ${guru.hadir}

            </td>

            <td>

                ${guru.terlambat}

            </td>

            <td>

                ${guru.tidakMasuk}

            </td>

            <td>

                <div>

                    <span class="badge ${badge}">

                        ${persen}%

                    </span>

                    <div class="progress">

                        <div
                            class="progress-bar"
                            style="width:${persen}%">
                        </div>

                    </div>

                </div>

            </td>

            <td>

                <button

                    class="btn-primary"

                    onclick="cetakGuru('${guru.nama}')">

                    📄 Cetak

                </button>

            </td>

        </tr>

        `;

    });

}/* =====================================================
   SEARCH REKAP
===================================================== */

function searchRekap(){

    const keyword = document
        .getElementById("searchGuru")
        .value
        .trim()
        .toLowerCase();

    if(keyword===""){

        renderRekapTable(rekapGuruData);

        return;

    }

    const hasil = rekapGuruData.filter(guru=>{

        return guru.nama
            .toLowerCase()
            .includes(keyword);

    });

    renderRekapTable(hasil);

}


/* =====================================================
   REFRESH
===================================================== */

function refreshRekap(){

    document.getElementById("searchGuru").value="";

    loadRekap();

}


/* =====================================================
   EXPORT SELURUH REKAP
===================================================== */

async function exportPDF(){

    try{

        const bulan =
            document.getElementById("filterBulan").value;

        const btn =
            event.target;

        btn.disabled = true;

        btn.innerHTML = "⏳ Membuat PDF...";

        const response = await fetch(

            ABSEN_API,

            {

                method:"POST",

                body:new URLSearchParams({

                    action:"exportRekapPDF",

                    bulan:bulan

                })

            }

        );

        const data = await response.json();

        btn.disabled = false;

        btn.innerHTML = "📄 Export PDF";

        if(!data.status){

            alert(data.message);

            return;

        }

        window.open(data.url,"_blank");

    }

    catch(err){

        alert(err);

    }

}


/* =====================================================
   CETAK SATU GURU
===================================================== */

async function cetakGuru(nama){

    try{

        const bulan =
            document.getElementById("filterBulan").value;

        const response = await fetch(

            ABSEN_API,

            {

                method:"POST",

                body:new URLSearchParams({

                    action:"cetakGuru",

                    nama:nama,

                    bulan:bulan

                })

            }

        );

        const data = await response.json();

        if(!data.status){

            alert(data.message);

            return;

        }

        window.open(

            data.url,

            "_blank"

        );

    }

    catch(err){

        alert(err);

    }

}


/* =====================================================
   FORMAT BULAN
===================================================== */

function namaBulan(no){

    const bulan=[

        "Januari",

        "Februari",

        "Maret",

        "April",

        "Mei",

        "Juni",

        "Juli",

        "Agustus",

        "September",

        "Oktober",

        "November",

        "Desember"

    ];

    return bulan[no];

}


/* =====================================================
   AUTO LOAD
===================================================== */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        if(

            document.getElementById("rekapGuruPage")

        ){

            loadRekap();

        }

    }

);

/* ================= ABSENSI SISWA ================= */

    
async function loadDataSiswa(){
    try{
        kelasFilter.innerHTML = `<option value="">Loading...</option>`;
        namaSiswa.innerHTML = `<option value="">Pilih Nama Siswa</option>`;

        const res = await fetch(ABSEN_API + "?action=getDataSiswa");
        const data = await res.json();

        if(!data.status){
            alert(data.message || "Gagal load siswa");
            return;
        }

        dataSiswaGlobal = data.data;

        // ambil kelas unik
        const kelasList = [...new Set(data.data.map(s => s.kelas))];

        kelasFilter.innerHTML = `<option value="">Pilih Kelas</option>`;
        kelasList.forEach(k=>{
            kelasFilter.innerHTML += `<option value="${k}">${k}</option>`;
        });

    }catch(err){
        alert("Gagal load data siswa");
    }
}

function pilihSiswa(){ const siswa = dataSiswaGlobal.find(x => x.nama === namaSiswa.value); kelasSiswa.value = siswa ? siswa.kelas : ""; }


    function filterKelas(){

    const kelas = kelasFilter.value;

    namaSiswa.innerHTML = `<option value="">Pilih Nama Siswa</option>`;

    if(!kelas) return;

    const siswaKelas = dataSiswaGlobal.filter(s => s.kelas === kelas);

    siswaKelas.forEach(s=>{
        namaSiswa.innerHTML += `<option value="${s.nama}">${s.nama}</option>`;
    });

    kelasSiswa.value = kelas;
}

    function pilihSiswa(){
    const siswa = dataSiswaGlobal.find(x => x.nama === namaSiswa.value);
    kelasSiswa.value = siswa ? siswa.kelas : "";
}
    
    
async function submitAbsenSiswa(){
    try{
        const now = new Date();

        // cek hari minggu
        if(now.getDay() === 0){
            alert("Hari libur tidak bisa absen");
            return;
        }

        if(!kelasFilter.value){
            alert("Pilih kelas terlebih dahulu");
            return;
        }

        if(!namaSiswa.value){
            alert("Pilih siswa");
            return;
        }

        // status terlambat
        let statusKehadiran = "TIDAK TERLAMBAT";

        if(now.getHours() > 7 || (now.getHours() == 7 && now.getMinutes() > 15)){
            statusKehadiran = "TERLAMBAT";
        }

        const payload = {
            action: "absenSiswa",
            hari: now.toLocaleDateString("id-ID",{weekday:"long"}),
            tanggal: now.getDate(),
            bulan: now.toLocaleDateString("id-ID",{month:"long"}),
            nama: namaSiswa.value,
            kelas: kelasSiswa.value,
            kehadiran: kehadiranSiswa.value,
            masuk: now.toLocaleTimeString("id-ID"),
            pulang: "",
            statusKehadiran: statusKehadiran
        };

        const formData = new FormData();

        Object.keys(payload).forEach(key=>{
            formData.append(key, payload[key]);
        });

        const response = await fetch(ABSEN_API,{
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if(data.status){
            alert("Absensi berhasil disimpan");
            namaSiswa.value = "";
        }else{
            alert(data.message || "Absensi gagal");
        }

    }catch(err){
        alert(err);
    }
}

function hitungHariSekolah(bulanDipilih){

    const sekarang =
    new Date();

    const namaBulan = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember"
    ];

    let bulanIndex =
    bulanDipilih
        ? namaBulan.indexOf(bulanDipilih)
        : sekarang.getMonth();

    const tahun =
    sekarang.getFullYear();

    const batasTanggal =
    bulanIndex === sekarang.getMonth()
        ? sekarang.getDate()
        : new Date(
            tahun,
            bulanIndex + 1,
            0
        ).getDate();

    let total = 0;

    for(
        let tgl = 1;
        tgl <= batasTanggal;
        tgl++
    ){

        const d =
        new Date(
            tahun,
            bulanIndex,
            tgl
        );

        const tanggalISO =
            d.getFullYear() +
            "-" +
            String(d.getMonth()+1)
            .padStart(2,"0") +
            "-" +
            String(d.getDate())
            .padStart(2,"0");

        if(
            d.getDay() === 0 ||
            HARI_LIBUR.includes(
                tanggalISO
            )
        ){
            continue;
        }

        total++;

    }

    return total;

}

async function loadRekapSiswa(){

    try{

        const bulan =
        document.getElementById(
            "filterBulanSiswa"
        ).value;

        const kelas =
        document.getElementById(
            "filterKelas"
        ).value;

        const nama =
        document.getElementById(
            "filterNamaSiswaRekap"
        ).value;

        const res =
        await fetch(
            ABSEN_API +
            `?action=getRekapSiswa&bulan=${encodeURIComponent(bulan)}`
        );

        const data =
        await res.json();

        if(!data.status){

            rekapSiswaBox.innerHTML =
            data.message ||
            "Tidak ada data";

            return;

        }

        let rekapData =
        data.rekap || [];

        if(kelas){

            rekapData =
            rekapData.filter(
                r => r.kelas === kelas
            );

        }

        if(nama){

            rekapData =
            rekapData.filter(
                r => r.nama === nama
            );

        }

        const user =
        JSON.parse(
            localStorage.getItem(
                "user"
            )
        );

        if(
            (user.status || "")
            .toLowerCase() ===
            "siswa"
        ){

            rekapData =
            rekapData.filter(
                r =>
                r.nama.trim()
                .toLowerCase() ===
                user.nama.trim()
                .toLowerCase()
            );

        }

        const hariSekolah =
        hitungHariSekolah(
            bulan
        );

        let html = `
        <table>
            <tr>
                <th>Nama</th>
                <th>Kelas</th>
                <th>Hadir</th>
                <th>Izin</th>
                <th>Sakit</th>
                <th>Tidak Masuk</th>
                <th>Terlambat</th>
            </tr>
        `;

        rekapData.forEach(r=>{

            const hadir =
            Number(r.hadir || 0);

            const izin =
            Number(r.izin || 0);

            const sakit =
            Number(r.sakit || 0);

            const tidakMasuk =
            Math.max(
                0,
                hariSekolah -
                (
                    hadir +
                    izin +
                    sakit
                )
            );

            html += `
            <tr>
                <td>${r.nama}</td>
                <td>${r.kelas || '-'}</td>
                <td>${hadir}</td>
                <td>${izin}</td>
                <td>${sakit}</td>
                <td>${tidakMasuk}</td>
                <td>${r.terlambat || 0}</td>
            </tr>
            `;

        });

        html += `
        </table>
        `;

        document.getElementById(
            "rekapSiswaBox"
        ).innerHTML = html;

    }catch(err){

        alert(
            "Gagal memuat rekap siswa\n" +
            err.message
        );

    }

}

    async function loadKelasRekap(){

    try{

        const res =
        await fetch(
            ABSEN_API + "?action=getDataSiswa"
        );

        const data = await res.json();

        if(!data.status) return;

        const select =
        document.getElementById("filterKelas");

        const kelasList =
        [...new Set(
            data.data.map(s => s.kelas)
        )];

        select.innerHTML =
        '<option value="">Semua Kelas</option>';

        kelasList.sort().forEach(kelas=>{

            select.innerHTML += `
                <option value="${kelas}">
                    ${kelas}
                </option>
            `;

        });

    }catch(err){

        console.error(err);

    }

}

    function gantiKelasRekap(){

    document.getElementById(
        "filterNamaSiswaRekap"
    ).value = "";

    loadFilterNamaSiswa();

    loadRekapSiswa();

}

            
async function exportPDFSiswa(){
    try{
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); let bulan = filterBulanSiswa.value || "Semua Bulan";
        let res = await fetch(ABSEN_API + `?action=getRekapSiswa&bulan=${bulan}`); let data = await res.json();
        doc.setFontSize(18); doc.text("REKAP ABSENSI SISWA", 60, 20); doc.setFontSize(12); doc.text("Bulan : " + bulan, 20, 30);
        let startY = 45; doc.setFillColor(37,99,235); doc.rect(15,startY-7,180,10,"F"); doc.setTextColor(255,255,255);
        doc.text("NO",20,startY); doc.text("NAMA",35,startY); doc.text("H",110,startY); doc.text("I",130,startY); doc.text("S",145,startY); doc.text("T",165,startY);
        doc.setTextColor(0,0,0); let y = startY + 10;
        data.rekap.forEach((r,index)=>{
            doc.rect(15,y-7,180,10); doc.text(String(index+1),20,y); doc.text(String(r.nama),35,y); doc.text(String(r.hadir),112,y); doc.text(String(r.izin),130,y); doc.text(String(r.sakit),145,y); doc.text(String(r.terlambat),165,y);
            y += 10; if(y > 270){ doc.addPage(); y = 20; }
        });
        doc.save("Rekap_Absensi_Siswa.pdf");
    }catch(err){ alert(err); }
}
