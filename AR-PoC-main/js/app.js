let destination = null;
let map;
let directionsRenderer;

function initMap() {
    navigator.geolocation.getCurrentPosition((position) => {
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 15,
            center: { lat: position.coords.latitude, lng: position.coords.longitude }
        });
        directionsRenderer = new google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);
    }, (error) => {
        console.error('Error getting position:', error);
        alert('Error getting position: ' + error.message);
    }, {
        enableHighAccuracy: true,
    });

    // remove all given styles to the map and add the class 'map' to the map
    document.getElementById('map').classList.add('map');
    document.getElementById('map').style = '';
}

async function navigate() {
    const address = document.getElementById('destination').value;
    if (address) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK') {
                const location = results[0].geometry.location;
                destination = {
                    lat: location.lat(),
                    lng: location.lng()
                };

                setTimeout(() => {
                    getRoute(destination);
                }, 10);
            } else {
                console.error('Geocode was not successful for the following reason: ' + status);
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    }
}

async function getRoute(destination_lonlat) {
    const directionsService = new google.maps.DirectionsService();
    navigator.geolocation.getCurrentPosition((position) => {
        const origin = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        console.log('Origin:', origin);

        directionsService.route({
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination_lonlat.lat, destination_lonlat.lng),
            travelMode: google.maps.TravelMode.WALKING
        }, (response, status) => {
            if (status === 'OK') {
                const route = response.routes[0].legs[0].steps.map(step => ({
                    lat: step.start_location.lat(),
                    lng: step.start_location.lng()
                }));
                updateArrow(route, destination_lonlat);
                directionsRenderer.setDirections(response); // Draw the route on the map
                map.setCenter(new google.maps.LatLng(origin.lat, origin.lng)); // Center the map on the origin
            } else {
                console.error('Directions request failed due to ' + status);
            }
        });
    }, (error) => {
        console.error('Error getting position:', error);
        alert('Error getting position: ' + error.message);
    }, {
        enableHighAccuracy: true,
    });
}

// Spraakherkenning toevoegen aan het invulveld
function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'nl-NL'; // Stel de taal in op Nederlands
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = function(event) {
        const speechResult = event.results[0][0].transcript;
        document.getElementById('destination').value = speechResult;
        console.log('Speech result: ' + speechResult);
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error: ' + event.error);
        alert('Speech recognition error: ' + event.error);
    };
}

document.getElementById('speechBtn').addEventListener('click', startSpeechRecognition);

async function updateArrow(route, destination_lonlat) {
    if (route && route.length > 0 && destination_lonlat) {
        let currentPos = null;
        let nextPointIndex = 0;

        const updatePosition = () => {
            navigator.geolocation.getCurrentPosition((position) => {
                currentPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Check if we have reached the next point
                const nextPoint = route[nextPointIndex];
                const distanceToNextPoint = calculateDistance(currentPos, nextPoint);
                if (distanceToNextPoint < 10) { // 10 meters threshold
                    nextPointIndex++;
                    if (nextPointIndex >= route.length) {
                        alert('You have reached your destination.');
                        return;
                    }
                }

                const angle = calculateBearing(currentPos, destination_lonlat);
                const arrow = document.getElementById('arrow');

                // Smooth rotation
                const newRotation = `20 ${angle} 0`;
                arrow.setAttribute('animation', {
                    property: 'rotation',
                    to: newRotation,
                    dur: 500,
                    easing: 'easeInOutQuad'
                });

                // Optional: Update distance indicator
                const distance = calculateDistance(currentPos, destination_lonlat);
                document.getElementById('distance').innerText = `Distance: ${distance.toFixed(2)} meters`;
            }, (error) => {
                console.error('Error getting position:', error);
                alert('Error getting position: ' + error.message);
            }, {
                enableHighAccuracy: true,
            });
        };

        // Update position immediately
        updatePosition();

        // Update position every 5 seconds
        setInterval(updatePosition, 5000);

        // Update arrow rotation based on device orientation
        window.addEventListener('deviceorientation', (event) => {
            console.log(event.alpha + ' : ' + event.beta + ' : ' + event.gamma);
            const arrow = document.getElementById('arrow');
            if (arrow) {
                const alpha = event.alpha; // Rotation around z-axis
                const angle = calculateBearing(currentPos, destination_lonlat) - alpha;
                arrow.setAttribute('rotation', `20 ${angle} 0`);
            }
        });
    }
}

function calculateBearing(start, end) {
    const startLat = toRadians(start.lat);
    const startLon = toRadians(start.lng);
    const endLat = toRadians(end.lat);
    const endLon = toRadians(end.lng);

    const dLon = endLon - startLon;

    const y = Math.sin(dLon) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
        Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLon);

    let brng = Math.atan2(y, x);
    brng = toDegrees(brng);
    return (brng + 360) % 360;
}

function calculateDistance(start, end) {
    const R = 6371000; // Earth radius in meters
    const startLat = toRadians(start.lat);
    const startLon = toRadians(start.lng);
    const endLat = toRadians(end.lat);
    const endLon = toRadians(end.lng);

    const dLat = endLat - startLat;
    const dLon = endLon - startLon;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(startLat) * Math.cos(endLat) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

document.getElementById('toggleMapBtn').addEventListener('click', () => {
    const mapElement = document.getElementById('map');
    const button = document.getElementById('toggleMapBtn');
    const mapbox = document.getElementById('mapbox');
    const mapHeight = window.innerHeight * 0.33;

    if (mapElement.style.height === '0px') {
        mapElement.style.height = '33%';
        mapElement.style.transform = 'translateY(0)';
        button.classList.remove('toggle-off');
        button.classList.add('toggle-on');
        button.style.transform = 'translateY(0)';
        mapbox.style.transform = 'translateY(0)';
    } else {
        mapElement.style.height = '0px';
        mapElement.style.transform = `translateY(${mapHeight}px)`;
        button.classList.remove('toggle-on');
        button.classList.add('toggle-off');
        button.style.transform = `translateY(${mapHeight}px)`;
        mapbox.style.transform = `translateY(${mapHeight}px)`;
    }
});

// instantly initialize the map
initMap();