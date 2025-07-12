// Trip page JavaScript
class TripPage {
    constructor() {
        this.supabaseUrl = 'https://idasmhlbftmhxibrjqjw.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYXNtaGxiZnRtaHhpYnJqcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA2NzMsImV4cCI6MjA2NzkxNjY3M30.aWcHB8Aalo4_1APEjXs-3Ag6dOMbomr95T_Tj4BUUdc';
        this.supabase = null;
        this.tripId = this.getTripIdFromUrl();
        this.map = null;
        
        this.init();
    }
    
    async init() {
        try {
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            if (!this.tripId) {
                this.showError('Invalid trip URL');
                return;
            }
            
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
            const { data: trip, error: tripError } = await this.supabase
                .from('trips')
                .select('*')
                .eq('trip_id', this.tripId)
                .single();
            
            if (tripError || !trip) {
                this.showError('Trip not found');
                return;
            }
            
            const { data: categories, error: categoriesError } = await this.supabase
                .from('trip_categories')
                .select('*')
                .eq('trip_id', this.tripId)
                .order('created_at');
            
            if (categoriesError) {
                console.error('Error loading categories:', categoriesError);
            }
            
            const { data: routeData, error: routeError } = await this.supabase
                .from('trip_routes')
                .select('*')
                .eq('trip_id', this.tripId)
                .single();
            
            if (routeError) {
                console.error('Error loading route data:', routeError);
            }
            
            this.displayTrip(trip, categories || [], routeData);
            
        } catch (error) {
            console.error('Error loading trip data:', error);
            this.showError('Failed to load trip data');
        }
    }
    
    displayTrip(trip, categories, routeData) {
        const loading = document.getElementById('loading');
        const content = document.getElementById('trip-content');
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        
        const title = document.getElementById('trip-title');
        const date = document.getElementById('trip-date');
        const miles = document.getElementById('miles-walked');
        const photos = document.getElementById('photo-count');
        
        if (title) title.textContent = trip.trip_name;
        if (date) date.textContent = this.formatDate(trip.trip_date);
        if (miles) miles.textContent = trip.miles_walked ? trip.miles_walked.toFixed(1) : '0';
        if (photos) photos.textContent = trip.photo_count || categories.length;
        
        this.displayCategories(categories);
        
        if (routeData && routeData.route_data && routeData.route_data.length > 0) {
            this.displayMap(routeData.route_data);
        }
    }
    
    displayCategories(categories) {
        const grid = document.getElementById('categories-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-card';
            
            let imageHtml = '<div class="no-image">📸</div>';
            if (category.photo_url) {
                imageHtml = `<img src="${category.photo_url}" alt="${category.category_name}" class="category-image" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\'no-image\'>📸</div>'">`;
            }
            
            card.innerHTML = `
                <div class="category-image-container">
                    ${imageHtml}
                </div>
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
        if (!mapSection) return;
        
        mapSection.style.display = 'block';
        
        setTimeout(() => {
            this.initMap(routeData);
        }, 100);
    }
    
    initMap(routeData) {
        const mapContainer = document.getElementById('map');
        const mapSection = document.getElementById('map-section');
        
        if (!mapContainer || !mapSection) {
            console.error('Map container not found');
            return;
        }
        
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
        
        try {
            const bounds = L.latLngBounds(coordinates);
            this.map = L.map('map').fitBounds(bounds);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
            
            if (coordinates.length > 1) {
                L.polyline(coordinates, {
                    color: '#667eea',
                    weight: 4,
                    opacity: 0.8
                }).addTo(this.map);
            }
            
            if (coordinates.length > 0) {
                L.marker(coordinates[0]).addTo(this.map)
                    .bindPopup('Start')
                    .openPopup();
                
                if (coordinates.length > 1) {
                    L.marker(coordinates[coordinates.length - 1]).addTo(this.map)
                        .bindPopup('End');
                }
            }
        } catch (error) {
            console.error('Error initializing map:', error);
            mapSection.style.display = 'none';
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
        const loading = document.getElementById('loading');
        const content = document.getElementById('trip-content');
        const error = document.getElementById('error');
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        if (error) error.style.display = 'flex';
        
        const errorContent = document.querySelector('.error-content h2');
        if (errorContent) {
            errorContent.textContent = message;
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    new TripPage();
});
