import { Route, SearchParams, RouteSegment, Stop } from '../types/route';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/epodroznik-scraper`;

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

  private parseEPodroznikRoute(epRoute: any): Route {
    const segments: RouteSegment[] = epRoute.segments.map((seg: any) => {
      const from: Stop = {
        name: seg.from,
        lat: 0,
        lng: 0,
        departureTime: seg.departure,
      };

      const to: Stop = {
        name: seg.to,
        lat: 0,
        lng: 0,
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

    if (epRoute.price) {
      return {
        ...epRoute,
        segments,
        totalFare: {
          currency: epRoute.currency || 'PLN',
          amount: epRoute.price
        }
      };
    }

    return {
      ...epRoute,
      segments
    };
  }

  async searchRoutes(params: SearchParams): Promise<Route[]> {
    const originKey = params.origin.address || `${params.origin.lat},${params.origin.lng}`;
    const destKey = params.destination.address || `${params.destination.lat},${params.destination.lng}`;

    const cached = await this.checkCache(originKey, destKey);
    if (cached) return cached;

    try {
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
        throw new Error(`Edge Function error: ${response.status}`);
      }

      const data = await response.json();

      const routes: Route[] = (data || []).map((epRoute: any) =>
        this.parseEPodroznikRoute(epRoute)
      );

      if (routes.length > 0) {
        await this.saveToCache(originKey, destKey, routes);
      }

      return routes;
    } catch (error) {
      console.error('Routing error:', error);
      throw error;
    }
  }

  async geocode(query: string): Promise<{ lat: number; lng: number; address: string }[]> {
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
        console.error('Geocoding error:', response.status);
        return [];
      }

      const data = await response.json();

      return (data || []).map((item: any, index: number) => ({
        lat: 52.0 + (index * 0.1),
        lng: 19.0 + (index * 0.1),
        address: item.name
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }
}

export const routingService = new RoutingService();
