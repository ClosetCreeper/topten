# Top 10 Trip Sharing Platform

A modern web platform for sharing Top 10 adventures, built with Vercel and Supabase.

## Features

- 🎯 **Beautiful Landing Page** - Modern design showcasing the Top 10 concept
- 📱 **Responsive Design** - Works perfectly on all devices
- 🗺️ **Interactive Maps** - Display walking routes with Leaflet.js
- 📸 **Photo Galleries** - Showcase adventure photos by category
- ⚡ **Fast Performance** - Built with modern web technologies
- 🔒 **Secure** - Environment variables and proper CORS handling

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Maps**: Leaflet.js
- **Styling**: Custom CSS with modern design
- **Deployment**: Vercel

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd topten-web
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the following SQL in your Supabase SQL editor:

```sql
-- Trips table
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id VARCHAR(12) UNIQUE NOT NULL,
  trip_name VARCHAR(255) NOT NULL,
  trip_date TIMESTAMP WITH TIME ZONE NOT NULL,
  miles_walked DECIMAL(5,2),
  photo_count INTEGER,
  user_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE trip_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id VARCHAR(12) REFERENCES trips(trip_id),
  category_name VARCHAR(100) NOT NULL,
  photo_url TEXT,
  location_name VARCHAR(255),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route data table
CREATE TABLE trip_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id VARCHAR(12) REFERENCES trips(trip_id),
  route_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 4. Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy the project:
```bash
vercel
```

3. Set up environment variables in Vercel dashboard:
   - Go to your project settings
   - Add the same environment variables as above

### 5. Configure Custom Domain

1. In your Vercel dashboard, go to Settings > Domains
2. Add your custom domain: `topten.keyninestudios.com`
3. Update your DNS settings to point to Vercel's nameservers

## API Endpoints

### POST /api/create-trip

Creates a new trip and returns the shareable URL.

**Request Body:**
```json
{
  "tripId": "abc123def",
  "tripName": "My Adventure",
  "tripDate": "2024-01-15T10:00:00Z",
  "milesWalked": 5.2,
  "photoCount": 10,
  "userId": "user123",
  "categories": [
    {
      "categoryName": "Food",
      "photoURL": "https://example.com/photo.jpg",
      "location": "Downtown Restaurant",
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    }
  ],
  "routeData": [
    {"lat": 40.7128, "lng": -74.0060},
    {"lat": 40.7130, "lng": -74.0062}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "tripId": "abc123def",
  "tripUrl": "https://topten.keyninestudios.com/trip/abc123def",
  "message": "Trip created successfully"
}
```

## URL Structure

- **Landing Page**: `https://topten.keyninestudios.com/`
- **Trip Page**: `https://topten.keyninestudios.com/trip/{tripId}`

## Development

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

### File Structure

```
topten-web/
├── public/              # Static files
│   ├── index.html      # Landing page
│   ├── trip.html       # Trip detail page
│   ├── css/
│   │   └── style.css   # Styles
│   └── js/
│       ├── app.js      # Main app logic
│       └── trip.js     # Trip page logic
├── api/
│   └── create-trip.js  # API endpoint
├── package.json
├── vercel.json         # Vercel configuration
└── README.md
```

## iOS Integration

To integrate with your iOS app:

1. **Generate unique trip ID** (12 characters, alphanumeric)
2. **Call the API** with trip data
3. **Share the returned URL** using iOS share sheet

Example iOS code:
```swift
func shareTrip(tripData: TripData) {
    let tripId = generateUniqueId()
    let url = URL(string: "https://topten.keyninestudios.com/api/create-trip")!
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = [
        "tripId": tripId,
        "tripName": tripData.name,
        "tripDate": tripData.date,
        "milesWalked": tripData.milesWalked,
        "photoCount": tripData.photoCount,
        "categories": tripData.categories,
        "routeData": tripData.routeData
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response and share URL
    }.resume()
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, please contact the development team or create an issue in the repository.
