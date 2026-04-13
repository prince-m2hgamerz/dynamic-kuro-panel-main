import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface LightningBoltProps {
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  color?: string;
  thickness?: number;
}

// Enhanced bolt with branches
const SingleBolt = ({ startPoint, endPoint, color = "#00d4ff", thickness = 2 }: LightningBoltProps) => {
  const [visible, setVisible] = useState(true);
  const [intensity, setIntensity] = useState(1);
  const [key, setKey] = useState(0);

  // Generate jagged lightning path with branches
  const { mainPath, branches } = useMemo(() => {
    const start = new THREE.Vector3(...startPoint);
    const end = new THREE.Vector3(...endPoint);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const segments = Math.floor(length * 6) + 4;
    
    const mainPoints: [number, number, number][] = [[start.x, start.y, start.z]];
    const branchPaths: [number, number, number][][] = [];
    
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const point = start.clone().lerp(end, t);
      
      // Add random offset perpendicular to direction
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.15
      );
      
      // Reduce offset near endpoints
      const edgeFactor = Math.sin(t * Math.PI);
      point.add(offset.multiplyScalar(edgeFactor));
      
      mainPoints.push([point.x, point.y, point.z]);
      
      // Random branches
      if (Math.random() > 0.7 && i > 1 && i < segments - 1) {
        const branchLength = 0.3 + Math.random() * 0.5;
        const branchDir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          -Math.random() * 1.5,
          (Math.random() - 0.5)
        ).normalize();
        
        const branchEnd = point.clone().add(branchDir.multiplyScalar(branchLength));
        const branchMid = point.clone().lerp(branchEnd, 0.5).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            0
          )
        );
        
        branchPaths.push([
          [point.x, point.y, point.z],
          [branchMid.x, branchMid.y, branchMid.z],
          [branchEnd.x, branchEnd.y, branchEnd.z],
        ]);
      }
    }
    
    mainPoints.push([end.x, end.y, end.z]);
    return { mainPath: mainPoints, branches: branchPaths };
  }, [startPoint, endPoint, key]);

  // Flicker effect
  useEffect(() => {
    const flicker = () => {
      if (Math.random() > 0.6) {
        setVisible(false);
        setTimeout(() => {
          setVisible(true);
          setKey((k) => k + 1);
        }, 30 + Math.random() * 80);
      }
      setIntensity(0.6 + Math.random() * 0.4);
    };

    const interval = setInterval(flicker, 80 + Math.random() * 150);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <group>
      {/* Main bolt - core */}
      <Line
        points={mainPath}
        color={color}
        lineWidth={thickness}
        transparent
        opacity={intensity}
      />
      
      {/* Inner glow */}
      <Line
        points={mainPath}
        color="#ffffff"
        lineWidth={thickness * 0.5}
        transparent
        opacity={intensity * 0.8}
      />
      
      {/* Outer glow */}
      <Line
        points={mainPath}
        color={color}
        lineWidth={thickness * 3}
        transparent
        opacity={intensity * 0.2}
      />
      
      {/* Branches */}
      {branches.map((branch, idx) => (
        <group key={idx}>
          <Line
            points={branch}
            color={color}
            lineWidth={thickness * 0.6}
            transparent
            opacity={intensity * 0.7}
          />
          <Line
            points={branch}
            color={color}
            lineWidth={thickness * 2}
            transparent
            opacity={intensity * 0.15}
          />
        </group>
      ))}
    </group>
  );
};

// Electric orb at lightning origin
const ElectricOrb = ({ position, color = "#00d4ff" }: { position: [number, number, number]; color?: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 0.1 + Math.sin(clock.getElapsedTime() * 8) * 0.05;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
};

interface LightningSystemProps {
  count?: number;
}

export const LightningSystem = ({ count = 4 }: LightningSystemProps) => {
  const [bolts, setBolts] = useState<Array<{ 
    id: number; 
    start: [number, number, number]; 
    end: [number, number, number];
    color: string;
  }>>([]);

  const colors = ["#00d4ff", "#9b59b6", "#e91e8c", "#06b6d4"];

  const generateBolt = () => {
    const side = Math.random() > 0.5;
    const startX = side ? -6 + Math.random() * 2 : 4 + Math.random() * 2;
    const startY = 2.5 + Math.random() * 2;
    const endX = startX + (side ? 1 : -1) * (Math.random() * 2.5 + 1);
    const endY = startY - (Math.random() * 3.5 + 2);

    return {
      id: Date.now() + Math.random(),
      start: [startX, startY, -4 - Math.random() * 3] as [number, number, number],
      end: [endX, endY, -4 - Math.random() * 3] as [number, number, number],
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  };

  useEffect(() => {
    // Initial bolts
    const initialBolts = Array.from({ length: count }, () => generateBolt());
    setBolts(initialBolts);

    // Regenerate bolts periodically
    const interval = setInterval(() => {
      setBolts((prev) => {
        const newBolts = [...prev];
        const indexToReplace = Math.floor(Math.random() * newBolts.length);
        newBolts[indexToReplace] = generateBolt();
        return newBolts;
      });
    }, 600 + Math.random() * 400);

    return () => clearInterval(interval);
  }, [count]);

  return (
    <group>
      {bolts.map((bolt) => (
        <group key={bolt.id}>
          <SingleBolt
            startPoint={bolt.start}
            endPoint={bolt.end}
            color={bolt.color}
            thickness={2}
          />
          <ElectricOrb position={bolt.start} color={bolt.color} />
        </group>
      ))}
    </group>
  );
};
