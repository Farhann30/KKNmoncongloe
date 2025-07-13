// Script untuk absenkan semua user sesi pagi (kecuali 3 orang tertentu)
// Jalankan di console browser di halaman admin.html

// Firebase config (sesuaikan dengan config yang ada)
const firebaseConfig = {
  apiKey: "AIzaSyCtER1JtiUgxMNu0H4CIr9zyCqK6CTrG1M",
  authDomain: "kknmoncongloe-952e7.firebaseapp.com",
  projectId: "kknmoncongloe-952e7",
  storageBucket: "kknmoncongloe-952e7.firebasestorage.app",
  messagingSenderId: "633205686416",
  appId: "1:633205686416:web:af782584f38ec285c15815",
  measurementId: "G-Q6MKWYT9PG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Nama-nama yang DILARANG absen (akan di-skip)
const SKIP_NAMES = ['Hasril Bahri', 'Nur Hijrah', 'Cecilia Evelyn Hamfri'];

// Tanggal hari ini
const today = new Date().toISOString().split('T')[0];

// Koordinat posko (gunakan koordinat yang sama dengan sistem)
const POSKO_COORDS = {
    'Moncongloe': { lat: -5.135274, lon: 119.536531 },
    'Bonto Bunga': { lat: -5.138959, lon: 119.548104 },
    'Moncongloe Bulu': { lat: -5.148056, lon: 119.558239 }
};

// Fungsi untuk menghitung jarak
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Fungsi utama untuk absenkan semua user
async function absenkanSemuaUserPagi() {
    console.log('🚀 Memulai proses absen massal sesi pagi...');
    console.log('📅 Tanggal:', today);
    console.log('⏰ Sesi: Pagi');
    console.log('❌ Skip untuk:', SKIP_NAMES.join(', '));
    
    try {
        // Ambil semua user
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                ...userData
            });
        });
        
        console.log(`👥 Total user ditemukan: ${users.length}`);
        
        // Filter user yang tidak boleh di-skip
        const usersToAbsen = users.filter(user => !SKIP_NAMES.includes(user.nama));
        console.log(`✅ User yang akan diabsen: ${usersToAbsen.length}`);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        // Proses absen satu per satu
        for (const user of usersToAbsen) {
            try {
                // Cek apakah sudah absen pagi hari ini
                const existingAbsen = await db.collection('absensi')
                    .where('nim', '==', user.nim)
                    .where('tanggal', '==', today)
                    .where('sesi', '==', 'pagi')
                    .get();
                
                if (!existingAbsen.empty) {
                    console.log(`⏭️ ${user.nama} (${user.nim}) - Sudah absen pagi, skip`);
                    skipCount++;
                    continue;
                }
                
                // Ambil koordinat posko sesuai desa user
                const posko = POSKO_COORDS[user.desa];
                if (!posko) {
                    console.log(`⚠️ ${user.nama} (${user.nim}) - Desa tidak ditemukan: ${user.desa}`);
                    errorCount++;
                    continue;
                }
                
                // Buat data absensi
                const absenData = {
                    nim: user.nim,
                    nama: user.nama,
                    desa: user.desa,
                    fakultas: user.fakultas,
                    deviceId: 'SCRIPT_MASS_ABSEN',
                    waktu: new Date().toISOString(),
                    latitude: posko.lat,
                    longitude: posko.lon,
                    sesi: 'pagi',
                    tanggal: today,
                    jarak: 0, // Karena absen dari posko
                    isScriptAbsen: true
                };
                
                // Simpan ke Firestore
                await db.collection('absensi').add(absenData);
                
                console.log(`✅ ${user.nama} (${user.nim}) - Absen pagi berhasil`);
                successCount++;
                
                // Delay kecil untuk menghindari rate limit
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ ${user.nama} (${user.nim}) - Error:`, error.message);
                errorCount++;
            }
        }
        
        // Tampilkan ringkasan
        console.log('\n📊 RINGKASAN ABSEN MASSAL:');
        console.log('========================');
        console.log(`✅ Berhasil: ${successCount} user`);
        console.log(`⏭️ Skip (sudah absen): ${skipCount} user`);
        console.log(`❌ Error: ${errorCount} user`);
        console.log(`📅 Tanggal: ${today}`);
        console.log(`⏰ Sesi: Pagi`);
        console.log('🎉 Proses selesai!');
        
    } catch (error) {
        console.error('❌ Error utama:', error);
    }
}

// Fungsi untuk cek status absen hari ini
async function cekStatusAbsenHariIni() {
    console.log('🔍 Mengecek status absen hari ini...');
    
    try {
        const absenSnapshot = await db.collection('absensi')
            .where('tanggal', '==', today)
            .where('sesi', '==', 'pagi')
            .get();
        
        const absenList = [];
        absenSnapshot.forEach(doc => {
            absenList.push(doc.data());
        });
        
        console.log(`📊 Total absen pagi hari ini: ${absenList.length}`);
        console.log('👥 Daftar yang sudah absen:');
        absenList.forEach(absen => {
            console.log(`  - ${absen.nama} (${absen.nim}) - ${absen.desa}`);
        });
        
    } catch (error) {
        console.error('❌ Error cek status:', error);
    }
}

// Fungsi untuk hapus absen script hari ini (jika perlu)
async function hapusAbsenScriptHariIni() {
    console.log('🗑️ Menghapus absen script hari ini...');
    
    try {
        const absenSnapshot = await db.collection('absensi')
            .where('tanggal', '==', today)
            .where('sesi', '==', 'pagi')
            .where('isScriptAbsen', '==', true)
            .get();
        
        let deleteCount = 0;
        const deletePromises = [];
        
        absenSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
            deleteCount++;
        });
        
        await Promise.all(deletePromises);
        
        console.log(`✅ Berhasil hapus ${deleteCount} absen script`);
        
    } catch (error) {
        console.error('❌ Error hapus absen:', error);
    }
}

// Tampilkan instruksi
console.log('🚀 SCRIPT ABSEN MASSAL SESI PAGI');
console.log('================================');
console.log('Fungsi yang tersedia:');
console.log('1. absenkanSemuaUserPagi() - Absenkan semua user pagi');
console.log('2. cekStatusAbsenHariIni() - Cek status absen hari ini');
console.log('3. hapusAbsenScriptHariIni() - Hapus absen script hari ini');
console.log('');
console.log('❌ User yang akan di-skip:');
SKIP_NAMES.forEach(name => console.log(`  - ${name}`));
console.log('');
console.log('💡 Jalankan: absenkanSemuaUserPagi() untuk mulai'); 