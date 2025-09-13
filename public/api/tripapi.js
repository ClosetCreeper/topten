import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const PRIVATE_KEY_PATH = path.join(process.cwd(), 'private_key.pem'); // Your EC private key
const KEY_ID = 'd1bb78c89aa70961797b9e17e9c25dd876cf0a84f19d20a8b5d7a7bcb26954fa';
const TEAM_ID = '6542SYHMVS'; // Replace with your Apple Developer Team ID
const CONTAINER = 'iCloud.keyninestudios.topten';
const DATABASE_SCOPE = 'public';

export default async function handler(req, res) {
  const tripId = req.query.trip;
  if (!tripId) return res.status(400).json({ error: 'No trip specified' });

  try {
    // --- Create JWT for server-to-server ---
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      issuer: TEAM_ID,
      issuedAt: now,
      expiresIn: '5m',
      keyid: KEY_ID,
    });

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // --- Step 1: Fetch Top10UserProgress ---
    const progressRes = await fetch(`https://api.apple-cloudkit.com/database/1/${CONTAINER}/development/${DATABASE_SCOPE}/records/lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recordNames: [tripId] }),
    });

    const progressData = await progressRes.json();
    if (!progressData.records || progressData.records.length === 0) throw new Error('Trip not found');

    const progressRecord = progressData.records[0].fields;
    const userId = progressRecord.user.value.recordName;
    const placeId = progressRecord.place.value.recordName;

    // --- Step 2: Fetch Place ---
    const placeRes = await fetch(`https://api.apple-cloudkit.com/database/1/${CONTAINER}/development/${DATABASE_SCOPE}/records/lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recordNames: [placeId] }),
    });
    const placeData = await placeRes.json();
    const placeRecord = placeData.records[0].fields;

    // --- Step 3: Fetch User ---
    const userRes = await fetch(`https://api.apple-cloudkit.com/database/1/${CONTAINER}/development/${DATABASE_SCOPE}/records/lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recordNames: [userId] }),
    });
    const userData = await userRes.json();
    const userRecord = userData.records[0].fields;

    // --- Step 4: Fetch Photos ---
    const queryBody = {
      recordType: 'Top10PhotoEntries',
      filterBy: [
        { fieldName: 'user', comparator: 'EQUALS', fieldValue: { value: { recordName: userId, type: 'REFERENCE' } } },
        { fieldName: 'place', comparator: 'EQUALS', fieldValue: { value: { recordName: placeId, type: 'REFERENCE' } } }
      ]
    };

    const photosRes = await fetch(`https://api.apple-cloudkit.com/database/1/${CONTAINER}/development/${DATABASE_SCOPE}/records/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(queryBody),
    });

    const photosData = await photosRes.json();

    // --- Group photos by category ---
    const categories = {};
    photosData.records.forEach(p => {
      const catName = p.fields.category;
      if (!categories[catName]) categories[catName] = { categoryName: catName, photoURLs: [], captions: [] };
      const base64Data = p.fields.photoData.value; // assuming CKAsset returned as base64
      categories[catName].photoURLs.push(`data:image/jpeg;base64,${base64Data}`);
      categories[catName].captions.push(p.fields.caption || '');
    });

    // --- Final Response ---
    res.status(200).json({
      tripId,
      tripName: `${placeRecord.name}, ${placeRecord.state}, ${placeRecord.country}`,
      tripDate: progressRecord.completedAt?.value || null,
      milesWalked: 0,
      photoCount: photosData.records.length,
      userId,
      username: userRecord.username,
      routeData: [],
      categories: Object.values(categories),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
