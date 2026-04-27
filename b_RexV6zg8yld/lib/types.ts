export interface User {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type LocationStatus = "idle" | "requesting" | "sharing" | "denied" | "error";
