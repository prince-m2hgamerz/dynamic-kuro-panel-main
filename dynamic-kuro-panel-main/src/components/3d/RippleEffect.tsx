import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RippleEffectProps {
  mousePosition: { x: number; y: number };
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

const MAX_TRAIL_POINTS = 50;

export const RippleEffect = ({ mousePosition }: RippleEffectProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const trailPoints = useRef<TrailPoint[]>([]);
  const lastMouse = useRef({ x: 0, y: 0 });
  const frameCount = useRef(0);

  // Update trail points
  useEffect(() => {
    const dx = mousePosition.x - lastMouse.current.x;
    const dy = mousePosition.y - lastMouse.current.y;
    const velocity = Math.sqrt(dx * dx + dy * dy);

    // Only add point if cursor moved enough
    if (velocity > 0.005) {
      trailPoints.current.unshift({
        x: mousePosition.x,
        y: mousePosition.y,
        age: 0,
      });

      // Limit trail length
      if (trailPoints.current.length > MAX_TRAIL_POINTS) {
        trailPoints.current.pop();
      }
    }

    lastMouse.current = { ...mousePosition };
  }, [mousePosition]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uTrailPoints: { value: new Array(MAX_TRAIL_POINTS).fill(null).map(() => new THREE.Vector3(0, 0, 0)) },
        uTrailCount: { value: 0 },
        uColor1: { value: new THREE.Color("#9b59b6") },
        uColor2: { value: new THREE.Color("#e91e8c") },
        uColor3: { value: new THREE.Color("#06b6d4") },
        uColor4: { value: new THREE.Color("#00d4ff") },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec3 uTrailPoints[${MAX_TRAIL_POINTS}];
        uniform int uTrailCount;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uColor4;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        #define PI 3.14159265359
        
        float trailWave(vec2 uv, vec2 point, float age, float index) {
          float dist = distance(uv, point);
          
          // Trail gets thinner and fades with age
          float maxAge = 2.0;
          float life = 1.0 - (age / maxAge);
          life = life * life; // Quadratic fade
          
          if (life <= 0.0) return 0.0;
          
          // Wave width based on position in trail (wider at front)
          float trailPos = index / float(${MAX_TRAIL_POINTS});
          float width = 0.03 + (1.0 - trailPos) * 0.05;
          
          // Create smooth trail segment
          float trail = smoothstep(width, 0.0, dist);
          
          // Add ripple effect trailing behind
          float ripple = sin(dist * 25.0 - age * 8.0 + index * 0.3) * 0.5 + 0.5;
          ripple *= smoothstep(0.2, 0.02, dist);
          ripple *= life * 0.4;
          
          return (trail + ripple) * life;
        }
        
        void main() {
          vec2 uv = vUv;
          vec2 mouseUV = uMouse * 0.5 + 0.5;
          
          vec3 finalColor = vec3(0.0);
          float totalAlpha = 0.0;
          
          // Current cursor glow
          float cursorDist = distance(uv, mouseUV);
          float cursorGlow = smoothstep(0.08, 0.0, cursorDist);
          finalColor += cursorGlow * uColor3 * 1.5;
          totalAlpha += cursorGlow * 0.8;
          
          // Trail segments
          for (int i = 0; i < ${MAX_TRAIL_POINTS}; i++) {
            if (i >= uTrailCount) break;
            
            vec2 trailPoint = uTrailPoints[i].xy * 0.5 + 0.5;
            float age = uTrailPoints[i].z;
            float idx = float(i);
            
            float wave = trailWave(uv, trailPoint, age, idx);
            
            if (wave > 0.001) {
              // Color gradient along trail
              float colorT = idx / float(${MAX_TRAIL_POINTS});
              vec3 c1 = mix(uColor3, uColor1, colorT);
              vec3 c2 = mix(uColor4, uColor2, colorT);
              vec3 trailColor = mix(c1, c2, sin(age * 3.0 + idx * 0.2) * 0.5 + 0.5);
              
              finalColor += wave * trailColor;
              totalAlpha += wave * 0.6;
            }
          }
          
          // Subtle ambient shimmer
          float shimmer = fract(sin(dot(uv * 50.0, vec2(12.9898, 78.233)) + uTime * 0.5) * 43758.5453);
          shimmer = smoothstep(0.985, 1.0, shimmer);
          finalColor += shimmer * uColor4 * 0.15;
          
          totalAlpha = clamp(totalAlpha, 0.0, 0.9);
          
          gl_FragColor = vec4(finalColor, totalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame(({ clock }) => {
    frameCount.current++;
    
    if (materialRef.current) {
      const time = clock.getElapsedTime();
      const deltaTime = 0.016; // ~60fps
      
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uMouse.value.set(mousePosition.x, mousePosition.y);
      materialRef.current.uniforms.uTrailCount.value = trailPoints.current.length;
      
      // Update trail point ages and uniforms
      trailPoints.current.forEach((point, i) => {
        point.age += deltaTime;
        
        if (i < MAX_TRAIL_POINTS) {
          materialRef.current!.uniforms.uTrailPoints.value[i].set(
            point.x,
            point.y,
            point.age
          );
        }
      });
      
      // Remove old points
      trailPoints.current = trailPoints.current.filter((p) => p.age < 2.0);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1]}>
      <planeGeometry args={[25, 18, 1, 1]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
};
