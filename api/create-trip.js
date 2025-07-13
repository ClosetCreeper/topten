import { createClient } from '@supabase/supabase-js'

// Hardcoded Supabase credentials
const supabaseUrl = 'https://idasmhlbftmhxibrjqjw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYXNtaGxiZnRtaHhpYnJqcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA2NzMsImV4cCI6MjA2NzkxNjY3M30.aWcHB8Aalo4_1APEjXs-3Ag6dOMbomr95T_Tj4BUUdc'

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      tripId,
      tripName,
      tripDate,
      milesWalked,
      photoCount,
      userId,
      categories,
      routeData
    } = req.body

    // Validate required fields
    if (!tripId || !tripName || !tripDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: tripId, tripName, tripDate' 
      })
    }

    // Insert trip data into Supabase
    const { data, error } = await supabase
      .from('trips')
      .insert([
        {
          trip_id: tripId,
          trip_name: tripName,
          trip_date: tripDate,
          miles_walked: milesWalked || 0,
          photo_count: photoCount || 0,
          user_id: userId || null,
          categories: categories || [],
          route_data: routeData || []
        }
      ])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ 
        error: 'Failed to save trip data',
        details: error.message 
      })
    }

    // Generate the shareable URL
    const tripUrl = `https://topten.keyninestudios.com/trip/${tripId}`

    return res.status(200).json({
      success: true,
      tripId: tripId,
      tripUrl: tripUrl,
      message: 'Trip created successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
} 
