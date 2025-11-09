const ZTM_API_KEY = import.meta.env.VITE_ZTM_API_KEY;

export interface Location {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

export interface RouteSegment {
  type: 'walking' | 'bus' | 'tram' | 'metro' | 'train' | 'scooter' | 'uber';
  from: string;
  to: string;
  duration: number;
  distance?: number;
  line?: string;
  departure?: string;
  arrival?: string;
  stops?: number;
  polyline?: string;
}

export interface TravelRoute {
  segments: RouteSegment[];
  totalDuration: number;
  totalDistance: number;
  price?: number;
  departureTime: string;
  arrivalTime: string;
}

export const searchRoutes = async (
  from: Location,
  to: Location,
  departureTime?: Date
): Promise<TravelRoute[]> => {
  try {
    const params = new URLSearchParams({
      from: `${from.lat},${from.lng}`,
      to: `${to.lat},${to.lng}`,
      time: departureTime ? departureTime.toISOString() : new Date().toISOString(),
    });

    const response = await fetch(
      `https://api.um.warszawa.pl/api/action/plannerNew?${params}`,
      {
        headers: {
          'apikey': ZTM_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch routes');
    }

    const data = await response.json();
    return parseZTMRoutes(data);
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
};

export const geocodeAddress = async (address: string): Promise<Location | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}, Poland&limit=1`
    );

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name,
        address: data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );

    const data = await response.json();
    return data.display_name || `${lat}, ${lng}`;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return `${lat}, ${lng}`;
  }
};

const parseZTMRoutes = (data: any): TravelRoute[] => {
  const routes: TravelRoute[] = [];

  if (!data.result || !data.result.itineraries) {
    return routes;
  }

  for (const itinerary of data.result.itineraries) {
    const segments: RouteSegment[] = [];
    let totalDuration = 0;
    let totalDistance = 0;

    for (const leg of itinerary.legs || []) {
      const segmentType = mapTransportMode(leg.mode);
      const duration = Math.round(leg.duration / 60);
      const distance = leg.distance || 0;

      segments.push({
        type: segmentType,
        from: leg.from?.name || 'Unknown',
        to: leg.to?.name || 'Unknown',
        duration,
        distance,
        line: leg.route || undefined,
        departure: leg.startTime,
        arrival: leg.endTime,
        stops: leg.intermediateStops?.length || 0,
        polyline: leg.legGeometry?.points,
      });

      totalDuration += duration;
      totalDistance += distance;
    }

    routes.push({
      segments,
      totalDuration,
      totalDistance,
      departureTime: itinerary.startTime,
      arrivalTime: itinerary.endTime,
      price: calculatePrice(segments),
    });
  }

  return routes;
};

const mapTransportMode = (mode: string): RouteSegment['type'] => {
  const modeMap: { [key: string]: RouteSegment['type'] } = {
    WALK: 'walking',
    BUS: 'bus',
    TRAM: 'tram',
    SUBWAY: 'metro',
    RAIL: 'train',
  };

  return modeMap[mode.toUpperCase()] || 'walking';
};

const calculatePrice = (segments: RouteSegment[]): number => {
  const hasPublicTransport = segments.some(
    (s) => ['bus', 'tram', 'metro', 'train'].includes(s.type)
  );

  if (hasPublicTransport) {
    return 4.40;
  }

  return 0;
};
