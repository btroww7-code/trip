import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Location, RouteSegment } from '../services/ztmApi';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapProps {
  routes: RouteSegment[];
  fromLocation?: Location;
  toLocation?: Location;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function Map({ routes, fromLocation, toLocation, onMapClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initialCenter: [number, number] = fromLocation
      ? [fromLocation.lng, fromLocation.lat]
      : [19.9449, 50.0647];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 12,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    map.current.on('click', (e) => {
      if (onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const markers: mapboxgl.Marker[] = [];

    if (fromLocation) {
      const el = document.createElement('div');
      el.className = 'marker-from';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#22c55e';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([fromLocation.lng, fromLocation.lat])
        .addTo(map.current);

      markers.push(marker);
    }

    if (toLocation) {
      const el = document.createElement('div');
      el.className = 'marker-to';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#ef4444';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([toLocation.lng, toLocation.lat])
        .addTo(map.current);

      markers.push(marker);
    }

    if (fromLocation && toLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([fromLocation.lng, fromLocation.lat]);
      bounds.extend([toLocation.lng, toLocation.lat]);
      map.current.fitBounds(bounds, { padding: 80 });
    }

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [fromLocation, toLocation, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded || routes.length === 0) return;

    routes.forEach((segment, index) => {
      const sourceId = `route-${index}`;
      const layerId = `route-layer-${index}`;

      if (map.current!.getSource(sourceId)) {
        map.current!.removeLayer(layerId);
        map.current!.removeSource(sourceId);
      }

      const color = getSegmentColor(segment.type);

      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [0, 0]],
          },
        },
      });

      map.current!.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': color,
          'line-width': 4,
        },
      });
    });

    return () => {
      routes.forEach((_, index) => {
        const sourceId = `route-${index}`;
        const layerId = `route-layer-${index}`;
        if (map.current && map.current.getSource(sourceId)) {
          map.current.removeLayer(layerId);
          map.current.removeSource(sourceId);
        }
      });
    };
  }, [routes, mapLoaded]);

  return <div ref={mapContainer} className="w-full h-full" />;
}

function getSegmentColor(type: RouteSegment['type']): string {
  const colors: Record<RouteSegment['type'], string> = {
    walking: '#6b7280',
    bus: '#3b82f6',
    tram: '#f59e0b',
    metro: '#dc2626',
    train: '#8b5cf6',
    scooter: '#10b981',
    uber: '#000000',
  };

  return colors[type] || '#6b7280';
}
