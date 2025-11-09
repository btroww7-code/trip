import { useState, useEffect } from 'react';
import { Search, MapPin, Clock, Loader2 } from 'lucide-react';
import { routingService } from '../services/routingService';

interface SearchPanelProps {
  onSearch: (origin: { lat: number; lng: number; address: string }, destination: { lat: number; lng: number; address: string }) => void;
  loading: boolean;
}

export function SearchPanel({ onSearch, loading }: SearchPanelProps) {
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<Array<{ lat: number; lng: number; address: string }>>([]);
  const [destSuggestions, setDestSuggestions] = useState<Array<{ lat: number; lng: number; address: string }>>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [selectedDest, setSelectedDest] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  useEffect(() => {
    if (originQuery.length < 3) {
      setOriginSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await routingService.geocode(originQuery);
      setOriginSuggestions(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [originQuery]);

  useEffect(() => {
    if (destQuery.length < 3) {
      setDestSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await routingService.geocode(destQuery);
      setDestSuggestions(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [destQuery]);

  const handleSearch = () => {
    if (selectedOrigin && selectedDest) {
      onSearch(selectedOrigin, selectedDest);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Znajdź trasę</h2>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Skąd
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-5 h-5 text-green-600" />
          <input
            type="text"
            value={originQuery}
            onChange={(e) => {
              setOriginQuery(e.target.value);
              setShowOriginSuggestions(true);
            }}
            onFocus={() => setShowOriginSuggestions(true)}
            placeholder="Wpisz adres początkowy..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {showOriginSuggestions && originSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {originSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"
                onClick={() => {
                  setSelectedOrigin(suggestion);
                  setOriginQuery(suggestion.address);
                  setShowOriginSuggestions(false);
                }}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <span className="text-sm">{suggestion.address}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dokąd
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-5 h-5 text-red-600" />
          <input
            type="text"
            value={destQuery}
            onChange={(e) => {
              setDestQuery(e.target.value);
              setShowDestSuggestions(true);
            }}
            onFocus={() => setShowDestSuggestions(true)}
            placeholder="Wpisz adres docelowy..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {showDestSuggestions && destSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {destSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors"
                onClick={() => {
                  setSelectedDest(suggestion);
                  setDestQuery(suggestion.address);
                  setShowDestSuggestions(false);
                }}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <span className="text-sm">{suggestion.address}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kiedy
        </label>
        <div className="relative">
          <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="datetime-local"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={new Date().toISOString().slice(0, 16)}
          />
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={!selectedOrigin || !selectedDest || loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Szukam tras...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Znajdź połączenia
          </>
        )}
      </button>
    </div>
  );
}
