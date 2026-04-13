import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface GlowingOrbProps {
  position?: [number, number, number];
  mousePosition: { x: number; y: number };
}

// Energy tendrils around the orb
const EnergyTendril = ({ index, total }: { index: number; total: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const angle = (index / total) * Math.PI * 2;
  
  const { geometry, material } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0.1),
      new THREE.Vector3(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0.05),
      new THREE.Vector3(Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, 0),
    ]);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
    
    const colors = ["#06b6d4", "#9b59b6", "#e91e8c"];
    const mat = new THREE.LineBasicMaterial({
      color: colors[index % colors.length],
      transparent: true,
      opacity: 0.6,
    });
    
    return { geometry: geo, material: mat };
  }, [angle, index]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      groupRef.current.rotation.z = time * 0.3 + angle;
      const scale = 0.8 + Math.sin(time * 2 + index) * 0.2;
      groupRef.current.scale.setScalar(scale);
      material.opacity = 0.4 + Math.sin(time * 3 + index) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={new THREE.Line(geometry, material)} />
    </group>
  );
};

export const GlowingOrb = ({ position = [0, 0, -5], mousePosition }: GlowingOrbProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  const innerMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uColor1: { value: new THREE.Color("#06b6d4") },
        uColor2: { value: new THREE.Color("#9b59b6") },
        uColor3: { value: new THREE.Color("#e91e8c") },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float uTime;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          
          // Subtle vertex displacement
          vec3 pos = position;
          float displacement = sin(pos.x * 5.0 + uTime) * sin(pos.y * 5.0 + uTime) * 0.02;
          pos += normal * displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Animated gradient
          float t = sin(uTime * 0.5 + vPosition.y * 3.0) * 0.5 + 0.5;
          float t2 = sin(uTime * 0.3 + vPosition.x * 3.0 + vPosition.z * 2.0) * 0.5 + 0.5;
          float t3 = cos(uTime * 0.4 + length(vPosition.xy) * 4.0) * 0.5 + 0.5;
          
          vec3 color = mix(uColor1, uColor2, t);
          color = mix(color, uColor3, t2 * 0.6);
          
          // Fresnel glow
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
          color += fresnel * uColor1 * 0.8;
          
          // Swirling pattern
          float swirl = sin(atan(vPosition.y, vPosition.x) * 3.0 + uTime * 2.0 + length(vPosition.xy) * 5.0);
          swirl = smoothstep(-0.5, 0.5, swirl);
          color = mix(color, uColor3, swirl * 0.3);
          
          // Pulsing intensity
          float pulse = sin(uTime * 2.0) * 0.15 + 0.85;
          color *= pulse;
          
          // Inner glow hotspot
          float hotspot = 1.0 - length(vPosition.xy) * 1.5;
          hotspot = max(0.0, hotspot);
          color += hotspot * vec3(1.0) * 0.3;
          
          gl_FragColor = vec4(color, 0.95);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
    });
  }, []);

  const outerGlowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#06b6d4") },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 4.0);
          float pulse = sin(uTime * 1.5) * 0.25 + 0.75;
          
          // Animated color shift
          vec3 color1 = uColor;
          vec3 color2 = vec3(0.61, 0.35, 0.71); // Purple
          vec3 color = mix(color1, color2, sin(uTime * 0.5 + vPosition.y * 2.0) * 0.5 + 0.5);
          
          color = color * fresnel * pulse * 2.5;
          float alpha = fresnel * pulse * 0.7;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const ringMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color("#e91e8c") },
        uColor2: { value: new THREE.Color("#9b59b6") },
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
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          float angle = atan(vPosition.y, vPosition.x);
          float t = (angle + 3.14159) / (2.0 * 3.14159);
          t = fract(t + uTime * 0.3);
          
          vec3 color = mix(uColor1, uColor2, t);
          
          // Energy pulse along ring
          float energyPulse = sin(t * 12.56637 + uTime * 5.0);
          energyPulse = smoothstep(0.0, 1.0, energyPulse);
          color += energyPulse * vec3(1.0) * 0.3;
          
          float alpha = 0.5 + energyPulse * 0.3;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    if (innerMaterial) {
      innerMaterial.uniforms.uTime.value = time;
      innerMaterial.uniforms.uMouse.value.set(mousePosition.x, mousePosition.y);
    }
    if (outerGlowMaterial) {
      outerGlowMaterial.uniforms.uTime.value = time;
    }
    if (ringMaterial) {
      ringMaterial.uniforms.uTime.value = time;
    }

    if (groupRef.current) {
      // Subtle floating
      groupRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.15;
      groupRef.current.position.x = position[0] + Math.cos(time * 0.3) * 0.05;
      
      // React to mouse with smooth lerp
      const targetRotX = mousePosition.y * 0.15;
      const targetRotY = mousePosition.x * 0.15;
      groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.05;
      groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.05;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.4;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -time * 0.3;
      ring2Ref.current.rotation.x = time * 0.2;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = time * 0.25;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Inner glowing sphere */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.5, 64, 64]} />
        <primitive object={innerMaterial} attach="material" />
      </mesh>

      {/* Outer glow */}
      <mesh ref={outerRef} scale={1.4}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <primitive object={outerGlowMaterial} attach="material" />
      </mesh>

      {/* Second outer glow layer */}
      <mesh scale={1.8}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>

      {/* Rotating ring 1 */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.025, 16, 64]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>

      {/* Rotating ring 2 */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[0.95, 0.018, 16, 64]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} />
      </mesh>

      {/* Rotating ring 3 */}
      <mesh ref={ring3Ref} rotation={[Math.PI / 2.5, Math.PI / 6, 0]}>
        <torusGeometry args={[1.05, 0.012, 16, 64]} />
        <meshBasicMaterial color="#9b59b6" transparent opacity={0.3} />
      </mesh>

      {/* Energy tendrils */}
      {[...Array(6)].map((_, i) => (
        <EnergyTendril key={i} index={i} total={6} />
      ))}

      {/* Point light for local illumination */}
      <pointLight color="#06b6d4" intensity={2.5} distance={6} />
      <pointLight color="#9b59b6" intensity={1} distance={4} position={[0.5, 0.5, 0]} />
    </group>
  );
};
