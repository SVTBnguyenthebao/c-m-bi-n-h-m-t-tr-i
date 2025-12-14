import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetData, HandGestureState } from '../types';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface SolarSystemProps {
  planets: PlanetData[];
  handState: HandGestureState;
  focusedPlanet: PlanetData | null;
}

interface PlanetMeshProps {
  planet: PlanetData;
  focusedPlanet: PlanetData | null;
}

// --- SAFE TEXTURE HOOK ---
function useSafeTexture(url: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setError(true);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous'); 
    
    loader.load(
      url,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTexture);
        setError(false);
      },
      undefined, // onProgress
      (err) => {
        console.warn(`Failed to load texture: ${url}`, err);
        setError(true);
      }
    );
  }, [url]);

  return { texture, error };
}

// --- COLORFUL STARFIELD ---
const ColorfulStarField = () => {
  const count = 3000;
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorPalette = [
      new THREE.Color('#ffffff'), // White
      new THREE.Color('#ffddaa'), // Yellowish
      new THREE.Color('#aaddff'), // Blueish
      new THREE.Color('#ffccff'), // Pinkish
      new THREE.Color('#ccffcc'), // Greenish
    ];

    for (let i = 0; i < count; i++) {
      // Random position on a sphere
      const r = 350 + Math.random() * 100;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Random color
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return [positions, colors];
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.5}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};

// --- GLOW TEXTURE GENERATOR ---
const getGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    g.addColorStop(0.2, "rgba(255, 220, 180, 0.8)");
    g.addColorStop(0.5, "rgba(255, 200, 100, 0.3)");
    g.addColorStop(1, "rgba(255, 100, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
};

// --- SATURN RING TEXTURE GENERATOR ---
const getSaturnRingTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1; // 1D strip is enough for concentric rings
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 512, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.1, 'rgba(100,100,100,0.1)'); 
    gradient.addColorStop(0.2, 'rgba(100,100,100,0.2)'); 
    gradient.addColorStop(0.21, 'rgba(230,230,210,0.8)'); 
    gradient.addColorStop(0.45, 'rgba(255,255,240,1.0)'); 
    gradient.addColorStop(0.50, 'rgba(230,230,210,0.9)'); 
    gradient.addColorStop(0.52, 'rgba(0,0,0,0.05)'); 
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.05)'); 
    gradient.addColorStop(0.56, 'rgba(200,200,200,0.7)'); 
    gradient.addColorStop(0.9, 'rgba(180,180,180,0.5)'); 
    gradient.addColorStop(1, 'rgba(0,0,0,0)'); 
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};


