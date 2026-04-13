import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Animated lamp/character that bounces and looks around
const AnimatedLamp = () => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    
    if (groupRef.current) {
      // Bouncing motion like Pixar lamp
      groupRef.current.position.y = Math.abs(Math.sin(time * 2)) * 0.3;
      
      // Slight rotation
      groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.2;
    }
    
    if (headRef.current) {
      // Head looking around
      headRef.current.rotation.x = Math.sin(time * 1.5) * 0.3 - 0.2;
      headRef.current.rotation.z = Math.sin(time * 0.8) * 0.15;
    }
    
    if (bodyRef.current) {
      // Body squash and stretch
      const squash = 1 + Math.sin(time * 4) * 0.05;
      bodyRef.current.scale.set(1 / squash, squash, 1 / squash);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Body/Stand */}
      <group ref={bodyRef}>
        {/* Base */}
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.5, 0.6, 0.15, 32]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Lower arm */}
        <mesh position={[0, -0.6, 0]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 1, 16]} />
          <meshStandardMaterial color="#2d2d44" metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* Joint */}
        <mesh position={[0, -0.1, 0.1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#ff1b8d" metalness={0.5} roughness={0.3} emissive="#ff1b8d" emissiveIntensity={0.3} />
        </mesh>
        
        {/* Upper arm */}
        <mesh position={[0, 0.4, 0.15]} rotation={[-0.3, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.8, 16]} />
          <meshStandardMaterial color="#2d2d44" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
      
      {/* Head/Lamp */}
      <group ref={headRef} position={[0, 0.8, 0.2]}>
        {/* Lamp shade */}
        <mesh rotation={[0.5, 0, 0]}>
          <coneGeometry args={[0.4, 0.5, 32, 1, true]} />
          <meshStandardMaterial 
            color="#ff1b8d" 
            metalness={0.7} 
            roughness={0.2}
            emissive="#ff1b8d"
            emissiveIntensity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Light bulb glow */}
        <mesh position={[0, -0.1, 0]} rotation={[0.5, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial 
            color="#ffffff" 
            emissive="#ffcc00"
            emissiveIntensity={2}
            transparent
            opacity={0.9}
          />
        </mesh>
        
        {/* Light cone effect */}
        <mesh position={[0, -0.8, 0.3]} rotation={[0.8, 0, 0]}>
          <coneGeometry args={[0.8, 1.5, 32, 1, true]} />
          <meshBasicMaterial 
            color="#ffcc00"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
};

// Floating neon particles around the lamp
const NeonParticles = () => {
  const particlesRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = clock.elapsedTime * 0.2;
    }
  });

  const particles = Array.from({ length: 20 }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 4,
    ] as [number, number, number],
    color: i % 3 === 0 ? "#ff1b8d" : i % 3 === 1 ? "#00f0ff" : "#ff6b2b",
    scale: Math.random() * 0.05 + 0.02,
  }));

  return (
    <group ref={particlesRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position}>
          <sphereGeometry args={[p.scale, 8, 8]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// Scene with lamp and effects
const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} color="#ff1b8d" intensity={1} />
      <pointLight position={[-5, 3, -5]} color="#00f0ff" intensity={0.5} />
      <spotLight
        position={[0, 5, 0]}
        angle={0.5}
        penumbra={1}
        intensity={0.5}
        color="#ffcc00"
      />
      <AnimatedLamp />
      <NeonParticles />
    </>
  );
};

export const AnimatedCharacter = () => {
  return (
    <div className="absolute bottom-10 right-10 w-64 h-64 md:w-80 md:h-80 pointer-events-none z-10">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
