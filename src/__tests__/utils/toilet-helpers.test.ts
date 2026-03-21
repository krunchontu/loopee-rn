/**
 * @file toilet-helpers unit tests
 *
 * Tests for amenities normalization, building info normalization,
 * and full toilet data normalization.
 */

import type { Toilet } from "../../types/toilet";
import {
  normalizeAmenities,
  normalizeBuildingInfo,
  normalizeToiletData,
  DEFAULT_AMENITIES,
} from "../../utils/toilet-helpers";

describe("normalizeAmenities", () => {
  it("should return all-false defaults when called with null", () => {
    expect(normalizeAmenities(null)).toEqual(DEFAULT_AMENITIES);
  });

  it("should return all-false defaults when called with undefined", () => {
    expect(normalizeAmenities(undefined)).toEqual(DEFAULT_AMENITIES);
  });

  it("should return all-false defaults when called with empty object", () => {
    expect(normalizeAmenities({})).toEqual(DEFAULT_AMENITIES);
  });

  it("should return a new object each time (no shared reference)", () => {
    const a = normalizeAmenities(null);
    const b = normalizeAmenities(null);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  describe("canonical (prefixed) format", () => {
    it("should pass through canonical keys correctly", () => {
      const input: Toilet["amenities"] = {
        hasBabyChanging: true,
        hasShower: true,
        isGenderNeutral: false,
        hasPaperTowels: true,
        hasHandDryer: false,
        hasWaterSpray: true,
        hasSoap: true,
      };
      expect(normalizeAmenities(input)).toEqual(input);
    });

    it("should handle partial canonical keys", () => {
      const result = normalizeAmenities({ hasSoap: true });
      expect(result.hasSoap).toBe(true);
      expect(result.hasBabyChanging).toBe(false);
      expect(result.hasShower).toBe(false);
    });
  });

  describe("legacy (un-prefixed) format", () => {
    it("should convert legacy babyChanging to hasBabyChanging", () => {
      const result = normalizeAmenities({ babyChanging: true });
      expect(result.hasBabyChanging).toBe(true);
    });

    it("should convert legacy shower to hasShower", () => {
      const result = normalizeAmenities({ shower: true });
      expect(result.hasShower).toBe(true);
    });

    it("should convert legacy genderNeutral to isGenderNeutral", () => {
      const result = normalizeAmenities({ genderNeutral: true });
      expect(result.isGenderNeutral).toBe(true);
    });

    it("should convert legacy paperTowels to hasPaperTowels", () => {
      const result = normalizeAmenities({ paperTowels: true });
      expect(result.hasPaperTowels).toBe(true);
    });

    it("should convert legacy handDryer to hasHandDryer", () => {
      const result = normalizeAmenities({ handDryer: true });
      expect(result.hasHandDryer).toBe(true);
    });

    it("should convert legacy waterSpray to hasWaterSpray", () => {
      const result = normalizeAmenities({ waterSpray: true });
      expect(result.hasWaterSpray).toBe(true);
    });

    it("should convert legacy soap to hasSoap", () => {
      const result = normalizeAmenities({ soap: true });
      expect(result.hasSoap).toBe(true);
    });

    it("should convert all legacy keys at once", () => {
      const result = normalizeAmenities({
        babyChanging: true,
        shower: true,
        genderNeutral: true,
        paperTowels: true,
        handDryer: true,
        waterSpray: true,
        soap: true,
      });
      expect(result).toEqual({
        hasBabyChanging: true,
        hasShower: true,
        isGenderNeutral: true,
        hasPaperTowels: true,
        hasHandDryer: true,
        hasWaterSpray: true,
        hasSoap: true,
      });
    });
  });

  describe("mixed format handling", () => {
    it("should prefer canonical key when both formats present", () => {
      const result = normalizeAmenities({
        hasBabyChanging: true,
        babyChanging: false,
      });
      expect(result.hasBabyChanging).toBe(true);
    });

    it("should use legacy key when canonical is false but legacy is true", () => {
      const result = normalizeAmenities({
        hasBabyChanging: false,
        babyChanging: true,
      });
      // canonical key was explicitly false, legacy provides fallback
      expect(result.hasBabyChanging).toBe(true);
    });

    it("should handle mix of canonical and legacy keys", () => {
      const result = normalizeAmenities({
        hasBabyChanging: true,
        shower: true,
        isGenderNeutral: false,
        handDryer: true,
      });
      expect(result.hasBabyChanging).toBe(true);
      expect(result.hasShower).toBe(true);
      expect(result.isGenderNeutral).toBe(false);
      expect(result.hasHandDryer).toBe(true);
      expect(result.hasPaperTowels).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should strip unknown keys", () => {
      const result = normalizeAmenities({
        hasSoap: true,
        unknownKey: true,
        malicious: "payload",
      } as any);
      expect(result.hasSoap).toBe(true);
      expect((result as any).unknownKey).toBeUndefined();
      expect((result as any).malicious).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(7);
    });

    it("should coerce truthy non-boolean values to true", () => {
      const result = normalizeAmenities({
        hasSoap: 1 as any,
        hasShower: "yes" as any,
      });
      expect(result.hasSoap).toBe(true);
      expect(result.hasShower).toBe(true);
    });

    it("should coerce falsy non-boolean values to false", () => {
      const result = normalizeAmenities({
        hasSoap: 0 as any,
        hasShower: "" as any,
        hasBabyChanging: null as any,
      });
      expect(result.hasSoap).toBe(false);
      expect(result.hasShower).toBe(false);
      expect(result.hasBabyChanging).toBe(false);
    });

    it("should always return exactly 7 keys", () => {
      const cases = [
        null,
        undefined,
        {},
        { hasSoap: true },
        { babyChanging: true, handDryer: false },
      ];
      for (const input of cases) {
        const result = normalizeAmenities(input as any);
        expect(Object.keys(result)).toHaveLength(7);
      }
    });
  });
});

describe("DEFAULT_AMENITIES", () => {
  it("should have exactly 7 keys", () => {
    expect(Object.keys(DEFAULT_AMENITIES)).toHaveLength(7);
  });

  it("should have all values as false", () => {
    for (const value of Object.values(DEFAULT_AMENITIES)) {
      expect(value).toBe(false);
    }
  });

  it("should contain all expected keys", () => {
    expect(DEFAULT_AMENITIES).toHaveProperty("hasBabyChanging");
    expect(DEFAULT_AMENITIES).toHaveProperty("hasShower");
    expect(DEFAULT_AMENITIES).toHaveProperty("isGenderNeutral");
    expect(DEFAULT_AMENITIES).toHaveProperty("hasPaperTowels");
    expect(DEFAULT_AMENITIES).toHaveProperty("hasHandDryer");
    expect(DEFAULT_AMENITIES).toHaveProperty("hasWaterSpray");
    expect(DEFAULT_AMENITIES).toHaveProperty("hasSoap");
  });
});

describe("normalizeBuildingInfo", () => {
  it("should return camelCase field values when present", () => {
    const result = normalizeBuildingInfo({
      buildingName: "Test Building",
      floorLevel: 3,
      floorName: "L3",
    });
    expect(result.buildingName).toBe("Test Building");
    expect(result.floorLevel).toBe(3);
    expect(result.floorName).toBe("L3");
  });

  it("should fall back to snake_case fields", () => {
    const result = normalizeBuildingInfo({
      building_name: "Snake Building",
      floor_level: 2,
      floor_name: "L2",
    });
    expect(result.buildingName).toBe("Snake Building");
    expect(result.floorLevel).toBe(2);
    expect(result.floorName).toBe("L2");
  });

  it("should return defaults when no fields present", () => {
    const result = normalizeBuildingInfo({});
    expect(result.buildingName).toBe("Public Facility");
    expect(result.floorLevel).toBe(1);
    expect(result.floorName).toBe("Level 1");
  });
});

describe("normalizeToiletData", () => {
  const minimalToilet = {
    id: "test-id",
    name: "Test Toilet",
    location: { latitude: 1.3, longitude: 103.8 },
  };

  it("should throw on null input", () => {
    expect(() => normalizeToiletData(null)).toThrow(
      "Cannot normalize null or undefined toilet data",
    );
  });

  it("should normalize a minimal toilet object", () => {
    const result = normalizeToiletData(minimalToilet);
    expect(result.id).toBe("test-id");
    expect(result.name).toBe("Test Toilet");
    expect(result.amenities).toEqual(DEFAULT_AMENITIES);
    expect(result.rating).toBe(0);
    expect(result.reviewCount).toBe(0);
    expect(result.photos).toEqual([]);
  });

  it("should normalize amenities within full toilet data", () => {
    const result = normalizeToiletData({
      ...minimalToilet,
      amenities: { babyChanging: true, soap: true },
    });
    expect(result.amenities.hasBabyChanging).toBe(true);
    expect(result.amenities.hasSoap).toBe(true);
    expect(result.amenities.hasShower).toBe(false);
  });

  it("should parse string rating to number", () => {
    const result = normalizeToiletData({
      ...minimalToilet,
      rating: "4.5",
    });
    expect(result.rating).toBe(4.5);
  });

  it("should handle snake_case field names", () => {
    const result = normalizeToiletData({
      ...minimalToilet,
      is_accessible: true,
      building_name: "Mall",
      floor_level: 2,
      updated_at: "2025-01-01",
      created_at: "2025-01-01",
    });
    expect(result.isAccessible).toBe(true);
    expect(result.buildingName).toBe("Mall");
    expect(result.floorLevel).toBe(2);
  });
});
