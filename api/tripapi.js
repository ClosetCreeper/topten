// api/tripapi.js
const fetch = require('node-fetch');
const CK_CONTAINER = "iCloud.keyninestudios.topten"; 
const CK_API_TOKEN = "87fad2c397513d683659124ee5317d117d6af88b1b1c35fa6d98c27e46568eed";

// Query Top10UserProgress by webScheme field
async function fetchProgressByWebScheme(webScheme) {
  const url = `https://api.apple-cloudkit.com/database/1/${CK_CONTAINER}/development/public/records/query?ckAPIToken=${CK_API_TOKEN}`;
  
  const body = {
    query: {
      recordType: 'Top10UserProgress',
      filterBy: [
        {
          fieldName: 'webScheme',
          comparator: 'EQUALS',
          fieldValue: { value: webScheme }
        }
      ]
    },
    zoneID: { zoneName: '_defaultZone' }
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

// Query Top10PhotoEntries by user and place references
async function fetchPhotosByUserAndPlace(userRef, placeRef) {
  const url = `https://api.apple-cloudkit.com/database/1/${CK_CONTAINER}/development/public/records/query?ckAPIToken=${CK_API_TOKEN}`;
  
  const body = {
    query: {
      recordType: 'Top10PhotoEntries',
      filterBy: [
        {
          fieldName: 'user',
          comparator: 'EQUALS',
          fieldValue: { value: userRef }
        },
        {
          fieldName: 'place',
          comparator: 'EQUALS',
          fieldValue: { value: placeRef }
        }
      ]
    },
    zoneID: { zoneName: '_defaultZone' }
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

// Get user details by reference
async function fetchUserDetails(userRef) {
  const url = `https://api.apple-cloudkit.com/database/1/${CK_CONTAINER}/development/public/records/lookup?ckAPIToken=${CK_API_TOKEN}`;
  
  const body = {
    records: [
      {
        recordName: userRef.recordName
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
    throw new Error(`User lookup failed: ${response.status} - ${text}`);
  }
  
  const result = await response.json();
  return result.records?.[0] || null;
}

// Get place details by reference
async function fetchPlaceDetails(placeRef) {
  const url = `https://api.apple-cloudkit.com/database/1/${CK_CONTAINER}/development/public/records/lookup?ckAPIToken=${CK_API_TOKEN}`;
  
  const body = {
    records: [
      {
        recordName: placeRef.recordName
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
    throw new Error(`Place lookup failed: ${response.status} - ${text}`);
  }
  
  const result = await response.json();
  return result.records?.[0] || null;
}

// Vercel handler
module.exports = async (req, res) => {
  try {
    console.log('Query params:', req.query); // Debug log
    const { tripScheme } = req.query;
    
    if (!tripScheme) {
      console.log('tripScheme is missing or undefined:', tripScheme);
      res.status(400).json({ 
        error: 'Missing tripScheme parameter',
        receivedParams: req.query 
      });
      return;
    }

    // Get user progress by webScheme
    const progress = await fetchProgressByWebScheme(tripScheme);
    if (!progress) {
      res.status(404).json({ error: `No progress found for webScheme ${tripScheme}` });
      return;
    }

    // Get user and place references
    const userRef = progress.fields?.user?.value;
    const placeRef = progress.fields?.place?.value;
    
    if (!userRef || !placeRef) {
      res.status(500).json({ error: 'Missing user or place reference in progress record' });
      return;
    }

    // Fetch user and place details
    const [userDetails, placeDetails] = await Promise.all([
      fetchUserDetails(userRef),
      fetchPlaceDetails(placeRef)
    ]);

    const username = userDetails?.fields?.username?.value || 'Unknown User';
    const placeName = placeDetails?.fields?.name?.value || 'Unknown Place';
    const completedAt = progress.fields?.completedAt?.value || null;
    const completedCategories = progress.fields?.completedCategories?.value || [];

    // Fetch photos for this user and place
    const photos = await fetchPhotosByUserAndPlace(userRef, placeRef);
    
    const categoriesMap = {};
    photos.forEach(p => {
      const cat = p.fields?.category?.value || 'Uncategorized';
      const photo = p.fields?.photo?.value; // This is a CKAsset
      const caption = p.fields?.caption?.value || '';
      
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { categoryName: cat, photos: [] };
      }
      
      categoriesMap[cat].photos.push({
        photo: photo, // Changed from 'data' to 'photo'
        caption: caption
      });
    });

    const categories = Object.values(categoriesMap);

    res.status(200).json({
      username,
      placeName,
      completedAt,
      completedCategories,
      photoCount: photos.length,
      categories
    });

  } catch (err) {
    console.error('Trip API error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
