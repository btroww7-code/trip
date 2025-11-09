import { useState } from 'react';
import { useRouteSearch } from './hooks/useRouteSearch';
import SearchForm from './components/SearchForm';
import RouteResults from './components/RouteResults';
import RouteDetails from './components/RouteDetails';
import Map from './components/Map';
import { TravelRoute } from './services/ztmApi';
import { Navigation } from 'lucide-react';

function App() {
  const { routes, loading, error, fromLocation, toLocation, searchByAddress } = useRouteSearch();
  const [selectedRoute, setSelectedRoute] = useState<TravelRoute | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TransitPL</h1>
              <p className="text-sm text-gray-600">Planuj podróże po całej Polsce</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <SearchForm onSearch={searchByAddress} loading={loading} />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <RouteResults routes={routes} onSelectRoute={setSelectedRoute} />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[600px]">
              <Map
                routes={selectedRoute ? selectedRoute.segments : []}
                fromLocation={fromLocation || undefined}
                toLocation={toLocation || undefined}
              />
            </div>
          </div>
        </div>
      </main>

      {selectedRoute && (
        <RouteDetails route={selectedRoute} onClose={() => setSelectedRoute(null)} />
      )}
    </div>
  );
}

export default App;
