/* ================= LOGIN ================= */
async function login(){
    try{
        if(!u.value || !p.value){
            alert("Username dan Password harus diisi!");
            return;
        }

        let res=await fetch(API_URL+`?action=login&username=${encodeURIComponent(u.value)}&password=${encodeURIComponent(p.value)}`);
        let data=await res.json();
        if(!data.status){ alert("Login gagal"); return; }
        
        let user = data.user;

        // Bersihkan format link Google Drive sesaat setelah login berhasil
        if (user.foto && user.foto.includes("drive.google.com/file/d/")) {
            user.foto = user.foto.replace("/view?usp=sharing", "")
                                 .replace("/view", "")
                                 .replace("file/d/", "uc?export=view&id=");
        }

        localStorage.setItem("user", JSON.stringify(user));
        loadDashboard(user);
    }catch(err){ alert(err); }
}

function cekLogin(){
    const savedUser = localStorage.getItem("user");
    if(savedUser){
        let user = JSON.parse(savedUser);

        if (user.foto && user.foto.includes("drive.google.com/file/d/")) {
            user.foto = user.foto.replace("/view?usp=sharing", "")
                                 .replace("/view", "")
                                 .replace("file/d/", "uc?export=view&id=");
            localStorage.setItem("user", JSON.stringify(user));
        }

        loadDashboard(user);
    } else {
        nav("loginPage");
    }
}

function logout(){ localStorage.clear(); location.reload(); }

function canShowMenu(menuName, status){
    menuName = menuName.toLowerCase();
    status = status.toLowerCase();

    if (
        status === "admin" ||
        status === "kepala sekolah"
    ) return true;

    if(status === "wali kelas")
        return ["absensi","raport","materi","latihan"].includes(menuName);

    if(status === "guru")
        return ["absensi","materi","latihan"].includes(menuName);

    if(status === "siswa")
        return ["tabungan","materi","latihan","absensi"].includes(menuName);

    return false;
}


let usernameLama = "";
/*=========EDIT AKUN=============*/
function openEditAkun(){

    document.getElementById("editNama").value =
        currentUser.nama || "";

    document.getElementById("editUsername").value =
        currentUser.username || "";

    document.getElementById("editPassword").value = "";

    document.getElementById("previewFoto").src =
        currentUser.foto ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    usernameLama = currentUser.username || "";

    nav("editAkun");
}
/*===============SIMPAN AKUN=======*/
async function simpanAkun() {
try {

    const fotoInput = document.getElementById("fotoFile");
    const file = fotoInput ? fotoInput.files[0] : null;

    let foto = "";
    if (file) {
        foto = await compressImage(file);
    }

    const nama = document.getElementById("editNama").value.trim();
    const username = document.getElementById("editUsername").value.trim();

    if (!nama) return alert("Nama wajib diisi");
    if (!username) return alert("Username wajib diisi");

    const data = {
        nama,
        username,
        usernameLama,
        password: document.getElementById("editPassword").value.trim(),
        foto
    };

    const payload = {
        action: "updateAkun",
        data: data
    };

    const res = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
    });

    const text = await res.text();
const json = JSON.parse(text);

    if (!json.status) {
        return alert(json.message || "Gagal memperbarui akun");
    }

    alert("Akun berhasil diperbarui");

    currentUser.nama = data.nama;
    currentUser.username = data.username;

    if (json.foto) currentUser.foto = json.foto;

    localStorage.setItem("user", JSON.stringify(currentUser));

    if (fotoInput) fotoInput.value = "";

    loadDashboard(currentUser);

} catch (err) {
    console.error("Update Akun Error:", err);
    alert("Terjadi kesalahan : " + err.message);
}
}
