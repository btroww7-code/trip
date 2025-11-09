import { useState, useCallback } from 'react';
import { Location, TravelRoute, searchRoutes, geocodeAddress } from '../services/ztmApi';

export function useRouteSearch() {
  const [routes, setRoutes] = useState<TravelRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);

  const searchByAddress = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);

    try {
      const fromLoc = await geocodeAddress(from);
      const toLoc = await geocodeAddress(to);

      if (!fromLoc || !toLoc) {
        setError('Nie można znaleźć podanych lokalizacji');
        setLoading(false);
        return;
      }

      setFromLocation(fromLoc);
      setToLocation(toLoc);

      const foundRoutes = await searchRoutes(fromLoc, toLoc);
      setRoutes(foundRoutes);
    } catch (err) {
      setError('Wystąpił błąd podczas wyszukiwania tras');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByCoordinates = useCallback(async (from: Location, to: Location) => {
    setLoading(true);
    setError(null);

    try {
      setFromLocation(from);
      setToLocation(to);

      const foundRoutes = await searchRoutes(from, to);
      setRoutes(foundRoutes);
    } catch (err) {
      setError('Wystąpił błąd podczas wyszukiwania tras');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setRoutes([]);
    setFromLocation(null);
    setToLocation(null);
    setError(null);
  }, []);

  return {
    routes,
    loading,
    error,
    fromLocation,
    toLocation,
    searchByAddress,
    searchByCoordinates,
    clearSearch,
  };
}
