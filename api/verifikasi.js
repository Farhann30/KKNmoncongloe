const { google } = require('googleapis');

const SHEET_ID = '1t8KzMWdZ6L6slrF89_s-oHDGNMQj34rGIiHlCcAhBYE';
const SHEET_NAME = 'Devices';

function getGoogleCredentials() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT env variable not set');
  }
  return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
}

async function getSheetsClient() {
  const credentials = getGoogleCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  return sheets;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Daftarkan device
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId wajib diisi' });
    }
    try {
      const sheets = await getSheetsClient();
      // Cek apakah sudah ada
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:A`,
      });
      const rows = getRes.data.values || [];
      const sudahAda = rows.some(row => row[0] === deviceId);
      if (sudahAda) {
        return res.status(200).json({ success: true, message: 'Device sudah terverifikasi' });
      }
      // Tambahkan deviceId ke sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:A`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[deviceId]] },
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Gagal verifikasi device:', err);
      return res.status(500).json({ success: false, message: 'Gagal verifikasi device' });
    }
  } else if (req.method === 'GET') {
    // Cek status device
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ verified: false, message: 'deviceId wajib diisi' });
    }
    try {
      const sheets = await getSheetsClient();
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:A`,
      });
      const rows = getRes.data.values || [];
      const verified = rows.some(row => row[0] === deviceId);
      return res.status(200).json({ verified });
    } catch (err) {
      console.error('Gagal cek verifikasi device:', err);
      return res.status(500).json({ verified: false, message: 'Gagal cek verifikasi device' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
} 