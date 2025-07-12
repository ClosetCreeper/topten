// API endpoint for creating trips
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Enable CORS
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
        const {
            tripId,
            tripName,
            tripDate,
            milesWalked,
            photoCount,
            userId,
            categories,
            routeData
        } = req.body;
        
        // Validate required fields
        if (!tripId || !tripName || !tripDate) {
            return res.status(400).json({
                error: 'Missing required fields: tripId, tripName, tripDate'
            });
        }
        
        // Insert trip data
        const { data: trip, error: tripError } = await supabase
            .from('trips')
            .insert({
                trip_id: tripId,
                trip_name: tripName,
                trip_date: tripDate,
                miles_walked: milesWalked || 0,
                photo_count: photoCount || 0,
                user_id: userId || null
            })
            .select()
            .single();
        
        if (tripError) {
            console.error('Error creating trip:', tripError);
            return res.status(500).json({ error: 'Failed to create trip' });
        }
        
        // Insert categories if provided
        if (categories && Array.isArray(categories)) {
            const categoryData = categories.map(category => ({
                trip_id: tripId,
                category_name: category.categoryName,
                photo_url: category.photoURL,
                location_name: category.location,
                latitude: category.coordinates?.latitude || null,
                longitude: category.coordinates?.longitude || null
            }));
            
            const { error: categoriesError } = await supabase
                .from('trip_categories')
                .insert(categoryData);
            
            if (categoriesError) {
                console.error('Error creating categories:', categoriesError);
                // Don't fail the entire request if categories fail
            }
        }
        
        // Insert route data if provided
        if (routeData) {
            const { error: routeError } = await supabase
                .from('trip_routes')
                .insert({
                    trip_id: tripId,
                    route_data: routeData
                });
            
            if (routeError) {
                console.error('Error creating route data:', routeError);
                // Don't fail the entire request if route data fails
            }
        }
        
        // Return success with the trip URL
        const tripUrl = `https://topten.keyninestudios.com/trip/${tripId}`;
        
        return res.status(200).json({
            success: true,
            tripId: tripId,
            tripUrl: tripUrl,
            message: 'Trip created successfully'
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
}
