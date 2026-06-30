async function loadPages() {
    const app = document.getElementById("app");
    
    // 1. Ambil file HTML eksternal
    const res = await fetch("page.html");
    app.innerHTML = await res.text();
    
    // 2. Tampilkan Splash Screen terlebih dahulu
    show("splash");

    // 3. Ambil data user dari penyimpanan lokal
    const user = JSON.parse(localStorage.getItem("user"));

    // 4. Berikan jeda waktu Splash Screen (misal: 2.5 detik agar terlihat smooth)
    setTimeout(() => {
    if (typeof cekLogin === "function") {
        cekLogin();
    } else {
        nav("loginPage");
    }
}, 2500); // Waktu tampil splash screen (2500ms = 2.5 detik)
}

window.onload = loadPages;
