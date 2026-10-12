import { describe, expect, it } from 'vitest';
import { clearStep, shapeEdge, smokeNoise } from '../src/ui/fog';

describe('fog smoke', () => {
  it('makes noise from 0 to 1 that tiles without a seam', () => {
    const size = 64;
    const noise = smokeNoise('test', size, [16, 8, 4]);
    expect(Math.min(...noise)).toBe(0);
    expect(Math.max(...noise)).toBe(1);
    expect(smokeNoise('test', size, [16, 8, 4])).toEqual(noise);
    // Across the seam the noise changes no more than it does between any two neighbors.
    let steepest = 0;
    let seam = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 1; x < size; x++) steepest = Math.max(steepest, Math.abs((noise[y * size + x] ?? 0) - (noise[y * size + x - 1] ?? 0)));
      seam = Math.max(seam, Math.abs((noise[y * size] ?? 0) - (noise[y * size + size - 1] ?? 0)));
    }
    expect(seam).toBeLessThanOrEqual(steepest * 1.5);
  });

  it('roughs up the edge of a clearing, but never lets fog back in as it grows', () => {
    for (const noise of [0, 0.25, 0.5, 0.75, 1]) {
      expect(shapeEdge(0, noise)).toBe(0);
      expect(shapeEdge(1, noise)).toBe(1);
      let previous = 0;
      for (let lifted = 0; lifted <= 1; lifted += 1 / 255) {
        const shaped = shapeEdge(lifted, noise);
        expect(shaped).toBeGreaterThanOrEqual(previous);
        previous = shaped;
      }
    }
    // The same amount of lift comes out different where the smoke is thicker.
    expect(shapeEdge(0.5, 0)).toBeLessThan(shapeEdge(0.5, 1));
  });

  it('clears like smoke: thin patches first, never past where it is headed, done in seconds', () => {
    const secondsToClear = (thickness: number) => {
      let shown = 0;
      let t = 0;
      while (shown < 1) {
        const next = clearStep(shown, 1, thickness, 1 / 60);
        expect(next).toBeGreaterThan(shown);
        expect(next).toBeLessThanOrEqual(1);
        shown = next;
        t += 1 / 60;
      }
      return t;
    };
    const thin = secondsToClear(0);
    const thick = secondsToClear(1);
    expect(thin).toBeLessThan(thick);
    expect(thin).toBeGreaterThan(0.5);
    expect(thick).toBeLessThan(8);
    // Already there: stays put.
    expect(clearStep(0.6, 0.6, 0.5, 1 / 60)).toBe(0.6);
  });
});
