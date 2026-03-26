import { useMemo, useState, type MouseEvent } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

export type GeoChoice = {
  label: string;
  lat: number;
  lng: number;
  placeType: string;
};

export default function GeoPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (choice: GeoChoice) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [mapMode, setMapMode] = useState(false);
  const [mapSelected, setMapSelected] = useState<null | {
    lat: number;
    lng: number;
    xPct: number;
    yPct: number;
  }>(null);

  const places = useMemo<GeoChoice[]>(
    () => [
      { label: 'Coffee Shop', lat: 56.85, lng: 36.85, placeType: 'shop' },
      { label: 'Центральная площадь', lat: 56.86, lng: 36.86, placeType: 'square' },
      { label: 'Кафе Молка', lat: 56.84, lng: 36.88, placeType: 'cafe' },
      { label: 'Набережная Волги', lat: 56.83, lng: 36.87, placeType: 'river' },
      { label: 'Греночка', lat: 56.82, lng: 36.86, placeType: 'food' },
      { label: 'Конаковский бор', lat: 56.87, lng: 36.89, placeType: 'nature' },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) => p.label.toLowerCase().includes(q));
  }, [places, query]);

  if (!open) return null;

  const circleStyle = (type: string) => {
    switch (type) {
      case 'shop':
        return 'bg-[#7C3AED]';
      case 'square':
        return 'bg-[#F97316]';
      case 'cafe':
        return 'bg-[#EF4444]';
      case 'river':
        return 'bg-[#60A5FA]';
      case 'food':
        return 'bg-[#F43F5E]';
      case 'nature':
        return 'bg-[#22C55E]';
      default:
        return 'bg-primary';
    }
  };

  const circleEmoji = (type: string) => {
    switch (type) {
      case 'shop':
        return '☕';
      case 'square':
        return '🎡';
      case 'cafe':
        return '🍔';
      case 'river':
        return '🌊';
      case 'food':
        return '🍟';
      case 'nature':
        return '🌲';
      default:
        return '📍';
    }
  };

  const handlePick = (choice: GeoChoice) => {
    onPick(choice);
    onClose();
  };

  const MAP_BOUNDS = useMemo(() => {
    // Demo bounds around the hardcoded places in this prototype.
    // (Not a real map projection; just a usable UI.)
    return {
      latMin: 56.78,
      latMax: 56.92,
      lngMin: 36.78,
      lngMax: 36.92,
    };
  }, []);

  const onMapClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!mapMode) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    const lat = MAP_BOUNDS.latMax - y * (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin);
    const lng = MAP_BOUNDS.lngMin + x * (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin);

    setMapSelected({ lat, lng, xPct: x * 100, yPct: y * 100 });
  };

  return (
    <div className="fixed inset-0 z-[180] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-background-medium border border-background-light shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-4 py-3 border-b border-background-light/70 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <MapPin className="w-4 h-4 text-text-secondary" />
            {t('geo.title')}
          </div>
          <button
            type="button"
            className="p-1.5 hover:bg-background-light rounded-full transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="rounded-xl overflow-hidden border border-background-light/70 bg-background-dark/10">
            <div className="relative">
              <div
                className={[
                  'h-56 bg-[#0B1220] flex items-center justify-center relative overflow-hidden',
                  mapMode ? 'cursor-crosshair' : 'cursor-pointer',
                ].join(' ')}
                onClick={onMapClick}
                role="button"
                tabIndex={0}
                aria-label="Map"
              >
                {/* Map placeholder */}
                <svg width="220" height="160" viewBox="0 0 220 160" fill="none" aria-hidden="true">
                  <rect x="0" y="0" width="220" height="160" rx="14" fill="#0B1220" />
                  <path d="M30 90 C60 40, 120 40, 150 95 C165 120, 175 135, 200 140" stroke="#60A5FA" strokeWidth="5" strokeLinecap="round" />
                  <path d="M35 70 C55 55, 75 50, 95 58 C120 70, 140 65, 180 40" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
                  {mapSelected ? (
                    <g>
                      <circle cx={110 + ((mapSelected.xPct - 50) / 50) * 40} cy={88 + ((mapSelected.yPct - 50) / 50) * 35} r="10" fill="#FF2B5E" fillOpacity="0.22" />
                      <circle cx={110 + ((mapSelected.xPct - 50) / 50) * 40} cy={88 + ((mapSelected.yPct - 50) / 50) * 35} r="5" fill="#FF2B5E" />
                    </g>
                  ) : (
                    <circle cx="110" cy="88" r="8" fill="#FF2B5E" fillOpacity="0.25" />
                  )}
                </svg>

                {mapSelected && (
                  <div
                    style={{ left: `${mapSelected.xPct}%`, top: `${mapSelected.yPct}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#FF2B5E] shadow-[0_0_0_6px_rgba(255,43,94,0.18)] pointer-events-none"
                  />
                )}
              </div>
              <button
                type="button"
                className="absolute left-1/2 -translate-x-1/2 bottom-4 px-5 py-2 rounded-full bg-[#1E79C7] text-white text-sm shadow"
                onClick={() => {
                  setMapMode(true);
                  setMapSelected(null);
                }}
              >
                {t('geo.chooseOnMap')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('geo.searchPlaceholder')}
                className="w-full px-3 py-2 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="text-xs text-text-secondary pt-1">{t('geo.orChoosePlace')}</div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {filtered.map((p) => (
              <button
                key={`${p.placeType}-${p.label}`}
                type="button"
                onClick={() => handlePick(p)}
                className="w-full text-left rounded-xl px-3 py-2 hover:bg-background-light/60 transition-colors flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${circleStyle(p.placeType)}`}>
                  <span className="text-white text-lg">{circleEmoji(p.placeType)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-text-primary truncate">{p.label}</div>
                  <div className="text-xs text-text-secondary truncate">{p.placeType}</div>
                </div>
              </button>
            ))}
          </div>

          {mapSelected && (
            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                className="px-5 py-2 rounded-full bg-primary text-white text-sm shadow"
                onClick={() =>
                  handlePick({
                    label: query.trim() ? query.trim() : t('geo.mapCustomLabel'),
                    lat: mapSelected.lat,
                    lng: mapSelected.lng,
                    placeType: 'custom',
                  })
                }
              >
                {t('geo.mapSend')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

