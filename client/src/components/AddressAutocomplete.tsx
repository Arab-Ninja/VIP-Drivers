import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Place {
  label: string;
  lat: number;
  lon: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: Place) => void;
  placeholder?: string;
  label: string;
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, label }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSelected, setIsSelected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=be,fr,lu,de,nl`,
        { headers: { 'Accept-Language': 'fr', 'User-Agent': 'VIP-Drivers/1.0' } }
      );
      const data: NominatimResult[] = await response.json();
      const places: Place[] = data.map(item => ({
        label: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
      setSuggestions(places);
      setIsOpen(places.length > 0);
      setHighlightedIndex(-1);
    } catch (error) {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSelected) {
      setIsSelected(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (place: Place) => {
    setIsSelected(true);
    onChange(place.label.split(',').slice(0, 3).join(',').trim());
    onSelect(place);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setIsSelected(false); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.75rem 2.5rem 0.75rem 0.75rem',
            background: '#1a1a1a',
            border: '1px solid #333333',
            color: '#ffffff',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#888888' }}>
          {isLoading ? <Loader2 size={16} style={{ animation: 'spin-ac 1s linear infinite' }} /> : <MapPin size={16} />}
        </div>
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#1a1a1a',
          border: '1px solid #444444',
          borderRadius: '0.5rem',
          marginTop: '0.25rem',
          padding: 0,
          listStyle: 'none',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {suggestions.map((place, index) => (
            <li
              key={index}
              onMouseDown={() => handleSelect(place)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                color: highlightedIndex === index ? '#d4af37' : '#cccccc',
                background: highlightedIndex === index ? '#2a2a2a' : 'transparent',
                fontSize: '0.875rem',
                borderBottom: index < suggestions.length - 1 ? '1px solid #2a2a2a' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <MapPin size={12} style={{ flexShrink: 0, color: '#d4af37' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.label}</span>
            </li>
          ))}
        </ul>
      )}
      <style>{`@keyframes spin-ac { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}
