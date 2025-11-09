import { TravelRoute } from '../services/ztmApi';
import { X, Clock, MapPin, ArrowRight, Footprints, Bus, Train } from 'lucide-react';

interface RouteDetailsProps {
  route: TravelRoute;
  onClose: () => void;
}

export default function RouteDetails({ route, onClose }: RouteDetailsProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Szczegóły trasy</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{route.totalDuration} min</span>
              </div>
              <div>
                {formatTime(route.departureTime)} - {formatTime(route.arrivalTime)}
              </div>
              {route.price && route.price > 0 && (
                <div className="font-semibold text-green-600">
                  {route.price.toFixed(2)} zł
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {route.segments.map((segment, index) => (
              <div key={index} className="relative">
                {index > 0 && (
                  <div className="absolute left-6 -top-3 w-0.5 h-3 bg-gray-300" />
                )}

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getSegmentColor(segment.type)}`}>
                      {getSegmentIcon(segment.type)}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-800 text-lg">
                            {getSegmentTitle(segment)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {segment.duration} min
                            {segment.distance && ` • ${(segment.distance / 1000).toFixed(1)} km`}
                          </div>
                        </div>
                        {segment.departure && (
                          <div className="text-sm text-gray-600">
                            {formatTime(segment.departure)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">{segment.from}</span>
                        </div>

                        {segment.stops !== undefined && segment.stops > 0 && (
                          <div className="pl-6 text-xs text-gray-500">
                            {segment.stops} {segment.stops === 1 ? 'przystanek' : 'przystanki'}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-red-600" />
                          <span className="text-gray-700">{segment.to}</span>
                        </div>
                      </div>

                      {segment.arrival && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                          Przyjazd: {formatTime(segment.arrival)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {index < route.segments.length - 1 && (
                  <div className="absolute left-6 bottom-0 w-0.5 h-6 bg-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Całkowity dystans:</span>
            <span className="font-semibold text-gray-800">
              {(route.totalDistance / 1000).toFixed(1)} km
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSegmentIcon(type: string) {
  switch (type) {
    case 'bus':
    case 'tram':
      return <Bus className="w-6 h-6 text-white" />;
    case 'train':
    case 'metro':
      return <Train className="w-6 h-6 text-white" />;
    case 'walking':
      return <Footprints className="w-6 h-6 text-white" />;
    default:
      return <ArrowRight className="w-6 h-6 text-white" />;
  }
}

function getSegmentColor(type: string): string {
  const colors: Record<string, string> = {
    walking: 'bg-gray-500',
    bus: 'bg-blue-500',
    tram: 'bg-orange-500',
    metro: 'bg-red-600',
    train: 'bg-purple-600',
    scooter: 'bg-green-500',
    uber: 'bg-gray-900',
  };

  return colors[type] || 'bg-gray-500';
}

function getSegmentTitle(segment: any): string {
  if (segment.type === 'walking') {
    return 'Idź pieszo';
  }

  if (segment.line) {
    const typeLabels: Record<string, string> = {
      bus: 'Autobus',
      tram: 'Tramwaj',
      metro: 'Metro',
      train: 'Pociąg',
    };
    const label = typeLabels[segment.type] || segment.type;
    return `${label} ${segment.line}`;
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
