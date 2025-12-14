export interface PlanetData {
  id: string;
  name: string;
  radius: number; // Size of the planet
  distance: number; // Distance from sun
  speed: number; // Orbit speed
  startAngle: number; // Initial position on orbit (0 to 2PI)
  color: string;
  textureMap: string; // Path to the texture image
  moons?: PlanetData[];
  description: string;
  ringColor?: string;
}

export interface HandGestureState {
  isDetected: boolean;
  gesture: 'OPEN' | 'CLOSED' | 'POINTING' | 'NEUTRAL';
  x: number; // -1 to 1 (screen space)
  y: number; // -1 to 1 (screen space)
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}