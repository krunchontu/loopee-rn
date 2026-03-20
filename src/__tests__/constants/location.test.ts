import { DEFAULT_LOCATION, DEFAULT_MAP_REGION } from "../../constants/location";

describe("Location constants", () => {
  describe("DEFAULT_LOCATION", () => {
    it("should contain valid Singapore coordinates", () => {
      // Singapore latitude is ~1.35, longitude is ~103.82
      expect(DEFAULT_LOCATION.latitude).toBeCloseTo(1.3521, 4);
      expect(DEFAULT_LOCATION.longitude).toBeCloseTo(103.8198, 4);
    });

    it("should have latitude within valid range (-90 to 90)", () => {
      expect(DEFAULT_LOCATION.latitude).toBeGreaterThanOrEqual(-90);
      expect(DEFAULT_LOCATION.latitude).toBeLessThanOrEqual(90);
    });

    it("should have longitude within valid range (-180 to 180)", () => {
      expect(DEFAULT_LOCATION.longitude).toBeGreaterThanOrEqual(-180);
      expect(DEFAULT_LOCATION.longitude).toBeLessThanOrEqual(180);
    });
  });

  describe("DEFAULT_MAP_REGION", () => {
    it("should include DEFAULT_LOCATION coordinates", () => {
      expect(DEFAULT_MAP_REGION.latitude).toBe(DEFAULT_LOCATION.latitude);
      expect(DEFAULT_MAP_REGION.longitude).toBe(DEFAULT_LOCATION.longitude);
    });

    it("should have positive delta values for map zoom", () => {
      expect(DEFAULT_MAP_REGION.latitudeDelta).toBeGreaterThan(0);
      expect(DEFAULT_MAP_REGION.longitudeDelta).toBeGreaterThan(0);
    });
  });
});
