import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import React from "react";
import { SpiralHelix } from "./SpiralHelix";

interface CrystalBackgroundProps {
  enabled?: boolean;
}

// p5aholic-style particles - #5EE0FF with drift, mouse repulsion, and scroll parallax
const P5Particles = ({ 
  count = 220, 
  mousePosition, 
  scrollOffset 
}: { 
  count: number; 
  mousePosition: { x: number; y: number };
  scrollOffset: number;
}) => {
  const meshRef = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const velocitiesRef = useRef<Float32Array>(new Float32Array(count * 3));
  
  // Update mouse ref for smooth interpolation
  useEffect(() => {
    mouseRef.current = mousePosition;
  }, [mousePosition]);
  
  const { positions, sizes, colors, originalPositions, depths } = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const depths = new Float32Array(count); // Store depth for parallax layers
    
    for (let i = 0; i < count; i++) {
      // Spread across entire viewport
      const x = (Math.random() - 0.5) * 35;
      const y = (Math.random() - 0.5) * 22;
      const z = -Math.random() * 25 - 2;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
      
      // Store depth for parallax (normalized 0-1)
      depths[i] = (-z - 2) / 25;
      
      // Size range 1-4px as per p5aholic spec
      sizes[i] = Math.random() * 3 + 1;
      
      // All particles use #5EE0FF (dot color) with slight variations
      // RGB: 94, 224, 255 -> normalized: 0.37, 0.88, 1.0
      const variation = 0.9 + Math.random() * 0.2;
      colors[i * 3] = 0.37 * variation;
      colors[i * 3 + 1] = 0.88 * variation;
      colors[i * 3 + 2] = 1.0;
    }
    
    return { positions, sizes, colors, originalPositions, depths };
  }, [count]);

  const scrollOffsetRef = useRef(scrollOffset);
  useEffect(() => {
    scrollOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();
    const posArray = meshRef.current.geometry.attributes.position.array as Float32Array;
    const velocities = velocitiesRef.current;
    
    // Convert mouse to world coordinates (approximate)
    const mouseWorldX = mouseRef.current.x * 14;
    const mouseWorldY = mouseRef.current.y * 10;
    
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;
      
      // Current position
      const px = posArray[ix];
      const py = posArray[iy];
      const pz = posArray[iz];
      
      // Distance to mouse
      const dx = px - mouseWorldX;
      const dy = py - mouseWorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Mouse repulsion (0.12s impulse) - stronger force
      const repulsionRadius = 3.5;
      if (dist < repulsionRadius) {
        const force = (1 - dist / repulsionRadius) * 0.1;
        velocities[ix] += (dx / dist) * force;
        velocities[iy] += (dy / dist) * force;
      }
      
      // Slow drift motion (slightly slower for smoother effect)
      velocities[ix] += Math.sin(time * 0.08 + i) * 0.0002;
      velocities[iy] += Math.cos(time * 0.06 + i * 0.5) * 0.00015;
      
      // Scroll parallax - different layers move at different speeds
      const parallaxFactor = 0.18 * depths[i]; // 0.18 base factor
      const targetY = originalPositions[iy] + scrollOffsetRef.current * parallaxFactor;
      
      // Return to original position with parallax offset (soft spring)
      const ox = originalPositions[ix];
      velocities[ix] += (ox - px) * 0.002;
      velocities[iy] += (targetY - py) * 0.003;
      
      // Apply velocity with damping
      posArray[ix] += velocities[ix];
      posArray[iy] += velocities[iy];
      
      velocities[ix] *= 0.95;
      velocities[iy] *= 0.95;
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          varying float vAlpha;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Size attenuation
            gl_PointSize = size * (380.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            
            // Fade based on depth
            vAlpha = smoothstep(-28.0, -2.0, mvPosition.z) * 0.65;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vAlpha;
          
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            // Soft glow falloff
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            alpha *= alpha; // Quadratic falloff for glow
            alpha *= vAlpha;
            
            // Add subtle glow halo (rgba(94,224,255,0.14))
            vec3 glowColor = vColor * 1.2;
            
            gl_FragColor = vec4(glowColor, alpha);
          }
        `}
      />
    </points>
  );
};

const Scene = ({ mousePosition, scrollOffset }: { mousePosition: { x: number; y: number }; scrollOffset: number }) => {
  return (
    <>
      {/* Minimal ambient lighting */}
      <ambientLight intensity={0.08} />
      
      {/* Accent point lights - #40CFFF / #5EE0FF */}
      <pointLight position={[8, 4, 5]} intensity={0.25} color="#40CFFF" />
      <pointLight position={[-6, -3, 5]} intensity={0.15} color="#5EE0FF" />
      <pointLight position={[0, 0, 8]} intensity={0.1} color="#7AFFD4" />
      
      {/* Deep fog for depth */}
      <fog attach="fog" args={["#070709", 12, 45]} />
      
      {/* p5aholic-style particles - 220 count with scroll parallax */}
      <P5Particles count={220} mousePosition={mousePosition} scrollOffset={scrollOffset} />
      
      {/* 3D Spiral Helix - right side */}
      <SpiralHelix 
        mousePosition={mousePosition} 
        position={[5, 0, -6]}
        scale={0.85}
      />
      
      {/* Second smaller helix in background */}
      <SpiralHelix 
        mousePosition={mousePosition} 
        position={[-5, -2, -12]}
        scale={0.35}
      />
      
      <Preload all />
    </>
  );
};

export const CrystalBackground = ({ enabled = true }: CrystalBackgroundProps) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    setMousePosition({ x, y });
  }, []);

  // Scroll parallax handler
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    // Normalize scroll to a reasonable range
    setScrollOffset(scrollY * 0.01);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (enabled) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [enabled, handleMouseMove, handleScroll]);

  if (!enabled) {
    return (
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #070709 0%, #0f1216 50%, #070709 100%)",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      {/* p5aholic background - near-black with subtle surface variation */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 50%, rgba(15, 18, 22, 0.5) 0%, transparent 70%),
            radial-gradient(ellipse 50% 30% at 80% 70%, rgba(94, 224, 255, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse 40% 25% at 20% 30%, rgba(122, 255, 212, 0.02) 0%, transparent 50%),
            linear-gradient(180deg, #070709 0%, #0f1216 50%, #070709 100%)
          `,
        }}
      />
      
      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        dpr={[1, 1.2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ pointerEvents: "none" }}
        frameloop={isVisible ? "always" : "never"}
      >
        <Suspense fallback={null}>
          <Scene mousePosition={mousePosition} scrollOffset={scrollOffset} />
        </Suspense>
      </Canvas>
    </div>
  );
};
