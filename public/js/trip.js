// Trip page JavaScript
class TripPage {
    constructor() {
        // Use hardcoded values for browser environment
        this.supabaseUrl = 'https://idasmhlbftmhxibrjqjw.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYXNtaGxiZnRtaHhpYnJqcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA2NzMsImV4cCI6MjA2NzkxNjY3M30.aWcHB8Aalo4_1APEjXs-3Ag6dOMbomr95T_Tj4BUUdc';
        this.supabase = null;
        this.tripId = this.getTripIdFromUrl();
        this.map = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize Supabase
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            if (!this.tripId) {
                this.showError('Invalid trip URL');
                return;
            }
            
            // Load trip data
            await this.loadTripData();
            
        } catch (error) {
            console.error('Error initializing trip page:', error);
            this.showError('Failed to load trip data');
        }
    }
    
    getTripIdFromUrl() {
        const path = window.location.pathname;
        const match = path.match(/\/trip\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }
    
    async loadTripData() {
        try {
            // Fetch trip data from Supabase
            const { data: trip, error: tripError } = await this.supabase
                .from('trips')
                .select('*')
                .eq('trip_id', this.tripId)
                .single();
            
            if (tripError || !trip) {
                this.showError('Trip not found');
                return;
            }
            
            // Fetch categories
            const { data: categories, error: categoriesError } = await this.supabase
                .from('trip_categories')
                .select('*')
                .eq('trip_id', this.tripId)
                .order('created_at');
            
            if (categoriesError) {
                console.error('Error loading categories:', categoriesError);
            }
            
            // Fetch route data
            const { data: routeData, error: routeError } = await this.supabase
                .from('trip_routes')
                .select('*')
                .eq('trip_id', this.tripId)
                .single();
            
            if (routeError) {
                console.error('Error loading route data:', routeError);
            }
            
            // Display trip data
            this.displayTrip(trip, categories || [], routeData);
            
        } catch (error) {
            console.error('Error loading trip data:', error);
            this.showError('Failed to load trip data');
        }
    }
    
    displayTrip(trip, categories, routeData) {
        // Hide loading, show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('trip-content').style.display = 'block';
        
        // Update header
        document.getElementById('trip-title').textContent = trip.trip_name;
        document.getElementById('trip-date').textContent = this.formatDate(trip.trip_date);
        document.getElementById('miles-walked').textContent = trip.miles_walked ? trip.miles_walked.toFixed(1) : '0';
        document.getElementById('photo-count').textContent = trip.photo_count || categories.length;
        
        // Display categories
        this.displayCategories(categories);
        
        // Display map if route data exists
        if (routeData && routeData.route_data) {
            this.displayMap(routeData.route_data);
        }
    }
    
    displayCategories(categories) {
        const grid = document.getElementById('categories-grid');
        grid.innerHTML = '';
        
        categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-card';
            
            card.innerHTML = `
                <img src="${category.photo_url}" alt="${category.category_name}" class="category-image" onerror="this.style.display='none'">
                <div class="category-info">
                    <h3 class="category-name">${category.category_name}</h3>
                    <p class="category-location">
                        📍 ${category.location_name || 'Unknown location'}
                    </p>
                </div>
            `;
            
            grid.appendChild(card);
        });
    }
    
    displayMap(routeData) {
        const mapSection = document.getElementById('map-section');
        mapSection.style.display = 'block';
        
        // Initialize map after a short delay to ensure container is ready
        setTimeout(() => {
            this.initMap(routeData);
        }, 100);
    }
    
    initMap(routeData) {
        const mapContainer = document.getElementById('map');
        
        // Parse route data (assuming it's an array of coordinates)
        let coordinates = [];
        if (Array.isArray(routeData)) {
            coordinates = routeData;
        } else if (routeData.coordinates) {
            coordinates = routeData.coordinates;
        }
        
        if (coordinates.length === 0) {
            mapSection.style.display = 'none';
            return;
        }
        
        // Calculate bounds
        const bounds = L.latLngBounds(coordinates);
        
        // Create map
        this.map = L.map('map').fitBounds(bounds);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Add route line
        if (coordinates.length > 1) {
            L.polyline(coordinates, {
                color: '#667eea',
                weight: 4,
                opacity: 0.8
            }).addTo(this.map);
        }
        
        // Add markers for start and end points
        if (coordinates.length > 0) {
            L.marker(coordinates[0]).addTo(this.map)
                .bindPopup('Start')
                .openPopup();
            
            if (coordinates.length > 1) {
                L.marker(coordinates[coordinates.length - 1]).addTo(this.map)
                    .bindPopup('End');
            }
        }
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('trip-content').style.display = 'none';
        document.getElementById('error').style.display = 'flex';
        
        const errorContent = document.querySelector('.error-content h2');
        if (errorContent) {
            errorContent.textContent = message;
        }
    }
}

// Initialize trip page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new TripPage();
});
