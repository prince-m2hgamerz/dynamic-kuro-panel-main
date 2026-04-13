import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CrystalProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color: string;
  emissiveIntensity?: number;
  type?: "spike" | "cluster" | "gem";
}

// Enhanced crystal with custom shader
const Crystal = ({ 
  position, 
  rotation = [0, 0, 0], 
  scale = 1, 
  color, 
  emissiveIntensity = 0.5,
  type = "spike" 
}: CrystalProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialRotation = useRef(rotation);
  const speed = useRef(Math.random() * 0.3 + 0.1);
  const phase = useRef(Math.random() * Math.PI * 2);

  // Custom shader material for crystals
  const crystalMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uEmissiveIntensity: { value: emissiveIntensity },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uEmissiveIntensity;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          // Fresnel effect for edge glow
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
          
          // Pulsing glow
          float pulse = sin(uTime * 2.0) * 0.2 + 0.8;
          
          // Color gradient based on height
          vec3 baseColor = uColor;
          vec3 tipColor = uColor * 1.5 + vec3(0.2);
          vec3 gradientColor = mix(baseColor, tipColor, vPosition.y * 0.5 + 0.5);
          
          // Inner glow
          float innerGlow = smoothstep(0.0, 1.0, vPosition.y * 0.5 + 0.5);
          
          // Combine effects
          vec3 finalColor = gradientColor;
          finalColor += fresnel * uColor * uEmissiveIntensity * pulse;
          finalColor += innerGlow * uColor * 0.3;
          
          // Sparkle effect
          float sparkle = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
          sparkle = smoothstep(0.97, 1.0, sparkle);
          finalColor += sparkle * vec3(1.0) * 0.5;
          
          float alpha = 0.7 + fresnel * 0.3;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [color, emissiveIntensity]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();
      
      // Slow rotation
      meshRef.current.rotation.y = initialRotation.current[1] + time * speed.current * 0.2;
      meshRef.current.rotation.x = initialRotation.current[0] + Math.sin(time * 0.5 + phase.current) * 0.1;
      
      // Subtle floating
      meshRef.current.position.y = position[1] + Math.sin(time * 0.3 + phase.current) * 0.15;
    }

    if (crystalMaterial) {
      crystalMaterial.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  // Different crystal geometries
  const crystalGeometry = useMemo(() => {
    if (type === "gem") {
      // Octahedron-like gem
      const geo = new THREE.OctahedronGeometry(0.3, 0);
      return geo;
    } else if (type === "cluster") {
      // Multiple merged crystals
      const group = new THREE.CylinderGeometry(0.12, 0.05, 0.4, 6, 1);
      return group;
    } else {
      // Spike crystal (default)
      const geometry = new THREE.ConeGeometry(0.15, 0.8, 6, 1);
      return geometry;
    }
  }, [type]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      geometry={crystalGeometry}
    >
      <primitive object={crystalMaterial} attach="material" />
    </mesh>
  );
};

// Floating inner crystal cluster
const InnerCluster = ({ position }: { position: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Crystal
          key={i}
          position={[
            Math.cos((i / 5) * Math.PI * 2) * 0.3,
            0,
            Math.sin((i / 5) * Math.PI * 2) * 0.3,
          ]}
          rotation={[Math.PI / 6, (i / 5) * Math.PI * 2, 0]}
          scale={0.5}
          color={["#9b59b6", "#e91e8c", "#06b6d4", "#4a0080", "#00d4ff"][i]}
          type="spike"
        />
      ))}
    </group>
  );
};

interface CrystalClusterProps {
  position?: [number, number, number];
  count?: number;
}

export const CrystalCluster = ({ position = [0, 0, 0], count = 30 }: CrystalClusterProps) => {
  const crystals = useMemo(() => {
    const colors = ["#9b59b6", "#e91e8c", "#06b6d4", "#4a0080", "#00d4ff", "#ff00ff", "#8b5cf6"];
    const types: Array<"spike" | "cluster" | "gem"> = ["spike", "cluster", "gem"];
    const result = [];

    for (let i = 0; i < count; i++) {
      // Distribute around the edges of the viewport
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      
      switch (side) {
        case 0: // Left
          x = -5 - Math.random() * 3;
          y = (Math.random() - 0.5) * 8;
          break;
        case 1: // Right
          x = 5 + Math.random() * 3;
          y = (Math.random() - 0.5) * 8;
          break;
        case 2: // Top
          x = (Math.random() - 0.5) * 12;
          y = 3.5 + Math.random() * 2;
          break;
        default: // Bottom
          x = (Math.random() - 0.5) * 12;
          y = -3.5 - Math.random() * 2;
          break;
      }

      const z = -3 - Math.random() * 6;

      result.push({
        id: i,
        position: [x + position[0], y + position[1], z + position[2]] as [number, number, number],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ] as [number, number, number],
        scale: 0.4 + Math.random() * 1.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        emissiveIntensity: 0.4 + Math.random() * 0.6,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    return result;
  }, [count, position]);

  return (
    <group>
      {crystals.map((crystal) => (
        <Crystal key={crystal.id} {...crystal} />
      ))}
      
      {/* Add some floating inner clusters for depth */}
      <InnerCluster position={[-4, 2, -6]} />
      <InnerCluster position={[4, -2, -7]} />
      <InnerCluster position={[0, 3, -8]} />
    </group>
  );
};
