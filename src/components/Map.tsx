import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Route } from '../types/route';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapProps {
  routes: Route[];
  selectedRoute: Route | null;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export function Map({ routes, selectedRoute, onLocationSelect }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [19.4458, 51.9194],
      zoom: 6
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }), 'top-right');

    if (onLocationSelect) {
      map.current.on('click', (e) => {
        onLocationSelect(e.lngLat.lat, e.lngLat.lng);
      });
    }
  }, [onLocationSelect]);

  useEffect(() => {
    if (!map.current) return;

    markers.forEach(marker => marker.remove());
    setMarkers([]);

    if (map.current.getSource('route-line')) {
      map.current.removeLayer('route-line');
      map.current.removeSource('route-line');
    }

    const route = selectedRoute || routes[0];
    if (!route) return;

    const coordinates: [number, number][] = [];
    const newMarkers: mapboxgl.Marker[] = [];

    route.segments.forEach((segment, idx) => {
      coordinates.push([segment.from.lng, segment.from.lat]);

      if (idx === 0) {
        const startMarker = new mapboxgl.Marker({ color: '#10b981' })
          .setLngLat([segment.from.lng, segment.from.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Start:</strong> ${segment.from.name}`))
          .addTo(map.current!);
        newMarkers.push(startMarker);
      }

      if (idx === route.segments.length - 1) {
        coordinates.push([segment.to.lng, segment.to.lat]);
        const endMarker = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([segment.to.lng, segment.to.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>End:</strong> ${segment.to.name}`))
          .addTo(map.current!);
        newMarkers.push(endMarker);
      }
    });

    setMarkers(newMarkers);

    if (coordinates.length > 0) {
      map.current.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      });

      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4
        }
      });

      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord as [number, number]);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [routes, selectedRoute]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
