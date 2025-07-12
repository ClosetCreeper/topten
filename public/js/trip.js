// Trip page functionality
let map = null;
let tripData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get trip ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = window.location.pathname.split('/').pop();
    
    if (tripId) {
        loadTripData(tripId);
    } else {
        showError('No trip ID provided');
    }
});

async function loadTripData(tripId) {
    try {
        // For now, we'll use a mock API call since we need to implement the fetch logic
        // In production, this would call your Supabase API
        console.log('Loading trip data for:', tripId);
        
        // Mock data structure - replace with actual API call
        const mockData = {
            tripId: tripId,
            tripName: "Amazing Adventure in New York",
            tripDate: "2024-01-15T10:00:00Z",
            milesWalked: 5.2,
            photoCount: 10,
            categories: [
                {
                    categoryName: "Food",
                    photoURL: "https://images.unsplash.com/photo-1504674900240-9c9c0c1d0b0b?w=400",
                    location: "Downtown Restaurant",
                    coordinates: { latitude: 40.7128, longitude: -74.0060 }
                },
                {
                    categoryName: "Outdoor",
                    photoURL: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400",
                    location: "Central Park",
                    coordinates: { latitude: 40.7829, longitude: -73.9654 }
                }
            ],
            routeData: [
                { lat: 40.7128, lng: -74.0060 },
                { lat: 40.7130, lng: -74.0062 },
                { lat: 40.7135, lng: -74.0065 }
            ]
        };
        
        displayTripData(mockData);
        
    } catch (error) {
        console.error('Error loading trip data:', error);
        showError('Failed to load trip data');
    }
}

function displayTripData(data) {
    tripData = data;
    
    // Update header
    document.getElementById('tripName').textContent = data.tripName;
    document.getElementById('tripDate').textContent = formatDate(data.tripDate);
    document.getElementById('milesWalked').textContent = `${data.milesWalked} miles walked`;
    
    // Display categories
    displayCategories(data.categories);
    
    // Display map if route data exists
    if (data.routeData && data.routeData.length > 0) {
        displayMap(data.routeData);
    }
}

function displayCategories(categories) {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    
    categories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'category-card';
        
        card.innerHTML = `
            <h3 class="category-title">${category.categoryName}</h3>
            <p class="category-location">📍 ${category.location}</p>
            <div class="category-photos">
                <img src="${category.photoURL}" alt="${category.categoryName}" class="category-photo" onclick="showPhotoModal('${category.photoURL}')">
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function displayMap(routeData) {
    const mapSection = document.getElementById('mapSection');
    mapSection.style.display = 'block';
    
    // Initialize map
    map = L.map('map').setView([routeData[0].lat, routeData[0].lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add route polyline
    const coordinates = routeData.map(point => [point.lat, point.lng]);
    L.polyline(coordinates, { color: '#667eea', weight: 4 }).addTo(map);
    
    // Add start and end markers
    L.marker(coordinates[0]).addTo(map).bindPopup('Start');
    L.marker(coordinates[coordinates.length - 1]).addTo(map).bindPopup('End');
    
    // Fit map to show entire route
    map.fitBounds(coordinates);
}

function showPhotoModal(photoURL) {
    const modal = document.createElement('div');
    modal.className = 'photo-modal';
    modal.innerHTML = `<img src="${photoURL}" alt="Full size photo">`;
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.body.appendChild(modal);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showError(message) {
    const container = document.querySelector('.trip-container');
    container.innerHTML = `
        <div style="text-align: center; padding: 100px 20px; color: white;">
            <h1>Error</h1>
            <p>${message}</p>
        </div>
    `;
}
