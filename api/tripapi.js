// /api/tripapi.js
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const CONTAINER = 'iCloud.keyninestudios.topten';
const DATABASE = 'public';
const ENVIRONMENT = 'development'; // change to 'production' when ready
const KEY_ID = 'd1bb78c89aa70961797b9e17e9c25dd876cf0a84f19d20a8b5d7a7bcb26954fa';

// Replace literal "\n" with actual newlines
const PRIVATE_KEY = process.env.CK_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!PRIVATE_KEY) {
  console.error('CK_PRIVATE_KEY missing or malformed!');
}

function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: KEY_ID,
    iat: now,
    exp: now + 300,
    aud: 'https://apple-cloudkit.com',
  };
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'ES256' });
}

// Helper to fetch a record by recordName
async function fetchRecord(recordName, jwtToken) {
  const res = await fetch(
    `https://api.apple-cloudkit.com/database/1/${CONTAINER}/${ENVIRONMENT}/${DATABASE}/records/lookup`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [recordName] }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lookup failed for ${recordName}: ${res.status} - ${text}`);
  }
  const data = await res.json();
  return data.records?.[0];
}

// Helper to query Top10PhotoEntries
async function fetchPhotos(userRef, placeRef, jwtToken) {
  const res = await fetch(
    `https://api.apple-cloudkit.com/database/1/${CONTAINER}/${ENVIRONMENT}/${DATABASE}/records/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordType: 'Top10PhotoEntries',
        filterBy: [
          { fieldName: 'user', comparator: 'EQUALS', fieldValue: { value: { recordName: userRef, type: 'REFERENCE' } } },
          { fieldName: 'place', comparator: 'EQUALS', fieldValue: { value: { recordName: placeRef, type: 'REFERENCE' } } },
        ],
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Photo query failed: ${res.status} - ${text}`);
  }
  const data = await res.json();
  return data.records || [];
}

export default async function handler(req, res) {
  const { trip } = req.query;

  if (!trip) return res.status(400).json({ error: 'Missing trip ID' });

  try {
    console.log('Fetching trip:', trip);

    const jwtToken = generateJWT();

    const progressRecord = await fetchRecord(trip, jwtToken);
    if (!progressRecord) return res.status(404).json({ error: 'Trip not found' });

    const userRef = progressRecord.fields?.user?.value?.recordName;
    const placeRef = progressRecord.fields?.place?.value?.recordName;

    if (!userRef || !placeRef) {
      return res.status(500).json({ error: 'User or Place reference missing in trip record' });
    }

    const [userRecord, placeRecord, photoRecords] = await Promise.all([
      fetchRecord(userRef, jwtToken),
      fetchRecord(placeRef, jwtToken),
      fetchPhotos(userRef, placeRef, jwtToken),
    ]);

    // Group photos by category
    const categories = {};
    photoRecords.forEach((p) => {
      const cat = p.fields?.category?.value || 'Uncategorized';
      if (!categories[cat]) categories[cat] = { photoURLs: [], captions: [], locations: [], coordinates: [] };
      categories[cat].photoURLs.push(p.fields?.photoData?.value || '');
      categories[cat].captions.push(p.fields?.caption?.value || '');
      categories[cat].locations.push(p.fields?.location?.value || '');
      categories[cat].coordinates.push({
        latitude: p.fields?.latitude?.value || 0,
        longitude: p.fields?.longitude?.value || 0,
      });
    });

    res.status(200).json({
      tripId: progressRecord.recordName,
      tripName: `${placeRecord.fields?.name?.value || ''}, ${placeRecord.fields?.state?.value || ''}, ${placeRecord.fields?.country?.value || ''}`,
      tripDate: progressRecord.fields?.completedAt?.value || null,
      milesWalked: progressRecord.fields?.milesWalked?.value || 0,
      photoCount: photoRecords.length,
      userId: userRecord.recordName,
      username: userRecord.fields?.username?.value || 'Unknown',
      routeData: progressRecord.fields?.routeData?.value || [],
      categories: Object.keys(categories).map((c) => ({ categoryName: c, ...categories[c] })),
    });

  } catch (err) {
    console.error('Trip API error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}
