/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
/* eslint-disable react/no-unknown-property */
import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

function Model({ url, play, onAnimationComplete }) {
  const gltf = useLoader(GLTFLoader, url);
  const modelRef = useRef();
  const mixerRef = useRef();
  const { camera, scene } = useThree();
  const [animationCompleted, setAnimationCompleted] = useState(false);


  useEffect(() => {
    if (gltf) {
      //center model
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center);

      //adjust camera
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
      camera.position.z = cameraZ * 1.4;

      camera.updateProjectionMatrix();

      //setup animation
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(gltf.scene);
        const action = mixer.clipAction(gltf.animations[0]);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        mixerRef.current = { mixer, action };
      }
    }
  }, [gltf, camera]);

  useEffect(() => {
    if (mixerRef.current && play) {
      mixerRef.current.action.reset().play();
    }
  }, [play]);

  //reset the animationCompleted state when the play prop changes
useEffect(() => {
  setAnimationCompleted(false);
}, [play]);


//handle animation
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.mixer.update(delta);
      if (mixerRef.current.action.paused && !animationCompleted) {
        setAnimationCompleted(true);
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }
    }
  });

  return <primitive object={gltf.scene} ref={modelRef} />;
}



export default function ModelViewer({ url, playAnimation, onAnimationComplete }) {
  return (
    <div style={{ width: '100%', height: '180px' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <Suspense fallback={null}>
          <Model 
            url={url} 
            play={playAnimation} 
            onAnimationComplete={onAnimationComplete} 
          />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
}