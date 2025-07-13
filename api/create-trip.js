import { createClient } from '@supabase/supabase-js'

// Hardcoded Supabase credentials (using service role for RLS bypass)
const supabaseUrl = 'https://idasmhlbftmhxibrjqjw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYXNtaGxiZnRtaHhpYnJqcWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDY3MywiZXhwIjoyMDY3OTE2NjczfQ.UgfbOIBaVZPyXC5Hq6dAulotfWLlaF65OJ-s-UucBMM'

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
      categories,
      location,
      route
    } = req.body

    // Validate required fields
    if (!tripId) {
      return res.status(400).json({ 
        error: 'Missing required field: tripId' 
      })
    }

    // Insert trip data into Supabase
    const tripName = location?.name || `Trip ${tripId}`
    const tripDate = new Date().toISOString().split('T')[0] // Today's date
    
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .insert([
        {
          trip_id: tripId,
          trip_name: tripName,
          trip_date: tripDate,
          miles_walked: 0, // Will be calculated from route data if available
          photo_count: categories?.length || 0,
          user_id: null
        }
      ])
      .select()

    if (tripError) {
      console.error('Supabase trip error:', tripError)
      return res.status(500).json({ 
        error: 'Failed to save trip data',
        details: tripError.message 
      })
    }

    // Insert categories into trip_categories table
    if (categories && categories.length > 0) {
      const categoryData = categories.map(category => ({
        trip_id: tripId,
        category_name: category.name || category.categoryName,
        photo_url: category.photo_url || category.photoURL,
        location_name: category.description || category.location,
        latitude: location?.lat || 0,
        longitude: location?.lon || 0
      }))

      const { error: categoryError } = await supabase
        .from('trip_categories')
        .insert(categoryData)

      if (categoryError) {
        console.error('Supabase category error:', categoryError)
        return res.status(500).json({ 
          error: 'Failed to save category data',
          details: categoryError.message 
        })
      }
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
