import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

const BEE_MODEL_URL =
  "https://raw.githubusercontent.com/DennysDionigi/bee-glb/94253437c023643dd868592e11a0fd2c228cfe07/demon_bee_full_texture.glb";

const Bee = () => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(BEE_MODEL_URL);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Play the first animation clip (wing flap)
    const firstAction = Object.values(actions)[0];
    if (firstAction) {
      firstAction.play();
    }
  }, [actions]);

  // Subtle breathing while sitting on the flower (bottom-right)
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.position.y = -0.85 + Math.sin(t * 0.8) * 0.015;
    group.current.position.x = 0.55 + Math.sin(t * 0.5) * 0.01;
    group.current.rotation.y = 1.5 + Math.sin(t * 0.3) * 0.06;
    group.current.rotation.z = Math.sin(t * 0.6) * 0.015;
    group.current.rotation.x = 0.1 + Math.sin(t * 0.4) * 0.015;
  });

  return (
    <group ref={group} position={[0.55, -0.85, 0]} scale={0.28}>
      <primitive object={scene} />
    </group>
  );
};

const BeeCanvas = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 13], fov: 10 }}
      gl={{ antialias: true, alpha: true }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[500, 500, 500]} intensity={1} />
      <Suspense fallback={null}>
        <Bee />
      </Suspense>
    </Canvas>
  );
};

// Preload the model
useGLTF.preload(BEE_MODEL_URL);

export default BeeCanvas;
