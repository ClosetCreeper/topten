export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // Check if environment variables are set
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY

    return res.status(200).json({
      success: true,
      message: 'Test endpoint working',
      envVars: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        supabaseUrlLength: supabaseUrl ? supabaseUrl.length : 0,
        supabaseKeyLength: supabaseKey ? supabaseKey.length : 0
      }
    })
  } catch (error) {
    console.error('Test API error:', error)
    return res.status(500).json({
      error: 'Test failed',
      details: error.message
    })
  }
}
