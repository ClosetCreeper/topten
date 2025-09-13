// /api/tripapi.js
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const CONTAINER = 'iCloud.keyninestudios.topten';
const DATABASE = 'public';
const ENVIRONMENT = 'development'; // change to 'production' when ready
const KEY_ID = 'd1bb78c89aa70961797b9e17e9c25dd876cf0a84f19d20a8b5d7a7bcb26954fa';
// Read private key from env and ensure real line breaks
const PRIVATE_KEY = process.env.CK_PRIVATE_KEY.replace(/\\n/g, '\n');


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

export default async function handler(req, res) {
  const { trip } = req.query;
  if (!trip) return res.status(400).json({ error: 'Missing trip ID' });

  try {
    const jwtToken = generateJWT();

    // Lookup Top10UserProgress record by recordName
    const lookupRes = await fetch(
      `https://api.apple-cloudkit.com/database/1/${CONTAINER}/${ENVIRONMENT}/${DATABASE}/records/lookup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [trip] }),
      }
    );

    const lookupData = await lookupRes.json();
    if (lookupData.records?.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const progressRecord = lookupData.records[0];

    // Fetch AppUsers
    const userRef = progressRecord.fields.user.value.recordName;
    const userRes = await fetch(
      `https://api.apple-cloudkit.com/database/1/${CONTAINER}/${ENVIRONMENT}/${DATABASE}/records/lookup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [userRef] }),
      }
    );
    const userData = await userRes.json();

    // Fetch Place
    const placeRef = progressRecord.fields.place.value.recordName;
    const placeRes = await fetch(
      `https://api.apple-cloudkit.com/database/1/${CONTAINER}/${ENVIRONMENT}/${DATABASE}/records/lookup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [placeRef] }),
      }
    );
    const placeData = await placeRes.json();

    // Fetch Top10PhotoEntries
    const queryRes = await fetch(
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
            { fieldName: 'user', comparator: 'EQUALS', fieldValue: { value: { recordName: userRef, type: 'REFERENCE' } } },
            { fieldName: 'place', comparator: 'EQUALS', fieldValue: { value: { recordName: placeRef, type: 'REFERENCE' } } },
          ],
        }),
      }
    );
    const photoData = await queryRes.json();

    // Group photos by category
    const categories = {};
    (photoData.records || []).forEach((p) => {
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

    res.status(200).json({
      tripId: progressRecord.recordName,
      tripName: `${placeData.records[0].fields.name.value}, ${placeData.records[0].fields.state.value}, ${placeData.records[0].fields.country.value}`,
      tripDate: progressRecord.fields.completedAt?.value || null,
      milesWalked: progressRecord.fields.milesWalked?.value || 0,
      photoCount: photoData.records?.length || 0,
      userId: userData.records[0].recordName,
      username: userData.records[0].fields.username.value,
      routeData: progressRecord.fields.routeData?.value || [],
      categories: Object.keys(categories).map((c) => ({ categoryName: c, ...categories[c] })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}
