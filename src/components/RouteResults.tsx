import { TravelRoute } from '../services/ztmApi';
import { Clock, ArrowRight, Banknote, Bus, Train, Footprints, Navigation } from 'lucide-react';

interface RouteResultsProps {
  routes: TravelRoute[];
  onSelectRoute: (route: TravelRoute) => void;
}

export default function RouteResults({ routes, onSelectRoute }: RouteResultsProps) {
  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <Navigation className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Wprowadź lokalizacje, aby wyszukać połączenia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Znaleziono {routes.length} {routes.length === 1 ? 'połączenie' : 'połączeń'}
      </h3>

      {routes.map((route, index) => (
        <div
          key={index}
          onClick={() => onSelectRoute(route)}
          className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500"
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">{route.totalDuration} min</span>
                </div>

                {route.price && route.price > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Banknote className="w-5 h-5" />
                    <span className="font-semibold">{route.price.toFixed(2)} zł</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{formatTime(route.departureTime)}</span>
                <ArrowRight className="w-4 h-4" />
                <span>{formatTime(route.arrivalTime)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {route.segments.map((segment, segIndex) => (
                <div key={segIndex} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100">
                    {getSegmentIcon(segment.type)}
                    <span>{getSegmentLabel(segment)}</span>
                  </div>
                  {segIndex < route.segments.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                {route.segments.length === 1 ? '1 odcinek' : `${route.segments.length} odcinków`}
                {' • '}
                {(route.totalDistance / 1000).toFixed(1)} km
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getSegmentIcon(type: string) {
  switch (type) {
    case 'bus':
    case 'tram':
      return <Bus className="w-4 h-4" />;
    case 'train':
    case 'metro':
      return <Train className="w-4 h-4" />;
    case 'walking':
      return <Footprints className="w-4 h-4" />;
    default:
      return <Navigation className="w-4 h-4" />;
  }
}

function getSegmentLabel(segment: any): string {
  if (segment.type === 'walking') {
    return `Pieszo ${segment.duration} min`;
  }

  if (segment.line) {
    return `${segment.line}`;
  }

  const typeLabels: Record<string, string> = {
    bus: 'Autobus',
    tram: 'Tramwaj',
    metro: 'Metro',
    train: 'Pociąg',
    scooter: 'Hulajnoga',
    uber: 'Uber',
  };

  return typeLabels[segment.type] || segment.type;
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}
