// One Big File: Top 10 Adventures Platform (index.js for Next.js)

import Head from 'next/head';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import 'leaflet/dist/leaflet.css';

export const config = {
  api: {
    bodyParser: true,
  },
};

export async function getServerSideProps({ req, res }) {
  if (req.method === 'POST' && req.url === '/api/create-trip') {
    const { tripId, categories, location, route } = await new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(JSON.parse(body)));
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY // NOTE: Needs to be private, for testing you can keep in env
    );

    const { error: tripError } = await supabase.from('trips').insert({
      id: tripId,
      location_name: location.name,
      lat: location.lat,
      lon: location.lon
    });

    if (tripError) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: tripError }));
      return { props: {} };
    }

    const categoryInserts = categories.map(cat => ({
      trip_id: tripId,
      category: cat.name,
      photo_url: cat.photo_url,
      description: cat.description || ''
    }));
    const { error: catError } = await supabase.from('trip_categories').insert(categoryInserts);

    const { error: routeError } = await supabase.from('trip_routes').insert({
      trip_id: tripId,
      route: route
    });

    if (catError || routeError) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: catError || routeError }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ url: `/trip/${tripId}` }));
    }

    return { props: {} };
  }

  return { props: {} };
}

const Map = dynamic(() => import('react-leaflet').then(mod => {
  return function MapWrapper({ coordinates }) {
    const { MapContainer, TileLayer, Polyline, Marker, Popup } = mod;
    if (!coordinates?.length) return null;
    const [start, ...rest] = coordinates;
    return (
      <MapContainer center={start} zoom={13} style={{ height: '400px', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={start}><Popup>Start</Popup></Marker>
        {rest.length > 0 && <Marker position={rest[rest.length - 1]}><Popup>End</Popup></Marker>}
        <Polyline positions={coordinates} color="purple" />
      </MapContainer>
    );
  }
}), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Top10Adventures() {
  const router = useRouter();
  const { tripId } = router.query;
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    async function fetchTrip() {
      const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).single();
      const { data: categories } = await supabase.from('trip_categories').select('*').eq('trip_id', tripId);
      const { data: route } = await supabase.from('trip_routes').select('*').eq('trip_id', tripId).single();
      setTrip({ ...trip, categories, route });
      setLoading(false);
    }
    fetchTrip();
  }, [tripId]);

  async function createFakeTrip() {
    setCreating(true);
    const tripId = Math.random().toString(36).substring(2, 14);
    const categories = [
      'Food', 'Lodging', 'Nature', 'History', 'Culture',
      'Entertainment', 'Shopping', 'Transportation', 'Other', 'Nightlife'
    ].map(cat => ({ name: cat, photo_url: 'https://via.placeholder.com/400', description: `Awesome ${cat}` }));

    const route = [[37.7749, -122.4194], [37.7750, -122.4185], [37.7752, -122.4175]];

    await fetch('/api/create-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        location: { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
        categories,
        route
      })
    });

    router.push(`/trip/${tripId}`);
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '2rem', background: 'linear-gradient(to bottom, #6a11cb, #2575fc)', minHeight: '100vh', color: 'white' }}>
      <Head>
        <title>Top 10 Adventures</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <main>
        <h1 style={{ fontSize: '2.5rem' }}>Top 10 Adventures</h1>
        {!tripId && (
          <div>
            <p>Create a trip to get started!</p>
            <button onClick={createFakeTrip} disabled={creating} style={{ padding: '1rem', fontSize: '1rem', background: 'white', color: '#2575fc', border: 'none', borderRadius: '8px' }}>
              {creating ? 'Creating...' : 'Create Fake Trip'}
            </button>
          </div>
        )}
        {loading && tripId && <p>Loading trip...</p>}
        {trip && (
          <div>
            <h2 style={{ marginTop: '2rem' }}>{trip.location_name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {trip.categories.map(cat => (
                <div key={cat.category} style={{ background: 'white', color: '#222', borderRadius: '8px', padding: '1rem' }}>
                  <h3>{cat.category}</h3>
                  <img src={cat.photo_url || '/placeholder.jpg'} alt={cat.category} style={{ width: '100%', borderRadius: '8px' }} />
                  <p>{cat.description}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '2rem' }}>
              <Map coordinates={trip.route?.route || []} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
