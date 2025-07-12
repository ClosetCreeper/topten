// Supabase configuration - replace with your actual values
const SUPABASE_URL = 'https://idasmhlbftmhxibrjqjw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYXNtaGxiZnRtaHhpYnJqcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA2NzMsImV4cCI6MjA2NzkxNjY3M30.aWcHB8Aalo4_1APEjXs-3Ag6dOMbomr95T_Tj4BUUdc'

// Get trip ID from URL
const tripId = window.location.pathname.split('/').pop()

let tripData = null
let map = null

// Initialize the page
async function initPage() {
    try {
        await loadTripData()
        displayTripInfo()
        displayCategories()
        initializeMap()
    } catch (error) {
        console.error('Error initializing page:', error)
        showError('Failed to load trip data')
    }
}

// Load trip data from Supabase
async function loadTripData() {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Load trip info
    const { data: tripInfo, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('trip_id', tripId)
        .single()

    if (tripError) throw tripError
    tripData = tripInfo

    // Load categories with multiple photos
    const { data: categories, error: categoryError } = await supabase
        .from('trip_categories')
        .select('*')
        .eq('trip_id', tripId)
        .order('category_name')

    if (categoryError) throw categoryError

    // Group photos by category
    tripData.categories = {}
    categories.forEach(category => {
        if (!tripData.categories[category.category_name]) {
            tripData.categories[category.category_name] = []
        }
        tripData.categories[category.category_name].push(category)
    })

    // Load route data
    const { data: routes, error: routeError } = await supabase
        .from('trip_routes')
        .select('route_data')
        .eq('trip_id', tripId)
        .single()

    if (!routeError && routes) {
        tripData.routeData = routes.route_data
    }
}

// Display trip information
function displayTripInfo() {
    if (!tripData) return

    document.getElementById('tripName').textContent = tripData.trip_name
    document.getElementById('tripDate').textContent = new Date(tripData.trip_date).toLocaleDateString()
    document.getElementById('milesWalked').textContent = tripData.miles_walked?.toFixed(1) || '0.0'
    document.getElementById('photoCount').textContent = tripData.photo_count || '0'
    
    const categoryCount = Object.keys(tripData.categories || {}).length
    document.getElementById('categoryCount').textContent = `${categoryCount}/10`
}

// Display categories with multiple photos
function displayCategories() {
    const grid = document.getElementById('categoriesGrid')
    if (!tripData?.categories) return

    grid.innerHTML = ''

    Object.entries(tripData.categories).forEach(([categoryName, photos]) => {
        const categoryCard = document.createElement('div')
        categoryCard.className = 'category-card'
        
        categoryCard.innerHTML = `
            <h3>${categoryName}</h3>
            <div class="photos-grid">
                ${photos.map(photo => `
                    <div class="photo-item">
                        <img src="${photo.photo_url || 'placeholder.jpg'}" 
                             alt="${categoryName}" 
                             onerror="this.src='placeholder.jpg'"
                             onclick="showPhotoModal('${photo.photo_url}', '${photo.location_name || ''}')">
                        ${photo.location_name ? `<p class="location">📍 ${photo.location_name}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `
        
        grid.appendChild(categoryCard)
    })
}

// Initialize map
function initializeMap() {
    if (!tripData?.routeData || tripData.routeData.length === 0) {
        document.getElementById('map').style.display = 'none'
        return
    }

    map = L.map('map').setView([tripData.routeData[0].lat, tripData.routeData[0].lng], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Draw route
    const routeCoords = tripData.routeData.map(point => [point.lat, point.lng])
    L.polyline(routeCoords, { color: '#4CAF50', weight: 4 }).addTo(map)

    // Add markers for start and end
    if (routeCoords.length > 0) {
        L.marker(routeCoords[0]).addTo(map).bindPopup('Start')
        L.marker(routeCoords[routeCoords.length - 1]).addTo(map).bindPopup('End')
    }

    // Fit map to route
    map.fitBounds(routeCoords)
}

// Show photo modal
function showPhotoModal(photoUrl, locationName) {
    const modal = document.createElement('div')
    modal.className = 'photo-modal'
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <img src="${photoUrl}" alt="Photo" onerror="this.src='placeholder.jpg'">
            ${locationName ? `<p class="location">�� ${locationName}</p>` : ''}
        </div>
    `
    
    document.body.appendChild(modal)
    
    modal.querySelector('.close').onclick = () => modal.remove()
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove()
    }
}

// Show error message
function showError(message) {
    const container = document.querySelector('.trip-container')
    container.innerHTML = `
        <div class="error-message">
            <h2>Error</h2>
            <p>${message}</p>
        </div>
    `
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initPage)
