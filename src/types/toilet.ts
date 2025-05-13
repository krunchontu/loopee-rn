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
  photos?: string[];
  reviews?: Review[];
  lastUpdated: string;
  createdAt: string;
}
