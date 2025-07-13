const admin = require("firebase-admin");

// Ganti path ke serviceAccountKey.json sesuai lokasi file kamu
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const firestore = admin.firestore();

const USERS = [
  { nim: "L051221081", nama: "St.nurkhalisa" },
  { nim: "E011221003", nama: "muhammad maheza inzhagi" }
];

// Tanggal dan sesi sesuai permintaan
const tanggal = "2025-07-13"; // format YYYY-MM-DD
const sesi = "sore"; // sesi sore

async function absenHadir(user) {
  // Ganti path koleksi sesuai struktur Firestore-mu
  // Contoh: absensi/{tanggal}_{sesi}/users/{nim}
  const docRef = firestore
    .collection("absensi")
    .doc(`${tanggal}_${sesi}`)
    .collection("users")
    .doc(user.nim);

  await docRef.set({
    nim: user.nim,
    nama: user.nama,
    status: "hadir",
    waktu: admin.firestore.FieldValue.serverTimestamp()
    // tambahkan field lain jika perlu
  }, { merge: true });

  console.log(`Berhasil absen sore untuk ${user.nama} (${user.nim}) pada ${tanggal}`);
}

async function main() {
  for (const user of USERS) {
    await absenHadir(user);
  }
  process.exit();
}

main().catch(console.error);