import { useEffect, useRef, useState } from "react";

// Muted, warm grayscale map style to match the app aesthetic
const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f5f0eb" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a7e72" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f0eb" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9b89a" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#ae9e8b" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#ede8e1" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e8e2d9" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#93816c" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#ddd9cf" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#a89880" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8e0d4" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#9e8a72" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#b8a898" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#ddd5c8" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#ddd5c8" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#c5cdd8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8a9bb0" }] },
];

function groupByVenue(entries) {
  const groups = {};
  for (const entry of entries) {
    if (!entry.location_lat || !entry.location_lng) continue;
    const key = entry.venue_name || `${entry.location_lat.toFixed(4)},${entry.location_lng.toFixed(4)}`;
    if (!groups[key]) {
      groups[key] = {
        name: entry.venue_name || "Unknown venue",
        lat: entry.location_lat,
        lng: entry.location_lng,
        entries: [],
      };
    }
    groups[key].entries.push(entry);
  }
  return Object.values(groups);
}

export default function MapView({ artEntries }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const venues = groupByVenue(artEntries);
  const mappableCount = artEntries.filter(e => e.location_lat && e.location_lng).length;
  const unmappableCount = artEntries.length - mappableCount;

  // Load Google Maps API and initialize map
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: venues.length === 1 ? 14 : 3,
        center: venues.length > 0
          ? { lat: venues[0].lat, lng: venues[0].lng }
          : { lat: 40.7128, lng: -74.006 }, // Default: NYC
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_BOTTOM },
      });
      mapInstanceRef.current = map;
      setMapReady(true);
    };

    if (window.google?.maps) {
      initMap();
      return;
    }

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", initMap);
      return () => existing.removeEventListener("load", initMap);
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  // Add/update markers whenever map is ready or venues change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    if (venues.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    venues.forEach(venue => {
      const position = { lat: venue.lat, lng: venue.lng };
      bounds.extend(position);

      // Custom SVG marker
      const count = venue.entries.length;
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: venue.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
              <ellipse cx="18" cy="40" rx="6" ry="2.5" fill="rgba(0,0,0,0.12)"/>
              <circle cx="18" cy="17" r="16" fill="#1a1a1a" stroke="#fafaf8" stroke-width="1.5"/>
              <text x="18" y="22" text-anchor="middle" font-family="monospace" font-size="${count > 9 ? 10 : 12}" fill="#fafaf8" font-weight="400">${count}</text>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(36, 44),
          anchor: new window.google.maps.Point(18, 40),
        },
      });

      marker.addListener("click", () => {
        setSelectedVenue(venue);
      });

      markersRef.current.push(marker);
    });

    if (venues.length === 1) {
      map.setCenter({ lat: venues[0].lat, lng: venues[0].lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 60);
    }
  }, [mapReady, venues.length]);

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#1a1a1a" }}>
            Museum Map
          </div>
          {venues.length > 0 && (
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#bbb", marginTop: 4,
            }}>
              {venues.length} {venues.length === 1 ? "venue" : "venues"} · {mappableCount} {mappableCount === 1 ? "piece" : "pieces"} mapped
              {unmappableCount > 0 && ` · ${unmappableCount} without location`}
            </div>
          )}
        </div>
      </div>

      {/* No mappable entries */}
      {venues.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#bbb" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: "italic", marginBottom: 8 }}>
            No locations yet.
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Add a venue when logging art to see it here.
          </div>
        </div>
      )}

      {venues.length > 0 && (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Map */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              ref={mapRef}
              style={{
                width: "100%",
                height: selectedVenue ? "55vh" : "68vh",
                minHeight: 320,
                borderRadius: 4,
                border: "1px solid #e8e8e8",
                transition: "height 0.3s ease",
              }}
            />
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
              <div style={{
                marginTop: 8, fontFamily: "'DM Mono', monospace",
                fontSize: 10, color: "#bbb", letterSpacing: "0.06em",
              }}>
                Set VITE_GOOGLE_MAPS_API_KEY to enable the map.
              </div>
            )}
          </div>

          {/* Venue list sidebar */}
          <div style={{
            width: 220,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}>
            {venues.map((venue, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedVenue(venue);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.panTo({ lat: venue.lat, lng: venue.lng });
                    mapInstanceRef.current.setZoom(15);
                  }
                }}
                style={{
                  background: selectedVenue?.name === venue.name ? "#1a1a1a" : "none",
                  border: "1px solid #e8e8e8",
                  borderRadius: 2,
                  padding: "10px 12px",
                  textAlign: "left",
                  cursor: "pointer",
                  marginBottom: 4,
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  color: selectedVenue?.name === venue.name ? "#fafaf8" : "#1a1a1a",
                  marginBottom: 3,
                }}>
                  {venue.name}
                </div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 9,
                  color: selectedVenue?.name === venue.name ? "#aaa" : "#bbb",
                  letterSpacing: "0.04em",
                }}>
                  {venue.entries.length} {venue.entries.length === 1 ? "piece" : "pieces"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected venue detail panel */}
      {selectedVenue && (
        <div style={{
          marginTop: 28,
          borderTop: "1px solid #e8e8e8",
          paddingTop: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 19, color: "#1a1a1a",
              }}>
                {selectedVenue.name}
              </div>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9,
                letterSpacing: "0.07em", textTransform: "uppercase",
                color: "#bbb", marginTop: 3,
              }}>
                {selectedVenue.entries.length} {selectedVenue.entries.length === 1 ? "encounter" : "encounters"}
              </div>
            </div>
            <button
              onClick={() => setSelectedVenue(null)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "#aaa",
              }}
            >
              close
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "20px 20px",
          }}>
            {selectedVenue.entries.map(entry => {
              const date = new Date(entry.encountered_at).toLocaleDateString("en-US", {
                month: "short", year: "numeric",
              });
              return (
                <div key={entry.id} style={{ borderTop: "1px solid #e8e8e8", paddingTop: 14 }}>
                  {entry.photo_thumb_url && (
                    <img
                      src={entry.photo_thumb_url}
                      alt={entry.title || "Art encounter"}
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 2, marginBottom: 10 }}
                    />
                  )}
                  {(entry.artist_name || entry.title) && (
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      color: "#999", marginBottom: 5,
                    }}>
                      {[entry.artist_name, entry.title].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 14,
                    fontStyle: "italic", color: "#444", lineHeight: 1.5,
                  }}>
                    "{entry.emotional_reaction}"
                  </div>
                  {entry.mood_tags?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 8 }}>
                      {entry.mood_tags.map(mood => (
                        <span key={mood} style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 8,
                          letterSpacing: "0.06em", textTransform: "uppercase",
                          color: "#bbb", border: "1px solid #ebebeb",
                          padding: "2px 6px", borderRadius: 2,
                        }}>
                          {mood}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 9,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "#ccc", marginTop: 8,
                  }}>
                    {date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
