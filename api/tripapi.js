// api/tripapi.js
const fetch = require('node-fetch');

const CK_CONTAINER = "iCloud.keyninestudios.topten"; 
const CK_API_TOKEN = "1bab850cbdcaffa45d64df96aa7ac56781f0028a3f34dddb58276819a7859e59";

// Query user progress by webScheme
async function fetchProgressByScheme(webScheme) {
  const url = `https://api.apple-cloudkit.com/database/1/${CK_CONTAINER}/development/public/records/query?ckAPIToken=${CK_API_TOKEN}`;
  
  const body = {
    recordType: 'Top10UserProgress',
    filterBy: [
      {
        fieldName: 'webScheme',
        comparator: 'EQUALS',
        fieldValue: { value: webScheme }
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Progress query failed for ${webScheme}: ${response.status} - ${text}`);
  }

  const result = await response.json();
  return result.records?.[0] || null;
}

// Query photos tied to a trip
async function fetchPhotos(tripId) {
  const url = `https://api.apple-cloudkit.com/database/1/${CK_CONTAINER}/development/public/records/query?ckAPIToken=${CK_API_TOKEN}`;
  
  const body = {
    recordType: 'TripPhoto',
    filterBy: [
      {
        fieldName: 'tripRef',
        comparator: 'EQUALS',
        fieldValue: { value: { recordName: tripId } }
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Photo query failed: ${response.status} - ${text}`);
  }

  const result = await response.json();
  return result.records || [];
}

// Vercel handler
module.exports = async (req, res) => {
  try {
    const { trip, scheme } = req.query;

    if (!scheme) {
      res.status(400).json({ error: 'Missing scheme' });
      return;
    }

    // Get user progress
    const progress = await fetchProgressByScheme(scheme);
    if (!progress) {
      res.status(404).json({ error: `No progress found for scheme ${scheme}` });
      return;
    }

    const username = progress.fields?.username?.value || 'Unknown User';
    const tripName = progress.fields?.tripName?.value || 'Unknown Trip';
    const tripDate = progress.fields?.tripDate?.value || null;
    const milesWalked = progress.fields?.milesWalked?.value || 0;

    // Fetch photos for the trip
    const photos = await fetchPhotos(trip);

    const categoriesMap = {};
    photos.forEach(p => {
      const cat = p.fields?.category?.value || 'Uncategorized';
      const url = p.fields?.photo?.value.downloadURL;
      const caption = p.fields?.caption?.value || '';

      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { categoryName: cat, photoURLs: [], captions: [] };
      }
      categoriesMap[cat].photoURLs.push(url);
      categoriesMap[cat].captions.push(caption);
    });

    const categories = Object.values(categoriesMap);

    res.status(200).json({
      username,
      tripName,
      tripDate,
      milesWalked,
      photoCount: photos.length,
      categories
    });
  } catch (err) {
    console.error('Trip API error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