const SunGlow = () => {
  const texture = useMemo(() => getGlowTexture(), []);
  return (
    <group>
      <pointLight position={[0, 0, 0]} intensity={2000} distance={1000} decay={2} color="#FFFFFF" />
      <sprite scale={[30, 30, 1]}>
        <spriteMaterial map={texture} transparent={true} opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite scale={[50, 50, 1]}>
        <spriteMaterial map={texture} transparent={true} opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
};

// --- PLANET COMPONENTS ---
const PlanetMaterial = ({ planet }: { planet: PlanetData }) => {
  const { texture, error } = useSafeTexture(planet.textureMap);
  const isSun = planet.id === 'sun';
  const isEarth = planet.id === 'earth';

  if (error || !texture) {
    return (
      <meshStandardMaterial 
        color={planet.color}
        emissive={isSun ? new THREE.Color(planet.color) : new THREE.Color('#000000')}
        emissiveIntensity={isSun ? 1 : 0}
        metalness={0.2}
        roughness={0.7}
      />
    );
  }

  const baseColor = isEarth ? new THREE.Color(planet.color) : new THREE.Color('#ffffff');

  return (
    <meshStandardMaterial 
        map={texture}
        color={baseColor}
        emissive={isSun ? new THREE.Color(planet.color) : new THREE.Color('#000000')}
        emissiveIntensity={isSun ? 1 : 0}
        emissiveMap={isSun ? texture : undefined}
        metalness={0.2}
        roughness={0.7}
    />
  );
};

const PlanetMesh: React.FC<PlanetMeshProps> = ({ planet, focusedPlanet }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const saturnRingTexture = useMemo(() => {
    if (planet.id === 'saturn') return getSaturnRingTexture();
    return null;
  }, [planet.id]);

  const orbitPoints = useMemo(() => {
      const points = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(theta) * planet.distance, 0, Math.sin(theta) * planet.distance));
      }
      return points;
  }, [planet.distance]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      if (meshRef.current) {
        meshRef.current.rotation.y += 0.005 / (planet.radius * 0.5); 
      }
      const angle = planet.startAngle + t * planet.speed * 0.5;
      const x = Math.cos(angle) * planet.distance;
      const z = Math.sin(angle) * planet.distance;
      groupRef.current.position.set(x, 0, z);
    }
  });

  const isFocused = focusedPlanet?.id === planet.id;
  const isFocusActive = focusedPlanet !== null;
  
  const orbitColor = isFocused ? planet.color : (isFocusActive ? '#222222' : '#444444');
  const orbitOpacity = isFocused ? 1 : (isFocusActive ? 0.1 : 0.3);
  const orbitWidth = isFocused ? 2 : 1;

  return (
    <>
      {planet.distance > 0 && (
         <Line 
            points={orbitPoints} 
            color={orbitColor} 
            opacity={orbitOpacity} 
            transparent 
            lineWidth={orbitWidth} 
         />
      )}

      <group ref={groupRef}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[planet.radius, 64, 64]} />
          <PlanetMaterial planet={planet} />
        </mesh>

        {planet.id === 'saturn' && saturnRingTexture ? (
           <mesh rotation={[-Math.PI / 3, 0, 0]}>
              <ringGeometry args={[planet.radius * 1.4, planet.radius * 2.3, 128]} />
              <meshStandardMaterial 
                map={saturnRingTexture} 
                side={THREE.DoubleSide} 
                transparent={true} 
                opacity={0.9} 
                roughness={0.8}
                metalness={0.1}
                color="#FFFFFF"
              />
          </mesh>
        ) : (
          planet.ringColor && (
            <mesh rotation={[-Math.PI / 3, 0, 0]}>
                <ringGeometry args={[planet.radius * 1.4, planet.radius * 2.2, 64]} />
                <meshBasicMaterial color={planet.ringColor} side={THREE.DoubleSide} opacity={0.5} transparent />
            </mesh>
          )
        )}

        {planet.moons?.map((moon) => (
           <group key={moon.id} position={[0, 0, 0]}>
              <MoonMesh moon={moon} parentRadius={planet.radius} />
           </group>
        ))}
      </group>
    </>
  );
};

const MoonMaterial = ({ moon }: { moon: PlanetData }) => {
  const { texture, error } = useSafeTexture(moon.textureMap);

  if (error || !texture) {
    return <meshStandardMaterial color={moon.color} />;
  }
  return <meshStandardMaterial map={texture} />;
};

interface MoonMeshProps {
  moon: PlanetData;
  parentRadius: number;
}

const MoonMesh: React.FC<MoonMeshProps> = ({ moon, parentRadius }) => {
   const moonRef = useRef<THREE.Mesh>(null);
   
   const moonOrbitPoints = useMemo(() => {
        const points = [];
        const segments = 64;
        const d = parentRadius + moon.distance;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(theta) * d, 0, Math.sin(theta) * d));
        }
        return points;
    }, [moon.distance, parentRadius]);

   useFrame(({ clock }) => {
      const t = clock.getElapsedTime();
      const angle = t * moon.speed;
      if (moonRef.current) {
        const d = parentRadius + moon.distance; 
        moonRef.current.position.x = Math.cos(angle) * d;
        moonRef.current.position.z = Math.sin(angle) * d;
        moonRef.current.rotation.y += 0.01;
      }
   });

   return (
     <>
       <Line points={moonOrbitPoints} color="#ffffff" opacity={0.1} transparent lineWidth={1} />
       <mesh ref={moonRef}>
          <sphereGeometry args={[moon.radius, 32, 32]} />
          <MoonMaterial moon={moon} />
       </mesh>
     </>
   );
};

