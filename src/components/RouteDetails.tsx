import { Route, RouteSegment } from '../types/route';
import { Train, Bus, Plane, Bike, Footprints, Car, MapPin, Clock, Navigation } from 'lucide-react';

interface RouteDetailsProps {
  route: Route;
}

export function RouteDetails({ route }: RouteDetailsProps) {
  const getSegmentIcon = (type: RouteSegment['type']) => {
    switch (type) {
      case 'walk': return <Footprints className="w-5 h-5" />;
      case 'transit': return <Train className="w-5 h-5" />;
      case 'bike': return <Bike className="w-5 h-5" />;
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'car': return <Car className="w-5 h-5" />;
      default: return <Bus className="w-5 h-5" />;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="p-4 bg-gray-50">
      <div className="space-y-4">
        {route.segments.map((segment, idx) => (
          <div key={idx} className="relative">
            {idx > 0 && (
              <div className="absolute left-6 -top-2 w-0.5 h-4 bg-gray-300"></div>
            )}

            <div className="flex gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                segment.type === 'walk' ? 'bg-gray-200 text-gray-700' :
                segment.type === 'transit' ? 'bg-blue-500 text-white' :
                segment.type === 'bike' ? 'bg-green-500 text-white' :
                'bg-orange-500 text-white'
              }`}>
                {getSegmentIcon(segment.type)}
              </div>

              <div className="flex-1 bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {segment.line || (segment.type === 'walk' ? 'Pieszo' : segment.mode)}
                    </div>
                    {segment.operator && (
                      <div className="text-sm text-gray-600">{segment.operator}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {formatDuration(segment.duration)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Navigation className="w-4 h-4" />
                      {formatDistance(segment.distance)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{segment.from.name}</div>
                      <div className="text-sm text-gray-600">
                        Odjazd: {formatTime(segment.departureTime)}
                        {segment.from.platform && ` • Peron ${segment.from.platform}`}
                      </div>
                    </div>
                  </div>

                  {segment.stops && segment.stops.length > 0 && (
                    <div className="ml-2 pl-4 border-l-2 border-gray-200">
                      <details className="text-sm text-gray-600">
                        <summary className="cursor-pointer hover:text-gray-900">
                          {segment.stops.length} przystanków pośrednich
                        </summary>
                        <div className="mt-2 space-y-1">
                          {segment.stops.map((stop, stopIdx) => (
                            <div key={stopIdx} className="py-1">
                              <div className="font-medium">{stop.name}</div>
                              {stop.arrivalTime && (
                                <div className="text-xs text-gray-500">
                                  {formatTime(stop.arrivalTime)}
                                  {stop.platform && ` • Peron ${stop.platform}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{segment.to.name}</div>
                      <div className="text-sm text-gray-600">
                        Przyjazd: {formatTime(segment.arrivalTime)}
                        {segment.to.platform && ` • Peron ${segment.to.platform}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
