import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Float } from "@react-three/drei";

interface SpiralHelixProps {
  mousePosition: { x: number; y: number };
  position?: [number, number, number];
  scale?: number;
}

// Individual helix strand - p5aholic colors
const HelixStrand = ({ 
  offset, 
  color,
  emissiveColor,
  radius,
  tubeRadius
}: { 
  offset: number;
  color: string;
  emissiveColor: string;
  radius: number;
  tubeRadius: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    const turns = 4;
    const height = 6;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2 * turns + offset;
      const y = t * height - height / 2;
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      points.push(new THREE.Vector3(x, y, z));
    }
    
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, segments, tubeRadius, 12, false);
  }, [offset, radius, tubeRadius]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={0.4}
        metalness={0.9}
        roughness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
};

// Connecting rings between strands - p5aholic accent
const HelixRing = ({ y, radius }: { y: number; radius: number }) => {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 8, 32]} />
      <meshPhysicalMaterial
        color="#40CFFF"
        emissive="#5EE0FF"
        emissiveIntensity={0.6}
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
};

// Glowing core inside helix - #5EE0FF
const HelixCore = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.scale.setScalar(0.8 + Math.sin(t * 2) * 0.1);
    }
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.15, 0.15, 5, 16]} />
      <meshBasicMaterial
        color="#5EE0FF"
        transparent
        opacity={0.25}
      />
    </mesh>
  );
};

// Particles around helix - p5aholic dot color
const HelixParticles = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, sizes } = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const angle = t * Math.PI * 2 * 4 + Math.random() * Math.PI;
      const radius = 0.8 + Math.random() * 0.5;
      const y = t * 6 - 3;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      sizes[i] = Math.random() * 3 + 1;
    }
    
    return { positions, sizes };
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.1;
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
      </bufferGeometry>
      <pointsMaterial
        color="#5EE0FF"
        size={0.03}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export const SpiralHelix = ({ 
  mousePosition, 
  position = [3, 0, -4],
  scale = 1 
}: SpiralHelixProps) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Slow rotation
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.15;
      
      // Mouse influence - subtle
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mousePosition.y * 0.15,
        0.02
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        mousePosition.x * 0.08,
        0.02
      );
    }
  });

  // Ring positions
  const ringPositions = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];

  return (
    <Float 
      speed={0.8} 
      rotationIntensity={0.15} 
      floatIntensity={0.4}
      position={position}
    >
      <group ref={groupRef} scale={scale}>
        {/* Main helix strands - p5aholic color scheme */}
        <HelixStrand 
          offset={0} 
          color="#0f2030"
          emissiveColor="#40CFFF"
          radius={0.5}
          tubeRadius={0.08}
        />
        <HelixStrand 
          offset={Math.PI * 2 / 3} 
          color="#0a1520"
          emissiveColor="#5EE0FF"
          radius={0.5}
          tubeRadius={0.08}
        />
        <HelixStrand 
          offset={Math.PI * 4 / 3} 
          color="#152535"
          emissiveColor="#7AFFD4"
          radius={0.5}
          tubeRadius={0.08}
        />
        
        {/* Connecting rings */}
        {ringPositions.map((y, i) => (
          <HelixRing key={i} y={y} radius={0.55} />
        ))}
        
        {/* Glowing core */}
        <HelixCore />
        
        {/* Floating particles */}
        <HelixParticles />
        
        {/* Point lights for glow effect - p5aholic accent colors */}
        <pointLight
          color="#40CFFF"
          intensity={1.5}
          distance={5}
          position={[0, 0, 0]}
        />
        <pointLight
          color="#7AFFD4"
          intensity={0.8}
          distance={3}
          position={[0, 2, 0]}
        />
      </group>
    </Float>
  );
};
