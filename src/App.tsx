import { useState } from 'react';
import { SearchPanel } from './components/SearchPanel';
import { RouteList } from './components/RouteList';
import { Map } from './components/Map';
import { FavoritesPanel } from './components/FavoritesPanel';
import { routingService } from './services/routingService';
import { Route } from './types/route';
import { Navigation } from 'lucide-react';

function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (
    origin: { lat: number; lng: number; address: string },
    destination: { lat: number; lng: number; address: string }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const results = await routingService.searchRoutes({
        origin,
        destination
      });
      setRoutes(results);
      if (results.length > 0) {
        setSelectedRoute(results[0]);
      }
    } catch (err) {
      setError('Błąd podczas wyszukiwania tras. Spróbuj ponownie.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteSelect = async (origin: string, destination: string) => {
    setLoading(true);
    setError(null);
    try {
      const originResults = await routingService.geocode(origin);
      const destResults = await routingService.geocode(destination);

      if (originResults.length > 0 && destResults.length > 0) {
        const results = await routingService.searchRoutes({
          origin: originResults[0],
          destination: destResults[0]
        });
        setRoutes(results);
        if (results.length > 0) {
          setSelectedRoute(results[0]);
        }
      }
    } catch (err) {
      setError('Błąd podczas wyszukiwania tras. Spróbuj ponownie.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Navigation className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">TrasaPolska</h1>
            <p className="text-sm text-gray-600 ml-2">Znajdź swoją trasę w całej Polsce</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <SearchPanel onSearch={handleSearch} loading={loading} />
            <FavoritesPanel onSelectFavorite={handleFavoriteSelect} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-96">
              <Map routes={routes} selectedRoute={selectedRoute} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            <RouteList
              routes={routes}
              onSelectRoute={setSelectedRoute}
              selectedRoute={selectedRoute}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
