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

document.getElementById("jenisAbsen").addEventListener("change", function(){

    const fotoGroup = document.getElementById("fotoGroup");

    if(this.value=="PULANG"){
        fotoGroup.style.display="none";
    }else{
        fotoGroup.style.display="block";
    }

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
    

async function loadRekap(){
    try{
        const bulan = document.getElementById("filterBulan").value;
        const user = JSON.parse(localStorage.getItem("user"));
        const res = await fetch(ABSEN_API + `?action=getRekap&bulan=${encodeURIComponent(bulan)}`);
        const data = await res.json();
        if(!data.status){ rekapBox.innerHTML = "Gagal memuat data"; return; }
        let rekapData = data.rekap;
        if(["guru", "wali kelas"].includes((user.status || "").toLowerCase())){ rekapData = rekapData.filter(r => r.nama.trim().toLowerCase() === user.nama.trim().toLowerCase()); }
        let html = `<table><tr><th>Nama</th><th>Hadir</th><th>Tidak Masuk</th><th>Terlambat</th></tr>`;
        rekapData.forEach(r=>{ html += `<tr><td>${r.nama}</td><td>${r.hadir}</td><td>${r.tidakMasuk}</td><td>${r.terlambat}</td></tr>`; });
        html += `</table>`; rekapBox.innerHTML = html;
    }catch(err){ console.error(err); }
}

async function exportPDF(){
    try{
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); let bulan = filterBulan.value || "Semua Bulan";
        let res = await fetch(ABSEN_API + `?action=getRekap&bulan=${bulan}`); let data = await res.json();
        doc.setFontSize(18); doc.text("REKAP ABSENSI GURU", 70, 20); doc.setFontSize(12); doc.text("Bulan : " + bulan, 20, 30);
        let startY = 45; let rowHeight = 10; let col = {no:20, nama:40, hadir:120, terlambat:160};
        doc.setFillColor(37,99,235); doc.rect(15,startY-7,180,10,"F"); doc.setTextColor(255,255,255);
        doc.text("NO",col.no,startY); doc.text("NAMA",col.nama,startY); doc.text("HADIR",col.hadir,startY); doc.text("TERLAMBAT",col.terlambat,startY);
        doc.setTextColor(0,0,0); let y = startY + 10;
        data.rekap.forEach((r,index)=>{
            doc.rect(15,y-7,180,10); doc.line(30,y-7,30,y+3); doc.line(110,y-7,110,y+3); doc.line(145,y-7,145,y+3);
            doc.text(String(index+1), 20, y); doc.text(String(r.nama), 35, y); doc.text(String(r.hadir), 125, y); doc.text(String(r.terlambat), 165, y);
            y += rowHeight; if(y > 270){ doc.addPage(); y = 20; }
        });
        doc.setFontSize(10); doc.text("Generated by MIS MIFTAHUL MUBTADIIN", 20, 290); doc.save("Rekap_Absensi_Guru.pdf");
    }catch(err){ alert("Gagal export PDF\n"+err); }
}

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
