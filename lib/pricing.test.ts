import { describe, expect, it } from "vitest";
import { amountDue, amountPaid, priceTotal } from "./pricing";

describe("priceTotal", () => {
  it("tipe saja", () => {
    expect(priceTotal({ basePrice: 100000, addonPrices: [], override: null })).toBe(100000);
  });

  it("tipe + add-on", () => {
    expect(priceTotal({ basePrice: 100000, addonPrices: [25000, 50000], override: null })).toBe(175000);
  });

  it("override menang, termasuk override 0 (gratis)", () => {
    expect(priceTotal({ basePrice: 100000, addonPrices: [25000], override: 80000 })).toBe(80000);
    expect(priceTotal({ basePrice: 100000, addonPrices: [25000], override: 0 })).toBe(0);
  });
});

describe("amountPaid / amountDue", () => {
  it("unpaid", () => {
    expect(amountPaid(150000, "unpaid", 0)).toBe(0);
    expect(amountDue(150000, "unpaid", 0)).toBe(150000);
  });

  it("dp", () => {
    expect(amountPaid(150000, "dp", 50000)).toBe(50000);
    expect(amountDue(150000, "dp", 50000)).toBe(100000);
  });

  it("paid mengabaikan dp lama", () => {
    expect(amountPaid(150000, "paid", 50000)).toBe(150000);
    expect(amountDue(150000, "paid", 50000)).toBe(0);
  });
});
