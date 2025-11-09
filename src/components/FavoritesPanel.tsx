import { useState, useEffect } from 'react';
import { Star, Trash2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Favorite {
  id: string;
  name: string;
  origin: string;
  destination: string;
}

interface FavoritesPanelProps {
  onSelectFavorite: (origin: string, destination: string) => void;
}

export function FavoritesPanel({ onSelectFavorite }: FavoritesPanelProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFavName, setNewFavName] = useState('');
  const [newFavOrigin, setNewFavOrigin] = useState('');
  const [newFavDest, setNewFavDest] = useState('');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const { data } = await supabase
      .from('favorite_routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setFavorites(data);
    }
  };

  const addFavorite = async () => {
    if (!newFavName || !newFavOrigin || !newFavDest) return;

    const { error } = await supabase
      .from('favorite_routes')
      .insert({
        name: newFavName,
        origin: newFavOrigin,
        destination: newFavDest
      });

    if (!error) {
      loadFavorites();
      setShowAddForm(false);
      setNewFavName('');
      setNewFavOrigin('');
      setNewFavDest('');
    }
  };

  const deleteFavorite = async (id: string) => {
    await supabase
      .from('favorite_routes')
      .delete()
      .eq('id', id);

    loadFavorites();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-semibold">Ulubione trasy</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAddForm ? 'Anuluj' : '+ Dodaj'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Nazwa trasy (np. Dom-Praca)"
            value={newFavName}
            onChange={(e) => setNewFavName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Początek"
            value={newFavOrigin}
            onChange={(e) => setNewFavOrigin(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Koniec"
            value={newFavDest}
            onChange={(e) => setNewFavDest(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addFavorite}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Zapisz
          </button>
        </div>
      )}

      <div className="space-y-2">
        {favorites.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Brak zapisanych tras
          </p>
        ) : (
          favorites.map((fav) => (
            <div
              key={fav.id}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <button
                  onClick={() => onSelectFavorite(fav.origin, fav.destination)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium text-gray-900 mb-1">{fav.name}</div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{fav.origin}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{fav.destination}</span>
                  </div>
                </button>
                <button
                  onClick={() => deleteFavorite(fav.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
