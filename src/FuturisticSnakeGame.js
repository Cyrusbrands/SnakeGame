import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const INITIAL_FOOD = { x: 15, y: 15 };
const INITIAL_LIVES = 3;
const POINTS_PER_LEVEL = 10;
const POWERUP_DURATION = 10000; // 10 seconds
const POWERUP_SPAWN_CHANCE = 0.1; // 10% chance to spawn a power-up
const POWERUP_EXIST_DURATION = 15000; // 15 seconds for power-up to exist on board

const FuturisticSnakeGame = () => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState(INITIAL_FOOD);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(150);
  const [boxColor, setBoxColor] = useState(0);
  const [timer, setTimer] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [cellSize, setCellSize] = useState(0);
  const [boardSize, setBoardSize] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [powerUp, setPowerUp] = useState(null);
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState(0);
  const gameLoopRef = useRef(null);
  const timerRef = useRef(null);
  const gameBoardRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const powerUpTimerRef = useRef(null);
  const powerUpExistTimerRef = useRef(null);

  // Audio context and sounds
  const audioContextRef = useRef(null);
  const eatSoundRef = useRef(null);
  const gameOverSoundRef = useRef(null);
  const levelUpSoundRef = useRef(null);
  const powerUpSoundRef = useRef(null);

  // Touch controls
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Initialize audio and set board size
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    // Create eat sound
    eatSoundRef.current = audioContextRef.current.createOscillator();
    eatSoundRef.current.type = 'sine';
    eatSoundRef.current.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
    const eatGain = audioContextRef.current.createGain();
    eatGain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    eatSoundRef.current.connect(eatGain);
    eatGain.connect(audioContextRef.current.destination);
    eatSoundRef.current.start();

    // Create game over sound
    gameOverSoundRef.current = audioContextRef.current.createOscillator();
    gameOverSoundRef.current.type = 'sawtooth';
    gameOverSoundRef.current.frequency.setValueAtTime(100, audioContextRef.current.currentTime);
    const gameOverGain = audioContextRef.current.createGain();
    gameOverGain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    gameOverSoundRef.current.connect(gameOverGain);
    gameOverGain.connect(audioContextRef.current.destination);
    gameOverSoundRef.current.start();

    // Create level up sound
    levelUpSoundRef.current = audioContextRef.current.createOscillator();
    levelUpSoundRef.current.type = 'square';
    levelUpSoundRef.current.frequency.setValueAtTime(660, audioContextRef.current.currentTime);
    const levelUpGain = audioContextRef.current.createGain();
    levelUpGain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    levelUpSoundRef.current.connect(levelUpGain);
    levelUpGain.connect(audioContextRef.current.destination);
    levelUpSoundRef.current.start();

    // Create power-up sound
    powerUpSoundRef.current = audioContextRef.current.createOscillator();
    powerUpSoundRef.current.type = 'triangle';
    powerUpSoundRef.current.frequency.setValueAtTime(880, audioContextRef.current.currentTime);
    const powerUpGain = audioContextRef.current.createGain();
    powerUpGain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    powerUpSoundRef.current.connect(powerUpGain);
    powerUpGain.connect(audioContextRef.current.destination);
    powerUpSoundRef.current.start();

    // Set board size
    const handleResize = () => {
      const minDimension = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.7);
      const newCellSize = Math.floor(minDimension / GRID_SIZE);
      setCellSize(newCellSize);
      setBoardSize(newCellSize * GRID_SIZE);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const playSound = (soundRef) => {
    const now = audioContextRef.current.currentTime;
    const soundGain = soundRef.current.connect(audioContextRef.current.createGain());
    soundGain.gain.setValueAtTime(0.2, now);
    soundGain.gain.linearRampToValueAtTime(0, now + 0.1);
    soundGain.connect(audioContextRef.current.destination);
  };

  const playEatSound = useCallback(() => playSound(eatSoundRef), []);
  const playGameOverSound = useCallback(() => playSound(gameOverSoundRef), []);
  const playLevelUpSound = useCallback(() => playSound(levelUpSoundRef), []);
  const playPowerUpSound = useCallback(() => playSound(powerUpSoundRef), []);

  const moveSnake = useCallback(() => {
    if (gameOver) return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      head.x += direction.x;
      head.y += direction.y;

      if (activePowerUp === 'wallPass') {
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;
      } else if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        if (lives > 1) {
          setLives(prev => prev - 1);
          return [{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }];
        } else {
          setGameOver(true);
          playGameOverSound();
          return prevSnake;
        }
      }

      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        if (lives > 1) {
          setLives(prev => prev - 1);
          return [{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }];
        } else {
          setGameOver(true);
          playGameOverSound();
          return prevSnake;
        }
      }

      newSnake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        setScore(prevScore => {
          const newScore = prevScore + 1;
          setLevelProgress(newScore % POINTS_PER_LEVEL);
          if (newScore % POINTS_PER_LEVEL === 0) {
            setLevel(prevLevel => prevLevel + 1);
            setSpeed(prevSpeed => Math.max(prevSpeed - 10, 50));
            playLevelUpSound();
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
        playEatSound();
      } else if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
        setActivePowerUp('wallPass');
        setPowerUpTimeLeft(POWERUP_DURATION);
        playPowerUpSound();
        if (powerUpTimerRef.current) clearInterval(powerUpTimerRef.current);
        powerUpTimerRef.current = setInterval(() => {
          setPowerUpTimeLeft(prev => {
            if (prev <= 1000) {
              clearInterval(powerUpTimerRef.current);
              setActivePowerUp(null);
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);
        setPowerUp(null);
        if (powerUpExistTimerRef.current) clearTimeout(powerUpExistTimerRef.current);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameOver, lives, activePowerUp, powerUp, playEatSound, playGameOverSound, playLevelUpSound, playPowerUpSound]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gameStarted) {
        setGameStarted(true);
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          setDirection(prev => prev.y === 1 ? prev : { x: 0, y: -1 });
          break;
        case 'ArrowDown':
          setDirection(prev => prev.y === -1 ? prev : { x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          setDirection(prev => prev.x === 1 ? prev : { x: -1, y: 0 });
          break;
        case 'ArrowRight':
          setDirection(prev => prev.x === -1 ? prev : { x: 1, y: 0 });
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameStarted]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const gameLoop = (timestamp) => {
        if (timestamp - lastUpdateTimeRef.current >= speed) {
          moveSnake();
          lastUpdateTimeRef.current = timestamp;
        }
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      };
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    }

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [moveSnake, gameStarted, gameOver, speed]);

  useEffect(() => {
    const colorInterval = setInterval(() => {
      setBoxColor(prev => (prev + 1) % 360);
    }, 50);

    return () => clearInterval(colorInterval);
  }, []);

  const generateFood = useCallback((snake) => {
    const isColliding = (item) => snake.some(segment => segment.x === item.x && segment.y === item.y) || 
                                  (powerUp && powerUp.x === item.x && powerUp.y === item.y);
    
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (isColliding(newFood));
    
    // Chance to spawn a power-up if one doesn't exist
    if (!powerUp && Math.random() < POWERUP_SPAWN_CHANCE) {
      let newPowerUp;
      do {
        newPowerUp = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
      } while (isColliding(newPowerUp) || (newPowerUp.x === newFood.x && newPowerUp.y === newFood.y));
      setPowerUp(newPowerUp);

      // Set timer for power-up to disappear
      if (powerUpExistTimerRef.current) clearTimeout(powerUpExistTimerRef.current);
      powerUpExistTimerRef.current = setTimeout(() => {
        setPowerUp(null);
      }, POWERUP_EXIST_DURATION);
    }

    return newFood;
  }, [powerUp]);

  const resetGame = () => {
    setSnake([{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]);
    setDirection({ x: 1, y: 0 });
    setFood(generateFood([{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]));
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
    setSpeed(150);
    setTimer(0);
    setLives(INITIAL_LIVES);
    setLevel(1);
    setLevelProgress(0);
    setActivePowerUp(null);
    setPowerUpTimeLeft(0);
    setPowerUp(null);
    if (powerUpTimerRef.current) clearInterval(powerUpTimerRef.current);
    if (powerUpExistTimerRef.current) clearTimeout(powerUpExistTimerRef.current);
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const getSegmentColor = (index) => {
    const hue = (index * 10 + boxColor) % 360;
    return `hsl(${hue}, 100%, 50%)`;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const NeumorphicBox = ({ children, color, glow }) => (
    <div className="relative p-2 sm:p-4 rounded-lg" style={{
      backgroundColor: '#2a2a2a',
      boxShadow: `
        8px 8px 15px rgba(0, 0, 0, 0.7),
        -8px -8px 15px rgba(255, 255, 255, 0.1),
        inset 2px 2px 5px rgba(255, 255, 255, 0.1),
        inset -2px -2px 5px rgba(0, 0, 0, 0.7)
      `,
      transform: 'translateY(-4px)',
      transition: 'all 0.2s ease-in-out',
    }}>
      {children}
      <div className="absolute inset-0 rounded-lg" style={{
        background: `radial-gradient(circle at 30% 30%, ${color}55, transparent 70%)`,
        filter: 'blur(5px)',
        opacity: 0.8,
      }}></div>
      {glow && (
        <div className="absolute inset-0 rounded-lg" style={{
          boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
          opacity: 0.4,
        }}></div>
      )}
    </div>
  );

  const ProgressBar = ({ progress, color, label }) => (
    <div className="w-full mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium text-blue-500">{label}</span>
        <span className="text-sm font-medium text-blue-500">{`${Math.round(progress)}%`}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${color} 0%, #ff00ff 100%)`,
            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
          }}
        ></div>
      </div>
    </div>
  );

  // Touch controls
  useEffect(() => {
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY
      });
    };

    const handleTouchMove = (e) => {
      if (!touchStart) return;

      const touch = e.touches[0];
      setTouchEnd({
        x: touch.clientX,
        y: touch.clientY
      });
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;

      const diffX = touchStart.x - touchEnd.x;
      const diffY = touchStart.y - touchEnd.y;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0) {
          setDirection(prev => prev.x === 1 ? prev : { x: -1, y: 0 });
        } else {
          setDirection(prev => prev.x === -1 ? prev : { x: 1, y: 0 });
        }
      } else {
        // Vertical swipe
        if (diffY > 0) {
          setDirection(prev => prev.y === 1 ? prev : { x: 0, y: -1 });
        } else {
          setDirection(prev => prev.y === -1 ? prev : { x: 0, y: 1 });
        }
      }

      setTouchStart(null);
      setTouchEnd(null);

      if (!gameStarted) {
        setGameStarted(true);
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, gameStarted]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 overflow-auto">
      <div className="relative mb-4">
        <div className="text-3xl sm:text-6xl font-bold text-blue-500 animate-pulse">
          Futuristic Snake
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-blue-500 opacity-20 blur-xl"></div>
      </div>
      <div className="flex flex-wrap justify-between items-center w-full max-w-4xl mb-4 px-2 sm:px-4">
        <NeumorphicBox color="#ffd700">
          <div className="text-sm sm:text-2xl font-bold text-yellow-500">Time: {formatTime(timer)}</div>
        </NeumorphicBox>
        <NeumorphicBox color="#ff69b4" glow>
          <div className="text-2xl sm:text-4xl font-bold text-pink-500">Score: {score}</div>
        </NeumorphicBox>
        <NeumorphicBox color="#00ff00">
          <div className="text-sm sm:text-2xl font-bold text-green-500">Lives: {lives}</div>
        </NeumorphicBox>
        <NeumorphicBox color="#1e90ff">
          <div className="text-sm sm:text-2xl font-bold text-blue-500">Level: {level}</div>
        </NeumorphicBox>
      </div>
      <ProgressBar progress={(levelProgress / POINTS_PER_LEVEL) * 100} color="#ff0000" label="Level Progress" />
      {activePowerUp && (
        <ProgressBar 
          progress={(powerUpTimeLeft / POWERUP_DURATION) * 100} 
          color="#00ffff" 
          label={`Power-up: ${activePowerUp === 'wallPass' ? 'Wall Pass' : 'Unknown'}`} 
        />
      )}
      <div 
        ref={gameBoardRef}
        className="relative border-4 rounded-lg shadow-lg overflow-hidden transition-colors duration-300 mt-4"
        style={{
          width: boardSize,
          height: boardSize,
          borderColor: `hsl(${boxColor}, 100%, 50%)`,
          boxShadow: `0 0 10px hsl(${boxColor}, 100%, 50%), 
                      0 0 20px hsl(${boxColor}, 100%, 50%), 
                      0 0 30px hsl(${boxColor}, 100%, 50%), 
                      0 0 40px hsl(${boxColor}, 100%, 50%)`,
        }}
      >
        <div className="absolute inset-0 grid" style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        }}>
          {[...Array(GRID_SIZE * GRID_SIZE)].map((_, index) => (
            <div key={index} className="border-[0.5px] border-blue-900 opacity-20"></div>
          ))}
        </div>
        
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute rounded-sm transition-all duration-100"
            style={{
              left: segment.x * cellSize,
              top: segment.y * cellSize,
              width: cellSize,
              height: cellSize,
              backgroundColor: getSegmentColor(index),
              boxShadow: `0 0 5px ${getSegmentColor(index)}, 0 0 10px ${getSegmentColor(index)}`,
              zIndex: snake.length - index,
            }}
          />
        ))}
        
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            left: food.x * cellSize,
            top: food.y * cellSize,
            width: cellSize,
            height: cellSize,
            backgroundColor: '#ff0000',
            boxShadow: '0 0 5px #ff0000, 0 0 10px #ff0000',
          }}
        />

        {powerUp && (
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              left: powerUp.x * cellSize,
              top: powerUp.y * cellSize,
              width: cellSize,
              height: cellSize,
              backgroundColor: '#00ffff',
              boxShadow: '0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff',
            }}
          />
        )}
      </div>
      {!gameStarted && !gameOver && (
        <div className="mt-4 text-xl sm:text-3xl font-bold text-blue-500 animate-bounce">
          {window.innerWidth > 768 ? 'Press any arrow key to start' : 'Swipe anywhere to start'}
        </div>
      )}
      {gameOver && (
        <div className="mt-4 text-xl sm:text-3xl font-bold text-red-500 animate-ping">Game Over!</div>
      )}
      <button
        className="px-4 py-2 sm:px-6 sm:py-3 mt-4 text-lg sm:text-xl font-bold text-white rounded-lg hover:bg-blue-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
        style={{
          backgroundColor: `hsl(${boxColor}, 100%, 50%)`,
          boxShadow: `0 0 10px hsl(${boxColor}, 100%, 50%), 
                      0 0 20px hsl(${boxColor}, 100%, 50%)`,
        }}
        onClick={resetGame}
      >
        {gameOver ? 'Play Again' : 'Reset Game'}
      </button>
    </div>
  );
};

export default FuturisticSnakeGame;