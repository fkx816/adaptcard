export function getSessionAccuracy(reviewedCount: number, correctCount: number): number {
  if (reviewedCount <= 0) {
    return 0;
  }
  return correctCount / reviewedCount;
}
