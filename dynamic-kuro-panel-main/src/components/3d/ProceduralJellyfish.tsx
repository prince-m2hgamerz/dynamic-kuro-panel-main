import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Float } from "@react-three/drei";

interface ProceduralJellyfishProps {
  mousePosition: { x: number; y: number };
  position?: [number, number, number];
  scale?: number;
}

// Jellyfish bell (dome) geometry
const JellyfishBell = ({ time }: { time: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    return geo;
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      // Pulsing animation
      const pulse = Math.sin(time * 2) * 0.05 + 1;
      meshRef.current.scale.set(pulse, pulse * 0.9, pulse);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]}>
      <meshPhysicalMaterial
        color="#ff6b9d"
        emissive="#ff2d7a"
        emissiveIntensity={0.3}
        transparent
        opacity={0.7}
        roughness={0.2}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        transmission={0.3}
        thickness={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Inner glow core
const JellyfishCore = ({ time }: { time: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const pulse = Math.sin(time * 3) * 0.1 + 0.8;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.2, 0]}>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshBasicMaterial
        color="#00ffff"
        transparent
        opacity={0.6}
      />
    </mesh>
  );
};

// Tentacles
const Tentacle = ({ 
  index, 
  time, 
  totalTentacles 
}: { 
  index: number; 
  time: number; 
  totalTentacles: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const angle = (index / totalTentacles) * Math.PI * 2;
  const radius = 0.6;
  const baseX = Math.cos(angle) * radius;
  const baseZ = Math.sin(angle) * radius;
  
  const curve = useMemo(() => {
    const points = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const x = baseX + Math.sin(t * Math.PI * 2 + index) * 0.2 * t;
      const y = -t * 2.5;
      const z = baseZ + Math.cos(t * Math.PI * 2 + index) * 0.2 * t;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [baseX, baseZ, index]);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 20, 0.03, 8, false);
  }, [curve]);

  useFrame(() => {
    if (meshRef.current) {
      // Wave animation for tentacles
      const positions = meshRef.current.geometry.attributes.position;
      const original = geometry.attributes.position;
      
      for (let i = 0; i < positions.count; i++) {
        const y = original.getY(i);
        const wave = Math.sin(time * 3 + y * 2 + index) * 0.1;
        positions.setX(i, original.getX(i) + wave);
        positions.setZ(i, original.getZ(i) + wave * 0.5);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color="#ff9ecd"
        emissive="#ff6b9d"
        emissiveIntensity={0.2}
        transparent
        opacity={0.6}
        roughness={0.3}
      />
    </mesh>
  );
};

// Frilly arms (shorter, wavy appendages)
const FrillyArm = ({ 
  index, 
  time 
}: { 
  index: number; 
  time: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  const radius = 0.7;
  const baseX = Math.cos(angle) * radius;
  const baseZ = Math.sin(angle) * radius;
  
  const curve = useMemo(() => {
    const points = [];
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      const x = baseX + Math.sin(t * Math.PI * 4 + index * 2) * 0.3 * t;
      const y = -t * 1.2 - 0.3;
      const z = baseZ + Math.cos(t * Math.PI * 4 + index * 2) * 0.3 * t;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [baseX, baseZ, index]);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 15, 0.06, 8, false);
  }, [curve]);

  useFrame(() => {
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      const original = geometry.attributes.position;
      
      for (let i = 0; i < positions.count; i++) {
        const y = original.getY(i);
        const wave = Math.sin(time * 4 + y * 3 + index * 1.5) * 0.15;
        positions.setX(i, original.getX(i) + wave);
        positions.setZ(i, original.getZ(i) + wave * 0.7);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color="#00e5ff"
        emissive="#00b8d4"
        emissiveIntensity={0.3}
        transparent
        opacity={0.5}
        roughness={0.4}
      />
    </mesh>
  );
};

// Glowing particles around jellyfish
const JellyfishParticles = ({ time }: { time: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, sizes } = useMemo(() => {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.5 + Math.random() * 1;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) - 1;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      
      sizes[i] = Math.random() * 3 + 1;
    }
    
    return { positions, sizes };
  }, []);

  useFrame(() => {
    if (pointsRef.current) {
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < posArray.length / 3; i++) {
        posArray[i * 3 + 1] += Math.sin(time * 2 + i) * 0.002;
        posArray[i * 3] += Math.cos(time * 1.5 + i * 0.5) * 0.001;
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00ffff"
        size={0.05}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export const ProceduralJellyfish = ({ 
  mousePosition, 
  position = [3, 0, -3],
  scale = 1 
}: ProceduralJellyfishProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    
    if (groupRef.current) {
      // Smooth mouse follow
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        mousePosition.x * 0.3,
        0.02
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mousePosition.y * 0.2,
        0.02
      );
    }
  });

  const tentacleCount = 8;
  const time = timeRef.current;

  return (
    <Float 
      speed={1.5} 
      rotationIntensity={0.3} 
      floatIntensity={0.8}
      position={position}
    >
      <group ref={groupRef} scale={scale}>
        {/* Main bell */}
        <JellyfishBell time={time} />
        
        {/* Inner glow */}
        <JellyfishCore time={time} />
        
        {/* Tentacles */}
        {Array.from({ length: tentacleCount }).map((_, i) => (
          <Tentacle 
            key={`tentacle-${i}`} 
            index={i} 
            time={time} 
            totalTentacles={tentacleCount} 
          />
        ))}
        
        {/* Frilly arms */}
        {Array.from({ length: 4 }).map((_, i) => (
          <FrillyArm key={`arm-${i}`} index={i} time={time} />
        ))}
        
        {/* Ambient particles */}
        <JellyfishParticles time={time} />
        
        {/* Point light for glow effect */}
        <pointLight
          color="#ff6b9d"
          intensity={2}
          distance={5}
          position={[0, 0, 0]}
        />
        <pointLight
          color="#00ffff"
          intensity={1}
          distance={3}
          position={[0, -0.5, 0]}
        />
      </group>
    </Float>
  );
};
