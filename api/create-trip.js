import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tripId, categories, location, route } = req.body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
  );

  const { error: tripError } = await supabase.from('trips').insert({
    id: tripId,
    location_name: location.name,
    lat: location.lat,
    lon: location.lon
  });

  if (tripError) return res.status(500).json({ error: tripError });

  const categoryInserts = categories.map(cat => ({
    trip_id: tripId,
    category: cat.name,
    photo_url: cat.photo_url,
    description: cat.description || ''
  }));

  const { error: catError } = await supabase.from('trip_categories').insert(categoryInserts);
  const { error: routeError } = await supabase.from('trip_routes').insert({ trip_id: tripId, route });

  if (catError || routeError) {
    return res.status(500).json({ error: catError || routeError });
  }

  res.status(200).json({ url: `/trip/${tripId}` });
}
