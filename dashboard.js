async function loadDashboard(user){

    try{

        currentUser = user;

        nav("dashboard");

        if(window.nama)
            nama.innerText = user.nama;

        if(window.kelas)
            kelas.innerText = user.kelas || "";

        const statusEl = document.getElementById("status");

        if(statusEl)
            statusEl.textContent = user.status || "-";

        const targetFoto = document.getElementById("foto");

        if(targetFoto){

            targetFoto.src =
                user.foto ||
                "https://cdn-icons-png.flaticon.com/512/149/149071.png";

            targetFoto.onerror = function(){

                this.src =
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

            };

        }

        const url = API_URL + "?action=getMenus";

console.log("API_URL =", API_URL);
console.log("URL =", API_URL + "?action=getMenus");

const res = await fetch(url);

console.log("Status =", res.status);
console.log("Final URL =", res.url);

if(!res.ok){
    const text = await res.text();
    console.log(text);
    alert("Status : " + res.status);
    return;


        }

        const data = await res.json();

        console.log(data);

        if(!data.menus || !Array.isArray(data.menus)){

            console.error("Response tidak valid", data);

            alert("Data menu tidak valid");

            return;

        }

        menuBox.innerHTML = "";

        data.menus
            .filter(m =>
                canShowMenu(
                    m.name,
                    user.status || ""
                )
            )
            .forEach(m => {

                menuBox.innerHTML += `
                    <div class="menu-card"
                         onclick="openMenu('${m.id}','${m.name}')">
                        <img src="${m.icon}">
                        <div>${m.name}</div>
                    </div>
                `;

            });

        loadJadwalSekarang();

    }catch(err){

        console.error("loadDashboard Error :", err);

        alert("Terjadi kesalahan : " + err.message);

    }

}

async function loadJadwalSekarang(){
    try{
        const res = await fetch(JADWAL_API + "?action=jadwalSekarang");
        const data = await res.json();
        if(!data.status){ jadwalSekarang.innerHTML = "Tidak ada jadwal"; return; }
        let html = `<table><tr><th>Kelas</th><th>Mapel</th><th>Guru</th><th>Jam</th></tr>`;
        data.data.forEach(r=>{ html += `<tr><td>${r.kelas}</td><td>${r.mapel}</td><td>${r.guru}</td><td>${r.jamMulai} - ${r.jamSelesai}</td></tr>`; });
        html += `</table>`;
        jadwalSekarang.innerHTML = html;
    }catch(err){ console.log(err); }
}

async function loadJadwalHariIni(){
    try{
        const kelas = document.getElementById("pilihKelas").value;
        if(!kelas){ jadwalHariIni.innerHTML = "Pilih kelas terlebih dahulu"; return; }
        const res = await fetch(JADWAL_API + "?action=jadwalHariIni&kelas=" + encodeURIComponent(kelas));
        const data = await res.json();
        if(!data.status || data.data.length===0){ jadwalHariIni.innerHTML = "Tidak ada jadwal"; return; }
        let html = `<table><tr><th>Jam</th><th>Mapel</th><th>Guru</th></tr>`;
        data.data.forEach(r=>{ html += `<tr><td>${r.jamMulai} - ${r.jamSelesai}</td><td>${r.mapel}</td><td>${r.guru}</td></tr>`; });
        html += "</table>";
        jadwalHariIni.innerHTML = html;
    }catch(err){ console.log(err); }
}

/* ================= MENU CONTROL ================= */
async function openMenu(id,name){
    if(name.toUpperCase() === "DATA SISWA"){

        nav("dataSiswaPage");

        loadDataSiswaPage();

        return;
    }
    currentMenuName = name;
    nav("submenuPage");
    menuTitle.innerText = name;
    let res = await fetch(API_URL + "?action=getSubmenu&menu_id=" + id);
    let data = await res.json();
    subBox.innerHTML = "";
    const user = JSON.parse(localStorage.getItem("user"));
    data.submenu.filter(s => canShowSubmenu(currentMenuName, s.name, (user.status || ""))).forEach(s=>{
        const card = document.createElement("div");
        card.className = "menu-card";
        card.innerHTML = `<img src="${s.icon || ''}"><div>${s.name}</div>`;
        card.onclick = () => { handleSubmenu(s.type, s.value, s.name); };
        subBox.appendChild(card);
    });
}

async function handleSubmenu(type, value, title) {
    nav(value);

    const user = JSON.parse(localStorage.getItem("user"));

    if (value === "absenGuruPage")
        absenNama.value = user.nama || "";

    if (value === "absenSiswaPage")
        loadDataSiswa();

    if (value === "rekapPage")
        loadRekap();

    if (value === "loginQuiz")
        mulai();

    if (value === "rekapSiswaPage") {
        await loadKelasRekap();
        loadFilterNamaSiswa();
        loadRekapSiswa();
    }

    if (value === "tabunganPage"){
        loadKelasTabungan();
    }

    if (value === "rekapTabunganPage") {
        loadFilterKelasTabungan();
        loadRekapTabungan();
    }

    if (type === "link") {
        window.open(value, "_blank");
        return;
    }

    if (type === "content") {
        nav("contentPage");
        contentTitle.innerText = title;
        contentBody.innerHTML = value;
        return;
    }
}


function canShowMenu(menuName, status){
    menuName = menuName.toLowerCase();
    status = status.toLowerCase();

    if(status === "admin" || status === "kepala sekolah") return true;

    if(status === "guru" || status === "wali kelas")
        return ["absensi","materi","latihan"].includes(menuName);

    if(status === "siswa")
        return ["tabungan","materi","latihan","absensi"].includes(menuName);

    return false;
}

function canShowSubmenu(menuName, submenuName, status){
    menuName = menuName.toLowerCase();
    submenuName = submenuName.toLowerCase();
    status = status.toLowerCase();

    if(status === "admin" || status === "kepala sekolah")
        return true;

    if(status === "guru" || status === "wali kelas"){
        if(menuName === "materi" || menuName === "latihan")
            return true;

        if(menuName === "absensi"){
            return submenuName.includes("absen guru") ||
                   submenuName.includes("absen siswa") ||
                   submenuName.includes("rekap siswa") ||
                   submenuName.includes("rekap absensi");
        }

        return false;
    }

    if(status === "siswa"){
        if(menuName === "materi" || menuName === "latihan")
            return true;

        if(menuName === "tabungan")
            return submenuName.includes("lihat tabungan");

        if(menuName === "absensi"){
            return submenuName.includes("rekap siswa") ||
                   submenuName.includes("rekap absensi siswa");
        }

        return false;
    }

    return false;
}
