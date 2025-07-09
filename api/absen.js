const { google } = require('googleapis');

const SHEET_ID = '1t8KzMWdZ6L6slrF89_s-oHDGNMQj34rGIiHlCcAhBYE';

// Ambil credential dari environment variable (Vercel)
function getGoogleCredentials() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT env variable not set');
  }
  return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
}

async function appendToSheet(data, auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const values = [[data.nama, data.waktu, data.latitude, data.longitude, data.deviceId, data.flag]];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:F',
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  const { nama, waktu, latitude, longitude, deviceId } = req.body;
  if (!waktu || !latitude || !longitude || !deviceId) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
  }
  try {
    // Setup Google Auth dari env
    const credentials = getGoogleCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const today = new Date(waktu).toISOString().slice(0, 10);
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:F',
    });
    let flag = '';
    if (getRes.data.values) {
      const rows = getRes.data.values;
      for (let i = 1; i < rows.length; i++) {
        const [rowNama, rowWaktu, , , rowDeviceId] = rows[i];
        if (rowDeviceId === deviceId) {
          const rowDate = rowWaktu ? rowWaktu.slice(0, 10) : '';
          if (rowNama !== nama && rowDate === today) {
            flag = 'Device sama dipakai nama berbeda hari ini';
            break;
          }
        }
      }
    }
    await appendToSheet({ nama, waktu, latitude, longitude, deviceId, flag }, client);
    res.status(200).json({ success: true, flag });
  } catch (err) {
    console.error('Gagal menyimpan ke Google Sheets:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan ke Google Sheets.' });
  }
} 