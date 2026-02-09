import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  PointerLockControls, 
  Box, 
  Plane,
  Text
} from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

// Player component
function Player({ 
  position, 
  rotation, 
  isLocal, 
  name, 
  health, 
  maxHealth,
  isAlive 
}: { 
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  isLocal: boolean;
  name: string;
  health: number;
  maxHealth: number;
  isAlive: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const healthPercent = health / maxHealth;

  useFrame(() => {
    if (meshRef.current && !isLocal) {
      meshRef.current.position.set(position.x, position.y + 1, position.z);
      meshRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  });

  if (!isAlive) return null;

  return (
    <group>
      {/* Player body */}
      <Box
        ref={meshRef}
        position={[position.x, position.y + 1, position.z]}
        rotation={[rotation.x, rotation.y, rotation.z]}
        args={[0.8, 2, 0.8]}
      >
        <meshStandardMaterial 
          color={isLocal ? '#f97316' : '#ef4444'} 
          transparent
          opacity={isLocal ? 0.8 : 1}
        />
      </Box>
      
      {/* Health bar */}
      <group position={[position.x, position.y + 2.5, position.z]}>
        {/* Background */}
        <Box args={[1.2, 0.15, 0.05]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#374151" />
        </Box>
        {/* Health fill */}
        <Box 
          args={[1.2 * healthPercent, 0.15, 0.06]} 
          position={[-0.6 + (0.6 * healthPercent), 0, 0]}
        >
          <meshStandardMaterial 
            color={healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444'} 
          />
        </Box>
      </group>

      {/* Name tag */}
      <Text
        position={[position.x, position.y + 3, position.z]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name} {isLocal && '(You)'}
      </Text>
    </group>
  );
}

// Ground
function Ground() {
  return (
    <Plane 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]} 
      args={[200, 200]}
    >
      <meshStandardMaterial 
        color="#1e293b" 
        roughness={0.8}
        metalness={0.2}
      />
    </Plane>
  );
}

// Walls/Obstacles
function Obstacles() {
  const obstacles = [
    { pos: [0, 2, -50], size: [20, 4, 2] },
    { pos: [-50, 2, 0], size: [2, 4, 20] },
    { pos: [50, 2, 0], size: [2, 4, 20] },
    { pos: [0, 2, 50], size: [20, 4, 2] },
    { pos: [-25, 1, -25], size: [5, 2, 5] },
    { pos: [25, 1, 25], size: [5, 2, 5] },
    { pos: [-25, 1, 25], size: [5, 2, 5] },
    { pos: [25, 1, -25], size: [5, 2, 5] },
  ];

  return (
    <>
      {obstacles.map((obs, i) => (
        <Box 
          key={i}
          position={obs.pos as [number, number, number]}
          args={obs.size as [number, number, number]}
        >
          <meshStandardMaterial color="#475569" />
        </Box>
      ))}
    </>
  );
}

// Crosshair
function Crosshair() {
  return (
    <group position={[0, 0, -1]}>
      {/* Center dot */}
      <mesh>
        <circleGeometry args={[0.005, 32]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {/* Outer ring */}
      <mesh>
        <ringGeometry args={[0.02, 0.022, 32]} />
        <meshBasicMaterial color="white" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// Scene with controls
function Scene() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { player, session, updatePosition, shoot } = useGameStore();
  
  const [localPosition, setLocalPosition] = useState({ x: 0, y: 2, z: 0 });
  const [localRotation, setLocalRotation] = useState({ x: 0, y: 0, z: 0 });
  const velocity = useRef({ x: 0, y: 0, z: 0 });
  const keys = useRef<Set<string>>(new Set());
  const lastShot = useRef(0);

  // Initialize position from player data
  useEffect(() => {
    if (player?.position) {
      setLocalPosition(player.position);
      camera.position.set(player.position.x, player.position.y + 1.6, player.position.z);
    }
  }, [player?.position, camera]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse click to shoot
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement) { // Left click
        const now = Date.now();
        if (now - lastShot.current < 500) return; // Fire rate limit
        lastShot.current = now;

        // Raycast to find target
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        
        // Get all player meshes
        const scene = camera.parent;
        if (scene) {
          const intersects = raycaster.intersectObjects(scene.children, true);
          
          for (const intersect of intersects) {
            // Check if we hit a player (simplified - in real app, use proper object identification)
            const distance = intersect.distance;
            if (distance > 50) break; // Max range

            // Find nearest player
            const otherPlayers = session?.players.filter(p => p.id !== player?.id && p.isAlive) || [];
            let closestPlayer = null;
            let closestDistance = Infinity;

            for (const other of otherPlayers) {
              const dx = other.position.x - localPosition.x;
              const dy = other.position.y - localPosition.y;
              const dz = other.position.z - localPosition.z;
              const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
              
              if (dist < closestDistance && dist < 50) {
                closestDistance = dist;
                closestPlayer = other;
              }
            }

            if (closestPlayer) {
              // Determine hit zone based on aim
              const hitZone = Math.random() > 0.7 ? 'head' : Math.random() > 0.3 ? 'body' : 'leg';
              shoot(closestPlayer.id, hitZone, false);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [camera, localPosition, session, player, shoot]);

  // Movement
  useFrame((_, delta) => {
    if (!document.pointerLockElement) return;

    const speed = 8 * delta;
    const direction = new THREE.Vector3();

    if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) {
      direction.z -= 1;
    }
    if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) {
      direction.z += 1;
    }
    if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) {
      direction.x -= 1;
    }
    if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) {
      direction.x += 1;
    }

    if (direction.length() > 0) {
      direction.normalize();
      direction.applyEuler(camera.rotation);
      direction.y = 0;
      direction.normalize();

      velocity.current.x = direction.x * speed;
      velocity.current.z = direction.z * speed;
    } else {
      velocity.current.x *= 0.8;
      velocity.current.z *= 0.8;
    }

    // Update position
    const newX = localPosition.x + velocity.current.x;
    const newZ = localPosition.z + velocity.current.z;

    // Simple boundary check
    const boundary = 95;
    const clampedX = Math.max(-boundary, Math.min(boundary, newX));
    const clampedZ = Math.max(-boundary, Math.min(boundary, newZ));

    const newPosition = {
      x: clampedX,
      y: localPosition.y,
      z: clampedZ
    };

    setLocalPosition(newPosition);
    setLocalRotation({
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z
    });

    camera.position.x = newPosition.x;
    camera.position.z = newPosition.z;

    // Send position update to server (throttled)
    if (Math.random() < 0.1) { // ~6 updates per second
      updatePosition(newPosition, { x: 0, y: camera.rotation.y, z: 0 });
    }
  });

  return (
    <>
      <PointerLockControls ref={controlsRef} />
      <Crosshair />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.3} color="#f97316" />
      
      {/* Environment */}
      <Ground />
      <Obstacles />
      
      {/* Other players */}
      {session?.players
        .filter(p => p.id !== player?.id && p.isAlive)
        .map(p => (
          <Player
            key={p.id}
            position={p.position}
            rotation={p.rotation}
            isLocal={false}
            name={p.name}
            health={p.health}
            maxHealth={p.maxHealth}
            isAlive={p.isAlive}
          />
        ))}
      
      {/* Local player (visible in third person or for debug) */}
      {player && (
        <Player
          position={localPosition}
          rotation={localRotation}
          isLocal={true}
          name={player.name}
          health={player.health}
          maxHealth={player.maxHealth}
          isAlive={player.isAlive}
        />
      )}
    </>
  );
}

// UI Overlay
function GameUI() {
  const { player, leaderboard, session, setPhase } = useGameStore();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowLeaderboard(true);
      }
      if (e.code === 'Escape') {
        setShowMenu(prev => !prev);
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        setShowLeaderboard(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const healthPercent = player ? (player.health / player.maxHealth) * 100 : 0;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* HUD */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
        {/* Health & Balance */}
        <div className="space-y-2">
          {/* Health Bar */}
          <div className="w-64">
            <div className="flex justify-between text-white text-sm mb-1">
              <span>Health</span>
              <span>{player?.health}/{player?.maxHealth} PV</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div 
                className={`h-full transition-all duration-300 ${
                  healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>
          
          {/* Balance */}
          <div className="flex items-center gap-2 text-yellow-400">
            <span className="text-2xl font-bold">{player?.balance}</span>
            <span className="text-sm">sats</span>
          </div>
        </div>

        {/* Weapon */}
        <div className="text-right text-white">
          <p className="text-lg font-bold">{player?.currentWeapon?.toUpperCase()}</p>
          <p className="text-sm text-slate-400">{player?.weapons.length} weapons</p>
        </div>
      </div>

      {/* Crosshair hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        Click to shoot • WASD to move • ESC for menu
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 text-right text-white">
        <p className="text-green-400">{player?.kills} Kills</p>
        <p className="text-red-400">{player?.deaths} Deaths</p>
        <p className="text-yellow-400">+{player?.satsEarned} sats</p>
      </div>

      {/* Alive players count */}
      <div className="absolute top-4 left-4 text-white">
        <p className="text-lg font-bold">
          {session?.players.filter(p => p.isAlive).length} / {session?.players.length} Alive
        </p>
      </div>

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto">
          <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-6 min-w-[400px]">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded ${
                    entry.id === player?.id ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 w-8">#{index + 1}</span>
                    <span className="text-white font-medium">{entry.name}</span>
                    {!entry.isAlive && <span className="text-red-500 text-xs">(Dead)</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400">{entry.kills}K</span>
                    <span className="text-yellow-400">{entry.satsEarned}sats</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-slate-500 mt-4 text-sm">Release TAB to close</p>
          </div>
        </div>
      )}

      {/* Menu */}
      {showMenu && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto">
          <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Menu</h2>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowMenu(false);
                  document.body.requestPointerLock();
                }}
                className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
              >
                Resume
              </button>
              <button
                onClick={() => setPhase('shop')}
                className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
              >
                Weapon Shop
              </button>
              <button
                onClick={() => setPhase('lobby')}
                className="w-full py-3 px-6 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium"
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Game Canvas
export function GameCanvas() {
  const handleClick = () => {
    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-slate-900"
      onClick={handleClick}
    >
      <Canvas
        camera={{ position: [0, 2, 0], fov: 75 }}
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
      <GameUI />
    </div>
  );
}
