window.API_URL = "https://script.google.com/macros/s/AKfycbwFHgAK8rezu-3WjL_FWS6EN1GXDrDqRS81iu0KTArcGx8zwoVXJCT_zK2SIGEM0qGq/exec";
window.ABSEN_API = "https://script.google.com/macros/s/AKfycbxIdtImYj2YCJEcW2Q2dfn9pkjzgq88qnhB_kdln021rUdmqJEh2jQiz1kL0qeYRI8l/exec";
window.TABUNGAN_API = "https://script.google.com/macros/s/AKfycbyCWL9Xrt-Dq4Cc4eah9OSYqYCGxY9tChXYYPSwOKwysNkZo4pgDbBVe6-YYDPmjVY/exec";
window.JADWAL_API = "https://script.google.com/macros/s/AKfycbzE8W8Rd6coOfao7YLVZgW9-CWVPe6Nl3TQ0qy6X0r04oLbK1_brfl8yCq7HYysOSILMA/exec";
window.Quiz_API ="https://script.google.com/macros/s/AKfycbx76vMYaeEvwBdtM0sDrqFPDN7n78Z9qMVysyloix652KBctCHysJYRYyz3g2XjZWZ7/exec";


let history = [];
let currentUser = null;
let dataSiswaGlobal = [];
let dataSiswaTabungan = [];
let dataSiswaRaport = [];
let dataSiswaKognitif = [];
let dataSoal=[];
let dataIjazah = [];
let dataIjazahMD = [];

Object.assign(window, {
    loadRekap,
    searchRekap,
    exportPDF,
    cetakGuru
});
