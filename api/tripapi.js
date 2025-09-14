// api/tripapi.js
const fetch = require('node-fetch');
const CK_CONTAINER = "iCloud.keyninestudios.topten"; 
const CK_API_TOKEN = "1bab850cbdcaffa45d64df96aa7ac56781f0028a3f34dddb58276819a7859e59";

// Query user progress by tripScheme
async function fetchProgressByTripScheme(tripScheme) {
  const url = `https://api.apple-cloudkit.com/database/1/${CK_CONTAINER}/development/public/records/query?ckAPIToken=${CK_API_TOKEN}`;
  
  const body = {
    recordType: 'Top10UserProgress',
    filterBy: [
      {
        fieldName: 'tripScheme',
        comparator: 'EQUALS',
        fieldValue: { value: tripScheme }
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
    throw new Error(`Progress query failed for ${tripScheme}: ${response.status} - ${text}`);
  }
  
  const result = await response.json();
  return result.records?.[0] || null;
}

// Query photos tied to a trip scheme
async function fetchPhotosByTripScheme(tripScheme) {
  const url = `https://api.apple-cloudkit.com/database/1/${CK_CONTAINER}/development/public/records/query?ckAPIToken=${CK_API_TOKEN}`;
  
  const body = {
    recordType: 'TripPhoto',
    filterBy: [
      {
        fieldName: 'tripScheme',
        comparator: 'EQUALS',
        fieldValue: { value: tripScheme }
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
    const { tripScheme } = req.query;
    
    if (!tripScheme) {
      res.status(400).json({ error: 'Missing tripScheme parameter' });
      return;
    }

    // Get user progress
    const progress = await fetchProgressByTripScheme(tripScheme);
    if (!progress) {
      res.status(404).json({ error: `No progress found for tripScheme ${tripScheme}` });
      return;
    }

    const username = progress.fields?.username?.value || 'Unknown User';
    const tripName = progress.fields?.tripName?.value || 'Unknown Trip';
    const tripDate = progress.fields?.tripDate?.value || null;
    const milesWalked = progress.fields?.milesWalked?.value || 0;

    // Fetch photos for the trip scheme
    const photos = await fetchPhotosByTripScheme(tripScheme);
    
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
