export interface Location {
  latitude: number;
  longitude: number;
}

export interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  photos?: string[];
}

export interface Building {
  id: string;
  name: string;
  location: Location;
  address?: string;
  description?: string;
  photos?: string[];
}

export interface Toilet {
  id: string;
  name: string;
  location: Location;
  rating: number;
  reviewCount: number;
  isAccessible: boolean;
  address: string;
  distance?: number; // Distance in meters from user's current location
  openingHours?: {
    open: string;
    close: string;
  };
  amenities: {
    hasBabyChanging: boolean;
    hasShower: boolean;
    isGenderNeutral: boolean;
    hasPaperTowels: boolean;
    hasHandDryer: boolean;
    hasWaterSpray: boolean;
    hasSoap: boolean;
  };
  // Building & floor information
  buildingId?: string;
  buildingName?: string;
  floorLevel?: number; // Positive for above ground, negative for below ground
  floorName?: string; // Human-readable floor name (e.g., "L3", "B2", "Food Court")
  photos?: string[];
  reviews?: Review[];
  lastUpdated: string;
  createdAt: string;
}
