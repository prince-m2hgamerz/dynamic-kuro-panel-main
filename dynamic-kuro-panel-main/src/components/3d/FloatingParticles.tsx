import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FloatingParticlesProps {
  count?: number;
  mousePosition: { x: number; y: number };
}

export const FloatingParticles = ({ count = 500, mousePosition }: FloatingParticlesProps) => {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const types = new Float32Array(count); // 0: normal, 1: sparkle, 2: large

    const colorPalette = [
      new THREE.Color("#06b6d4"), // Cyan
      new THREE.Color("#9b59b6"), // Purple
      new THREE.Color("#e91e8c"), // Pink
      new THREE.Color("#00d4ff"), // Electric blue
      new THREE.Color("#ffffff"), // White
      new THREE.Color("#8b5cf6"), // Violet
      new THREE.Color("#ff00ff"), // Magenta
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Position in a sphere around camera with bias towards edges
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radiusBase = 3 + Math.random() * 10;
      
      // Push more particles towards edges
      const edgeBias = Math.pow(Math.random(), 0.5);
      const radius = radiusBase * (0.5 + edgeBias * 0.5);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi) - 5;
      
      // Random color from palette with weighted distribution
      const colorIndex = Math.floor(Math.pow(Math.random(), 0.7) * colorPalette.length);
      const color = colorPalette[colorIndex];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // Varied sizes
      const type = Math.random();
      if (type > 0.95) {
        types[i] = 2; // Large particle
        sizes[i] = 4 + Math.random() * 3;
      } else if (type > 0.8) {
        types[i] = 1; // Sparkle particle
        sizes[i] = 2 + Math.random() * 2;
      } else {
        types[i] = 0; // Normal particle
        sizes[i] = 1 + Math.random() * 2;
      }
      
      speeds[i] = Math.random() * 0.5 + 0.1;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, colors, sizes, speeds, phases, types };
  }, [count]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aSpeed;
        attribute float aPhase;
        attribute float aType;
        
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uPixelRatio;
        
        varying vec3 vColor;
        varying float vAlpha;
        varying float vType;
        
        void main() {
          vColor = color;
          vType = aType;
          
          vec3 pos = position;
          
          // Floating animation with varied movement
          float floatOffset = sin(uTime * aSpeed + aPhase) * 0.4;
          float sideOffset = cos(uTime * aSpeed * 0.7 + aPhase) * 0.2;
          pos.y += floatOffset;
          pos.x += sideOffset;
          
          // Subtle spiral rotation
          float angle = uTime * 0.05 + aPhase;
          float cosA = cos(angle);
          float sinA = sin(angle);
          pos.xz = mat2(cosA, -sinA, sinA, cosA) * pos.xz;
          
          // Mouse interaction - attraction/repulsion
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vec2 screenPos = mvPosition.xy / -mvPosition.z;
          float dist = distance(screenPos, uMouse * 2.0);
          
          // Particles move towards mouse slightly
          float attraction = smoothstep(1.0, 0.0, dist) * 0.3;
          vec2 toMouse = normalize(uMouse - screenPos * 0.5);
          pos.xy += toMouse * attraction;
          
          vec4 finalPosition = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_Position = finalPosition;
          
          // Size with pulsing for sparkle particles
          float sizePulse = 1.0;
          if (aType > 0.5) {
            sizePulse = 0.7 + sin(uTime * 5.0 + aPhase) * 0.3;
          }
          gl_PointSize = aSize * sizePulse * uPixelRatio * (250.0 / -mvPosition.z);
          
          // Fade based on distance and type
          vAlpha = smoothstep(18.0, 4.0, length(pos));
          if (aType > 1.5) vAlpha *= 1.3; // Large particles more visible
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vType;
        
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          
          float alpha;
          vec3 finalColor = vColor;
          
          if (vType > 1.5) {
            // Large particles - soft glow
            alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.6;
            finalColor *= 1.2;
          } else if (vType > 0.5) {
            // Sparkle particles - sharp star shape
            float star = 1.0 - smoothstep(0.0, 0.15, dist);
            float rays = abs(sin(atan(gl_PointCoord.y - 0.5, gl_PointCoord.x - 0.5) * 4.0));
            star += rays * (1.0 - dist * 2.0) * 0.5;
            alpha = star * vAlpha;
            finalColor = mix(finalColor, vec3(1.0), 0.5);
          } else {
            // Normal particles - soft circle
            alpha = smoothstep(0.5, 0.1, dist) * vAlpha * 0.7;
          }
          
          // Add glow
          vec3 glow = finalColor * (1.0 - dist * 1.5);
          
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uMouse.value.set(mousePosition.x, mousePosition.y);
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={particles.sizes.length}
          array={particles.sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          count={particles.speeds.length}
          array={particles.speeds}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={particles.phases.length}
          array={particles.phases}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aType"
          count={particles.types.length}
          array={particles.types}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </points>
  );
};
