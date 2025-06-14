import { calculatePriceWithTax } from "./src/utils";

describe("calculatePriceWithTax", () => {
  it("should calculate the correct price with tax", () => {
    const result = calculatePriceWithTax(100, 15);
    expect(result).toBe(115);
  });
});
