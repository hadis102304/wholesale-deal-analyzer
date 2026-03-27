import { useEffect } from 'react';

const GOOGLE_PLACES_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? '';

export function useGooglePlaces(inputRef, onPlaceSelected) {
  useEffect(() => {
    if (!GOOGLE_PLACES_KEY || !inputRef.current) return;

    const SCRIPT_ID = 'google-places-script';

    const attach = () => {
      if (!window.google?.maps?.places) return;
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place?.formatted_address) onPlaceSelected(place.formatted_address);
      });
    };

    if (document.getElementById(SCRIPT_ID)) {
      // Script already loaded
      if (window.google) attach();
      return;
    }

    const script    = document.createElement('script');
    script.id       = SCRIPT_ID;
    script.src      = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_KEY}&libraries=places`;
    script.async    = true;
    script.defer    = true;
    script.onload   = attach;
    document.head.appendChild(script);
  }, [inputRef, onPlaceSelected]);
}
