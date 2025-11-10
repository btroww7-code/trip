import { Route, SearchParams, RouteSegment, Stop } from '../types/route';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/epodroznik-scraper`;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export class RoutingService {
  private async checkCache(origin: string, destination: string): Promise<Route[] | null> {
    try {
      const { data, error } = await supabase
        .from('routes_cache')
        .select('route_data')
        .eq('origin', origin)
        .eq('destination', destination)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) return null;
      return data.route_data as Route[];
    } catch {
      return null;
    }
  }

  private async saveToCache(origin: string, destination: string, routes: Route[]): Promise<void> {
    try {
      await supabase.from('routes_cache').insert({
        origin,
        destination,
        route_data: routes,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
    } catch (e) {
      console.error('Cache save error:', e);
    }
  }

  private parseEPodroznikRoute(epRoute: any, originCoords: { lat: number; lng: number }, destCoords: { lat: number; lng: number }): Route {
    const segments: RouteSegment[] = epRoute.segments.map((seg: any, idx: number) => {
      const isFirst = idx === 0;
      const isLast = idx === epRoute.segments.length - 1;

      const from: Stop = {
        name: seg.from,
        lat: isFirst ? originCoords.lat : 0,
        lng: isFirst ? originCoords.lng : 0,
        departureTime: seg.departure,
      };

      const to: Stop = {
        name: seg.to,
        lat: isLast ? destCoords.lat : 0,
        lng: isLast ? destCoords.lng : 0,
        arrivalTime: seg.arrival,
      };

      return {
        type: 'transit',
        mode: seg.type || 'bus',
        from,
        to,
        distance: 0,
        duration: seg.duration,
        departureTime: seg.departure,
        arrivalTime: seg.arrival,
        line: seg.line,
        operator: seg.carrier,
        stops: seg.stops?.map((s: string) => ({
          name: s,
          lat: 0,
          lng: 0
        })) || []
      };
    });

    return {
      id: epRoute.id,
      segments,
      totalDistance: 0,
      totalDuration: epRoute.totalDuration,
      departureTime: epRoute.departureTime,
      arrivalTime: epRoute.arrivalTime,
      transfers: segments.length - 1,
      totalFare: epRoute.price ? {
        currency: epRoute.currency || 'PLN',
        amount: epRoute.price
      } : undefined
    };
  }

  private async searchGoogleDirections(params: SearchParams): Promise<Route[]> {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
      url.searchParams.append('origin', `${params.origin.lat},${params.origin.lng}`);
      url.searchParams.append('destination', `${params.destination.lat},${params.destination.lng}`);
      url.searchParams.append('mode', 'transit');
      url.searchParams.append('alternatives', 'true');
      url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

      if (params.departureTime) {
        const timestamp = Math.floor(new Date(params.departureTime).getTime() / 1000);
        url.searchParams.append('departure_time', timestamp.toString());
      } else {
        url.searchParams.append('departure_time', 'now');
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.error('Google Directions API error:', response.status);
        return [];
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        return [];
      }

      return data.routes.map((route: any, routeIdx: number) => {
        const leg = route.legs[0];
        const segments: RouteSegment[] = [];

        leg.steps.forEach((step: any) => {
          if (step.travel_mode === 'TRANSIT') {
            const transitDetails = step.transit_details;
            const from: Stop = {
              name: transitDetails.departure_stop.name,
              lat: transitDetails.departure_stop.location.lat,
              lng: transitDetails.departure_stop.location.lng,
              departureTime: new Date(transitDetails.departure_time.value * 1000).toISOString(),
            };

            const to: Stop = {
              name: transitDetails.arrival_stop.name,
              lat: transitDetails.arrival_stop.location.lat,
              lng: transitDetails.arrival_stop.location.lng,
              arrivalTime: new Date(transitDetails.arrival_time.value * 1000).toISOString(),
            };

            segments.push({
              type: 'transit',
              mode: transitDetails.line.vehicle.type.toLowerCase(),
              from,
              to,
              distance: step.distance.value,
              duration: step.duration.value,
              departureTime: from.departureTime!,
              arrivalTime: to.arrivalTime!,
              line: transitDetails.line.short_name || transitDetails.line.name,
              operator: transitDetails.line.agencies?.[0]?.name,
            });
          } else if (step.travel_mode === 'WALKING') {
            segments.push({
              type: 'walk',
              from: {
                name: 'Start',
                lat: step.start_location.lat,
                lng: step.start_location.lng,
              },
              to: {
                name: 'End',
                lat: step.end_location.lat,
                lng: step.end_location.lng,
              },
              distance: step.distance.value,
              duration: step.duration.value,
              departureTime: '',
              arrivalTime: '',
              instructions: [step.html_instructions?.replace(/<[^>]*>/g, '') || ''],
            });
          }
        });

        return {
          id: `google-${routeIdx}`,
          segments,
          totalDistance: leg.distance.value,
          totalDuration: leg.duration.value,
          departureTime: new Date(leg.departure_time.value * 1000).toISOString(),
          arrivalTime: new Date(leg.arrival_time.value * 1000).toISOString(),
          transfers: segments.filter(s => s.type === 'transit').length - 1,
        };
      });
    } catch (error) {
      console.error('Google Directions error:', error);
      return [];
    }
  }

  private async searchEPodroznik(params: SearchParams): Promise<Route[]> {
    try {
      const originKey = params.origin.address || `${params.origin.lat},${params.origin.lng}`;
      const destKey = params.destination.address || `${params.destination.lat},${params.destination.lng}`;

      const url = new URL(EDGE_FUNCTION_URL);
      url.searchParams.append('action', 'search');
      url.searchParams.append('from', originKey);
      url.searchParams.append('to', destKey);

      if (params.departureTime) {
        url.searchParams.append('date', params.departureTime.split('T')[0]);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('e-podroznik API error:', response.status);
        return [];
      }

      const data = await response.json();

      return (data || []).map((epRoute: any) =>
        this.parseEPodroznikRoute(epRoute, params.origin, params.destination)
      );
    } catch (error) {
      console.error('e-podroznik error:', error);
      return [];
    }
  }

  async searchRoutes(params: SearchParams): Promise<Route[]> {
    const originKey = params.origin.address || `${params.origin.lat},${params.origin.lng}`;
    const destKey = params.destination.address || `${params.destination.lat},${params.destination.lng}`;

    const cached = await this.checkCache(originKey, destKey);
    if (cached) return cached;

    try {
      const [googleRoutes, epodroznikRoutes] = await Promise.all([
        this.searchGoogleDirections(params),
        this.searchEPodroznik(params)
      ]);

      const allRoutes = [...googleRoutes, ...epodroznikRoutes];

      allRoutes.sort((a, b) => a.totalDuration - b.totalDuration);

      const uniqueRoutes = allRoutes.filter((route, index, self) => {
        return index === self.findIndex(r => {
          const sameSegments = r.segments.length === route.segments.length &&
            r.segments.every((seg, idx) => {
              const routeSeg = route.segments[idx];
              return seg.line === routeSeg.line &&
                     seg.departureTime === routeSeg.departureTime;
            });
          return sameSegments;
        });
      });

      if (uniqueRoutes.length > 0) {
        await this.saveToCache(originKey, destKey, uniqueRoutes);
      }

      return uniqueRoutes;
    } catch (error) {
      console.error('Routing error:', error);
      throw error;
    }
  }

  async geocode(query: string): Promise<{ lat: number; lng: number; address: string }[]> {
    try {
      const [googleResults, epodroznikResults] = await Promise.all([
        this.geocodeGoogle(query),
        this.geocodeEPodroznik(query)
      ]);

      const combinedResults = [...googleResults, ...epodroznikResults];

      const uniqueResults = combinedResults.filter((result, index, self) =>
        index === self.findIndex(r => r.address === result.address)
      );

      return uniqueResults.slice(0, 10);
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }

  private async geocodeGoogle(query: string): Promise<{ lat: number; lng: number; address: string }[]> {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.append('address', `${query}, Poland`);
      url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

      const response = await fetch(url.toString());

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results) {
        return [];
      }

      return data.results.map((result: any) => ({
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address
      }));
    } catch (error) {
      console.error('Google Geocoding error:', error);
      return [];
    }
  }

  private async geocodeEPodroznik(query: string): Promise<{ lat: number; lng: number; address: string }[]> {
    try {
      const url = new URL(EDGE_FUNCTION_URL);
      url.searchParams.append('action', 'suggest');
      url.searchParams.append('query', query);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return (data || []).map((item: any) => ({
        lat: 52.0,
        lng: 19.0,
        address: item.name
      }));
    } catch (error) {
      console.error('e-podroznik Geocoding error:', error);
      return [];
    }
  }
}

export const routingService = new RoutingService();
