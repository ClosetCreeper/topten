// /api/tripapi.js
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const CONTAINER = 'iCloud.keyninestudios.topten';
const DATABASE = 'public';
const ENVIRONMENT = 'development'; // Change to 'production' when ready
const KEY_ID = 'd1bb78c89aa70961797b9e17e9c25dd876cf0a84f19d20a8b5d7a7bcb26954fa';
const PRIVATE_KEY = process.env.CK_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!PRIVATE_KEY) {
  console.error('ERROR: CK_PRIVATE_KEY is not defined in environment variables.');
}

function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: KEY_ID,
    iat: now,
    exp: now + 300, // token valid for 5 minutes
    aud: 'https://apple-cloudkit.com',
  };
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'ES256' });
}

async function lookupRecords(recordNames, jwtToken) {
  const res = await fetch(
    `https://api.apple-cloudkit.com/database/1/${CONTAINER}/${ENVIRONMENT}/${DATABASE}/records/lookup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: recordNames }),
    }
  );

  const data = await res.json();
  if (!data.records) throw new Error('Lookup failed or no records found.');
  return data.records;
}

async function queryPhotoEntries(userRef, placeRef, jwtToken) {
  const res = await fetch(
    `https://api.apple-cloudkit.com/database/1/${CONTAINER}/${ENVIRONMENT}/${DATABASE}/records/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recordType: 'Top10PhotoEntries',
        filterBy: [
          {
            fieldName: 'user',
            comparator: 'EQUALS',
            fieldValue: { value: { recordName: userRef, type: 'REFERENCE' } },
          },
          {
            fieldName: 'place',
            comparator: 'EQUALS',
            fieldValue: { value: { recordName: placeRef, type: 'REFERENCE' } },
          },
        ],
      }),
    }
  );
  const data = await res.json();
  return data.records || [];
}

export default async function handler(req, res) {
  try {
    const { trip } = req.query;
    if (!trip) return res.status(400).json({ error: 'Missing trip ID' });

    const jwtToken = generateJWT();

    // 1️⃣ Fetch Top10UserProgress
    const [progressRecord] = await lookupRecords([trip], jwtToken);

    // 2️⃣ Fetch AppUser
    const userRef = progressRecord.fields.user.value.recordName;
    const [userRecord] = await lookupRecords([userRef], jwtToken);

    // 3️⃣ Fetch Place
    const placeRef = progressRecord.fields.place.value.recordName;
    const [placeRecord] = await lookupRecords([placeRef], jwtToken);

    // 4️⃣ Fetch photo entries
    const photoEntries = await queryPhotoEntries(userRef, placeRef, jwtToken);

    // 5️⃣ Group photos by category
    const categories = {};
    photoEntries.forEach((p) => {
      const cat = p.fields.category;
      if (!categories[cat]) categories[cat] = { photoURLs: [], captions: [], locations: [], coordinates: [] };
      categories[cat].photoURLs.push(p.fields.photoData.value);
      categories[cat].captions.push(p.fields.caption?.value || '');
      categories[cat].locations.push(p.fields.location?.value || '');
      categories[cat].coordinates.push({
        latitude: p.fields.latitude?.value || 0,
        longitude: p.fields.longitude?.value || 0,
      });
    });

    // ✅ Respond with JSON
    res.status(200).json({
      tripId: progressRecord.recordName,
      tripName: `${placeRecord.fields.name.value}, ${placeRecord.fields.state.value}, ${placeRecord.fields.country.value}`,
      tripDate: progressRecord.fields.completedAt?.value || null,
      milesWalked: progressRecord.fields.milesWalked?.value || 0,
      photoCount: photoEntries.length,
      userId: userRecord.recordName,
      username: userRecord.fields.username.value,
      routeData: progressRecord.fields.routeData?.value || [],
      categories: Object.keys(categories).map((c) => ({ categoryName: c, ...categories[c] })),
    });
  } catch (err) {
    console.error('TripAPI ERROR:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}
