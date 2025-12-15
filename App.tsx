import React, { useState, useEffect } from 'react';
// @ts-ignore
import SolarSystem from './components/SolarSystem';
// @ts-ignore
import HandController from './components/HandController';
import { HandGestureState, PlanetData } from './types';

// --- DATA DEFINITION ---
const PLANETS: PlanetData[] = [
  { 
    id: 'sun', 
    name: 'Sun', 
    radius: 4, 
    distance: 0, 
    speed: 0, 
    startAngle: 0, 
    color: '#FDB813', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/4k_sun.jpg', 
    description: '' 
  },
  { 
    id: 'mercury', 
    name: 'Mercury', 
    radius: 0.8, 
    distance: 8, 
    speed: 0.8, 
    startAngle: Math.random() * 6, 
    color: '#A5A5A5', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg', 
    description: '' 
  },
  { 
    id: 'venus', 
    name: 'Venus', 
    radius: 1.5, 
    distance: 12, 
    speed: 0.6, 
    startAngle: Math.random() * 6, 
    color: '#E3BB76', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg', 
    description: '' 
  },
  { 
    id: 'earth', 
    name: 'Earth', 
    radius: 1.6, 
    distance: 18, 
    speed: 0.4, 
    startAngle: Math.random() * 6, 
    color: '#657f48', 
    textureMap: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lfs_earth_4k.jpg',
    description: '', 
    moons: [{ id: 'moon', name: 'Moon', radius: 0.4, distance: 3, speed: 1.5, startAngle: 0, color: '#DDDDDD', textureMap: 'https://www.solarsystemscope.com/textures/download/8k_moon.jpg', description: '' }] 
  },
  { 
    id: 'mars', 
    name: 'Mars', 
    radius: 1.2, 
    distance: 24, 
    speed: 0.3, 
    startAngle: Math.random() * 6, 
    color: '#EB4D4B', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg', 
    description: '' 
  },
  { 
    id: 'jupiter', 
    name: 'Jupiter', 
    radius: 3.5, 
    distance: 34, 
    speed: 0.15, 
    startAngle: Math.random() * 6, 
    color: '#F0932B', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg', 
    description: '' 
  },
  { 
    id: 'saturn', 
    name: 'Saturn', 
    radius: 3, 
    distance: 46, 
    speed: 0.1, 
    startAngle: Math.random() * 6, 
    color: '#F6E58D', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg', 
    ringColor: '#C4A484', 
    description: '' 
  },
  { 
    id: 'uranus', 
    name: 'Uranus', 
    radius: 2.2, 
    distance: 58, 
    speed: 0.07, 
    startAngle: Math.random() * 6, 
    color: '#7ED6DF', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg', 
    description: '' 
  },
  { 
    id: 'neptune', 
    name: 'Neptune', 
    radius: 2.1, 
    distance: 70, 
    speed: 0.05, 
    startAngle: Math.random() * 6, 
    color: '#4834D4', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg', 
    description: '' 
  },
  { 
    id: 'pluto', 
    name: 'Pluto', 
    radius: 0.4, 
    distance: 82, 
    speed: 0.03, 
    startAngle: Math.random() * 6, 
    color: '#D3D3D3', 
    textureMap: 'https://www.solarsystemscope.com/textures/download/2k_pluto.jpg', 
    description: '' 
  },
];

type AppState = 'WAITING_FOR_CAM' | 'COUNTDOWN' | 'ACTIVE';

const App: React.FC = () => {
  const [handState, setHandState] = useState<HandGestureState>({ isDetected: false, gesture: 'NEUTRAL', x: 0, y: 0 });
  const [tourIndex, setTourIndex] = useState(-1);
  const [prevGesture, setPrevGesture] = useState<string>('NEUTRAL');
  
  // Intro State Management
  const [appState, setAppState] = useState<AppState>('WAITING_FOR_CAM');
  const [countdown, setCountdown] = useState(5);

  const handleHandUpdate = (newState: HandGestureState) => {
    setHandState(newState);
  };

  // Called by HandController when webcam stream is successfully loaded
  const handleCameraReady = () => {
    if (appState === 'WAITING_FOR_CAM') {
      setAppState('COUNTDOWN');
    }
  };

  // Countdown Logic
  useEffect(() => {
    let timer: number;
    if (appState === 'COUNTDOWN') {
      if (countdown > 0) {
        timer = window.setTimeout(() => setCountdown(c => c - 1), 1000);
      } else {
        setAppState('ACTIVE');
      }
    }
    return () => clearTimeout(timer);
  }, [appState, countdown]);

  useEffect(() => {
    if (handState.gesture === 'POINTING' && prevGesture !== 'POINTING') {
      setTourIndex(prev => {
        let next = prev + 1;
        if (next >= PLANETS.length) next = 1; 
        if (next === 0) next = 1; 
        return next;
      });
    }
    setPrevGesture(handState.gesture);
  }, [handState.gesture, prevGesture]);

  const activeFocusPlanet = handState.gesture === 'POINTING' && tourIndex > 0 ? PLANETS[tourIndex] : null;

  // Determine CSS classes for the Camera Window transition
  // Transition: ease-in-out duration-1000 (1 second smooth transition)
  const getCameraClasses = () => {
    const baseClasses = "fixed z-50 bg-black/50 overflow-hidden backdrop-blur-md transition-all duration-1000 ease-in-out border border-white/20 shadow-2xl";
    
    if (appState === 'ACTIVE') {
      // Small corner mode
      return `${baseClasses} bottom-4 left-4 w-48 h-36 rounded-xl`;
    } else {
      // Full screen mode
      return `${baseClasses} inset-0 w-full h-full rounded-none`;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white">
      {/* Solar System - Fades in when Active */}
      <div className={`w-full h-full transition-opacity duration-1000 ${appState === 'ACTIVE' ? 'opacity-100' : 'opacity-0'}`}>
        <SolarSystem 
          planets={PLANETS}
          handState={handState} 
          focusedPlanet={activeFocusPlanet}
        />
      </div>

      {/* Hand Controller (Camera) - Transitions from Full to Small */}
      <HandController 
        className={getCameraClasses()}
        onUpdate={handleHandUpdate} 
        onCameraReady={handleCameraReady}
      />

      {/* HUD Controls (Only visible when active) */}
      <div className={`absolute bottom-4 right-4 pointer-events-none text-right z-10 transition-opacity duration-500 ${appState === 'ACTIVE' ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`transition-opacity duration-300 ${handState.isDetected ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-xs text-green-400 font-mono">SYSTEM ACTIVE</p>
          <p className="text-lg font-bold text-white uppercase tracking-widest">
            {handState.gesture === 'NEUTRAL' && 'CONTROL ACTIVE'}
            {handState.gesture === 'OPEN' && 'ZOOMING IN'}
            {handState.gesture === 'CLOSED' && 'ZOOMING OUT'}
            {handState.gesture === 'POINTING' && `TRACKING: ${activeFocusPlanet?.name || 'Scan...'}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
