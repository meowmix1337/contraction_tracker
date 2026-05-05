export interface Contraction {
  id: string;
  startTime: number;
  endTime: number | null;
  duration: number | null; // seconds
  interval: number | null; // seconds since last contraction ended
  painLevel: number | null; // 1–5
}
