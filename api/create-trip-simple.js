import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tripId, tripName, tripDate } = req.body;
    
    // Simple insert without categories or routes
    const { data, error } = await supabase
      .from('trips')
      .insert({
        trip_id: tripId,
        trip_name: tripName,
        trip_date: tripDate
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    const tripUrl = `https://topten.keyninestudios.com/trip/${tripId}`;
    
    return res.status(200).json({
      success: true,
      tripId: tripId,
      tripUrl: tripUrl,
      message: 'Trip created successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
