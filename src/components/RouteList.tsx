import { Route } from '../types/route';
import { Clock, ArrowRight, TrendingUp } from 'lucide-react';
import { RouteDetails } from './RouteDetails';
import { useState } from 'react';

interface RouteListProps {
  routes: Route[];
  onSelectRoute: (route: Route) => void;
  selectedRoute: Route | null;
}

export function RouteList({ routes, onSelectRoute, selectedRoute }: RouteListProps) {
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const handleRouteClick = (route: Route) => {
    onSelectRoute(route);
    setExpandedRouteId(expandedRouteId === route.id ? null : route.id);
  };

  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-500">Brak wyników. Wyszukaj połączenie aby zobaczyć dostępne trasy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {routes.map((route) => (
        <div
          key={route.id}
          className={`bg-white rounded-lg shadow-md overflow-hidden transition-all cursor-pointer ${
            selectedRoute?.id === route.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => handleRouteClick(route)}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatTime(route.departureTime)}
                  </div>
                  <div className="text-xs text-gray-500">Odjazd</div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <ArrowRight className="w-5 h-5" />
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(route.totalDuration)}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatTime(route.arrivalTime)}
                  </div>
                  <div className="text-xs text-gray-500">Przyjazd</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{route.transfers} przesiadek</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {route.segments.map((segment, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    segment.type === 'walk' ? 'bg-gray-100 text-gray-700' :
                    segment.type === 'transit' ? 'bg-blue-100 text-blue-700' :
                    segment.type === 'bike' ? 'bg-green-100 text-green-700' :
                    'bg-orange-100 text-orange-700'
                  }`}
                >
                  {segment.line || segment.mode}
                </div>
              ))}
            </div>
          </div>

          {expandedRouteId === route.id && (
            <div className="border-t border-gray-200">
              <RouteDetails route={route} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
