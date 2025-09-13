import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const CONTAINER = 'iCloud.keyninestudios.topten';
const DATABASE = 'public';
const ENVIRONMENT = 'development';
const KEY_ID = 'd1bb78c89aa70961797b9e17e9c25dd876cf0a84f19d20a8b5d7a7bcb26954fa';
const PRIVATE_KEY = process.env.CK_PRIVATE_KEY?.replace(/\\n/g, '\n');

function generateJWT() {
  if (!PRIVATE_KEY) throw new Error('CK_PRIVATE_KEY missing or malformed!');
  return jwt.sign({ iss: KEY_ID, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, aud: 'https://apple-cloudkit.com' }, PRIVATE_KEY, { algorithm: 'ES256' });
}

export default async function handler(req, res) {
  try {
    console.log('Request query:', req.query);
    const { trip } = req.query;
    if (!trip) return res.status(400).json({ error: 'Missing trip ID' });

    const token = generateJWT();
    console.log('JWT generated successfully');

    const lookup = await fetch(`https://api.apple-cloudkit.com/database/1/${CONTAINER}/${ENVIRONMENT}/${DATABASE}/records/lookup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [trip] }),
    });
    const lookupData = await lookup.json();
    console.log('Lookup result:', lookupData);

    if (!lookupData.records || lookupData.records.length === 0) return res.status(404).json({ error: 'Trip not found' });

    res.status(200).json({ message: 'Lookup succeeded', lookupData });
  } catch (err) {
    console.error('Error in handler:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}