const ControlsController = ({ handState, focusedPlanet }: { handState: HandGestureState, focusedPlanet: PlanetData | null }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const lastInteractionRef = useRef(0);
  
  const currentVelocity = useRef({ x: 0, y: 0 });

  useFrame(({ clock }) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const currentTime = clock.getElapsedTime();

    // MODE 1: FOCUS / TOUR
    if (focusedPlanet) {
       lastInteractionRef.current = currentTime;
       const t = clock.getElapsedTime();
       const angle = focusedPlanet.startAngle + t * focusedPlanet.speed * 0.5;
       const pX = Math.cos(angle) * focusedPlanet.distance;
       const pZ = Math.sin(angle) * focusedPlanet.distance;
       
       const offsetX = Math.cos(angle) * (focusedPlanet.radius + 25);
       const offsetZ = Math.sin(angle) * (focusedPlanet.radius + 25);
       
       const targetPos = new THREE.Vector3(pX + offsetX, 30, pZ + offsetZ); 
       const lookAtPos = new THREE.Vector3(pX, 0, pZ);

       camera.position.lerp(targetPos, 0.1); 
       controls.target.lerp(lookAtPos, 0.1);
       controls.autoRotate = false;
       controls.update();
       return; 
    }

    // MODE 2: HAND CONTROL
    let isInteracting = false;
    const ZOOM_SPEED = 1.02; 

    if (handState.isDetected) {
       lastInteractionRef.current = currentTime;
       isInteracting = true;

       // 1. ROTATION LOGIC (Always active when hand detected)
       const TARGET_SPEED_X = 0.08; 
       const TARGET_SPEED_Y = 0.08;

       const targetVelX = -handState.x * TARGET_SPEED_X;
       const targetVelY = handState.y * TARGET_SPEED_Y;

       currentVelocity.current.x = THREE.MathUtils.lerp(currentVelocity.current.x, targetVelX, 0.1);
       currentVelocity.current.y = THREE.MathUtils.lerp(currentVelocity.current.y, targetVelY, 0.1);

       if (Math.abs(currentVelocity.current.x) > 0.001) {
          controls.setAzimuthalAngle(controls.getAzimuthalAngle() + currentVelocity.current.x);
       }
       if (Math.abs(currentVelocity.current.y) > 0.001) {
          const newPolar = controls.getPolarAngle() + currentVelocity.current.y;
          if (newPolar > 0.1 && newPolar < (Math.PI / 2 - 0.1)) {
              controls.setPolarAngle(newPolar);
          }
       }

       // 2. ZOOM LOGIC (Concurrent)
       if (handState.gesture === 'OPEN') {
           controls.dollyIn(ZOOM_SPEED);
       } 
       else if (handState.gesture === 'CLOSED') {
           controls.dollyOut(ZOOM_SPEED);
       }
       
       controls.update();
    } 
    else {
        currentVelocity.current.x = THREE.MathUtils.lerp(currentVelocity.current.x, 0, 0.2);
        currentVelocity.current.y = THREE.MathUtils.lerp(currentVelocity.current.y, 0, 0.2);
    }

    // MODE 3: IDLE & DRIFT
    if (!isInteracting) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;

        const timeSinceInteraction = currentTime - lastInteractionRef.current;
        
        if (timeSinceInteraction > 2.0) {
            const targetPolar = 0.6; 
            const currentPolar = controls.getPolarAngle();
            
            if (Math.abs(currentPolar - targetPolar) > 0.01) {
                const newPolar = THREE.MathUtils.lerp(currentPolar, targetPolar, 0.01);
                controls.setPolarAngle(newPolar);
            }

            const targetDist = 120;
            const currentDist = controls.object.position.distanceTo(controls.target);
            
            if (Math.abs(currentDist - targetDist) > 1) {
                const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
                const newDist = THREE.MathUtils.lerp(currentDist, targetDist, 0.01);
                const newPos = controls.target.clone().add(direction.multiplyScalar(newDist));
                camera.position.copy(newPos);
            }

            controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.01);
        }
    } else {
        controls.autoRotate = false;
    }
    
    controls.update();
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.05} 
      rotateSpeed={1.0} 
      zoomSpeed={0.8}
      minDistance={40}   
      maxDistance={150}  
      minPolarAngle={0.05} 
      maxPolarAngle={Math.PI / 2 - 0.1} 
    />
  );
};

const SolarSystem: React.FC<SolarSystemProps> = ({ planets, handState, focusedPlanet }) => {
  return (
    <div className="w-full h-full bg-black">
      <Canvas camera={{ position: [0, 80, 100], fov: 45 }}>
        <ambientLight intensity={0.02} />
        
        <Suspense fallback={null}>
          <ColorfulStarField />
          <SunGlow />
          
          {planets.map((planet) => (
             <PlanetMesh 
                key={planet.id} 
                planet={planet}
                focusedPlanet={focusedPlanet}
             />
          ))}
        </Suspense>
        
        <ControlsController handState={handState} focusedPlanet={focusedPlanet} />
      </Canvas>
    </div>
  );
};

export default SolarSystem;