import { describe, expect, it } from "vitest";
import { orderBetween } from "./queue-order";

describe("orderBetween", () => {
  it("di antara dua item → nilai tengah", () => {
    expect(orderBetween(1000, 2000)).toBe(1500);
  });

  it("paling atas / paling bawah / kolom kosong", () => {
    expect(orderBetween(undefined, 1000)).toBe(0);
    expect(orderBetween(3000, undefined)).toBe(4000);
    expect(orderBetween()).toBe(1000);
  });

  it("sisipan berulang di titik yang sama tetap berurutan", () => {
    let below = 2000;
    for (let i = 0; i < 40; i++) {
      const v = orderBetween(1000, below);
      expect(v).toBeGreaterThan(1000);
      expect(v).toBeLessThan(below);
      below = v;
    }
  });
});
