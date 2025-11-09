export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Stop {
  name: string;
  lat: number;
  lng: number;
  arrivalTime?: string;
  departureTime?: string;
  platform?: string;
}

export interface RouteSegment {
  type: 'walk' | 'transit' | 'bike' | 'scooter' | 'car' | 'flight';
  mode?: string;
  from: Stop;
  to: Stop;
  distance: number;
  duration: number;
  departureTime: string;
  arrivalTime: string;
  line?: string;
  operator?: string;
  stops?: Stop[];
  polyline?: string;
  instructions?: string[];
  fare?: {
    currency: string;
    amount: number;
  };
}

export interface Route {
  id: string;
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  departureTime: string;
  arrivalTime: string;
  transfers: number;
  totalFare?: {
    currency: string;
    amount: number;
  };
}

export interface SearchParams {
  origin: Location;
  destination: Location;
  departureTime?: string;
  arrivalTime?: string;
  modes?: string[];
}
