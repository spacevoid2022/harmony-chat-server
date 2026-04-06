import React, { useState, useEffect } from 'react';

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const GIPHY_API_KEY = 'czWuv8dkLboifma654Gq4dGsh2HfVS9N';
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = async (searchTerm: string) => {
    setLoading(true);
    const endpoint = searchTerm 
      ? `${GIPHY_BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=20&rating=g`
      : `${GIPHY_BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;

    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.data) {
        setResults(data.data);
      }
    } catch (error) {
      console.error('Error fetching Giphy GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGifs(query);
    }, query ? 500 : 0);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="gif-picker-overlay" onClick={onClose}>
      <div className="gif-picker-card" onClick={e => e.stopPropagation()}>
        <div className="gif-picker-header">
          <input 
            type="text" 
            placeholder="Search Giphy..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="gif-picker-results">
          {loading && <div className="gif-loading">Searching...</div>}
          <div className="gif-grid">
            {results.map((gif) => (
              <img 
                key={gif.id} 
                src={gif.images.fixed_height_small.url} 
                alt={gif.title}
                onClick={() => {
                  onSelect(gif.images.original.url);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GifPicker;
