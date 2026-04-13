import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FlowingWavesProps {
  mousePosition: { x: number; y: number };
}

// Single flowing wave line
const WaveLine = ({ 
  yOffset, 
  color, 
  speed, 
  amplitude,
  mousePosition 
}: { 
  yOffset: number; 
  color: string; 
  speed: number; 
  amplitude: number;
  mousePosition: { x: number; y: number };
}) => {
  const timeRef = useRef(0);
  
  const lineObj = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * 20 - 10;
      points.push(new THREE.Vector3(x, 0, 0));
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    
    return new THREE.Line(geometry, material);
  }, [color]);

  useFrame((_, delta) => {
    if (!lineObj) return;
    timeRef.current += delta * speed;
    
    const positions = lineObj.geometry.attributes.position;
    const count = positions.count;
    
    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const normalizedX = (x + 10) / 20;
      
      // Multiple sine waves for organic flow
      const wave1 = Math.sin(x * 0.5 + timeRef.current) * amplitude;
      const wave2 = Math.sin(x * 0.3 + timeRef.current * 0.7) * amplitude * 0.5;
      const wave3 = Math.sin(x * 0.8 + timeRef.current * 1.3) * amplitude * 0.3;
      
      // Mouse influence
      const mouseInfluence = Math.exp(-Math.pow(normalizedX - (mousePosition.x + 1) / 2, 2) * 5);
      const mouseWave = mousePosition.y * 0.5 * mouseInfluence;
      
      const y = yOffset + wave1 + wave2 + wave3 + mouseWave;
      positions.setY(i, y);
    }
    
    positions.needsUpdate = true;
  });

  return <primitive object={lineObj} />;
};

export const FlowingWaves = ({ mousePosition }: FlowingWavesProps) => {
  const waveConfigs = useMemo(() => {
    const configs: Array<{
      yOffset: number;
      color: string;
      speed: number;
      amplitude: number;
    }> = [];
    const waveCount = 15;
    
    for (let i = 0; i < waveCount; i++) {
      const t = i / waveCount;
      configs.push({
        yOffset: (t - 0.5) * 4 + 1.5,
        color: `hsl(${180 + t * 40}, 80%, ${50 + t * 20}%)`,
        speed: 0.8 + Math.random() * 0.4,
        amplitude: 0.3 + Math.random() * 0.2,
      });
    }
    
    return configs;
  }, []);

  return (
    <group position={[-2, 0, -3]}>
      {waveConfigs.map((config, i) => (
        <WaveLine
          key={i}
          yOffset={config.yOffset}
          color={config.color}
          speed={config.speed}
          amplitude={config.amplitude}
          mousePosition={mousePosition}
        />
      ))}
    </group>
  );
};
