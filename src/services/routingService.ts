import { Route, SearchParams, RouteSegment, Stop } from '../types/route';
import { supabase } from '../lib/supabase';

const HERE_API_KEY = import.meta.env.VITE_HERE_API_KEY;
const HERE_ROUTING_URL = 'https://transit.router.hereapi.com/v8/routes';

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

  private parseHERESegment(section: any): RouteSegment {
    const type = this.mapHERETransportMode(section.transport?.mode || section.type);

    const from: Stop = {
      name: section.departure?.place?.name || 'Start',
      lat: section.departure?.place?.location?.lat || 0,
      lng: section.departure?.place?.location?.lng || 0,
      departureTime: section.departure?.time,
      platform: section.departure?.place?.platform
    };

    const to: Stop = {
      name: section.arrival?.place?.name || 'End',
      lat: section.arrival?.place?.location?.lat || 0,
      lng: section.arrival?.place?.location?.lng || 0,
      arrivalTime: section.arrival?.time,
      platform: section.arrival?.place?.platform
    };

    const stops: Stop[] = [];
    if (section.intermediates) {
      section.intermediates.forEach((stop: any) => {
        stops.push({
          name: stop.place?.name || '',
          lat: stop.place?.location?.lat || 0,
          lng: stop.place?.location?.lng || 0,
          arrivalTime: stop.arrival?.time,
          departureTime: stop.departure?.time,
          platform: stop.place?.platform
        });
      });
    }

    return {
      type,
      mode: section.transport?.mode || type,
      from,
      to,
      distance: section.length || 0,
      duration: section.duration || 0,
      departureTime: section.departure?.time || '',
      arrivalTime: section.arrival?.time || '',
      line: section.transport?.name,
      operator: section.agency?.name,
      stops,
      polyline: section.polyline,
      instructions: section.actions?.map((a: any) => a.instruction) || []
    };
  }

  private mapHERETransportMode(mode: string): RouteSegment['type'] {
    const modeMap: Record<string, RouteSegment['type']> = {
      'pedestrian': 'walk',
      'highSpeedTrain': 'transit',
      'intercityTrain': 'transit',
      'interRegionalTrain': 'transit',
      'regionalTrain': 'transit',
      'cityTrain': 'transit',
      'bus': 'transit',
      'ferry': 'transit',
      'subway': 'transit',
      'lightRail': 'transit',
      'privateBus': 'transit',
      'inclined': 'transit',
      'aerial': 'transit',
      'busRapid': 'transit',
      'monorail': 'transit',
      'flight': 'flight',
      'bicycle': 'bike',
      'car': 'car'
    };
    return modeMap[mode] || 'transit';
  }

  async searchRoutes(params: SearchParams): Promise<Route[]> {
    const originKey = `${params.origin.lat},${params.origin.lng}`;
    const destKey = `${params.destination.lat},${params.destination.lng}`;

    const cached = await this.checkCache(originKey, destKey);
    if (cached) return cached;

    try {
      const url = new URL(HERE_ROUTING_URL);
      url.searchParams.append('apiKey', HERE_API_KEY);
      url.searchParams.append('origin', `${params.origin.lat},${params.origin.lng}`);
      url.searchParams.append('destination', `${params.destination.lat},${params.destination.lng}`);

      if (params.departureTime) {
        url.searchParams.append('departureTime', params.departureTime);
      } else {
        url.searchParams.append('departureTime', new Date().toISOString());
      }

      url.searchParams.append('return', 'polyline,actions,travelSummary,intermediateStops');
      url.searchParams.append('modes', 'highSpeedTrain,intercityTrain,interRegionalTrain,regionalTrain,cityTrain,bus,ferry,subway,lightRail,privateBus,inclined,aerial,busRapid,monorail');
      url.searchParams.append('pedestrian[speed]', '1.4');
      url.searchParams.append('alternatives', '5');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HERE API error: ${response.status}`);
      }

      const data = await response.json();

      const routes: Route[] = (data.routes || []).map((route: any, index: number) => {
        const segments: RouteSegment[] = route.sections.map((section: any) =>
          this.parseHERESegment(section)
        );

        const transfers = segments.filter((s, i) =>
          i > 0 && s.type === 'transit' && segments[i-1].type === 'transit'
        ).length;

        return {
          id: `route-${index}`,
          segments,
          totalDistance: route.sections.reduce((sum: number, s: any) => sum + (s.length || 0), 0),
          totalDuration: route.sections.reduce((sum: number, s: any) => sum + (s.duration || 0), 0),
          departureTime: route.sections[0]?.departure?.time || '',
          arrivalTime: route.sections[route.sections.length - 1]?.arrival?.time || '',
          transfers
        };
      });

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
      const url = new URL('https://geocode.search.hereapi.com/v1/geocode');
      url.searchParams.append('apiKey', HERE_API_KEY);
      url.searchParams.append('q', query);
      url.searchParams.append('in', 'countryCode:POL');
      url.searchParams.append('limit', '5');

      const response = await fetch(url.toString());
      const data = await response.json();

      return (data.items || []).map((item: any) => ({
        lat: item.position.lat,
        lng: item.position.lng,
        address: item.address.label
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }
}

export const routingService = new RoutingService();
