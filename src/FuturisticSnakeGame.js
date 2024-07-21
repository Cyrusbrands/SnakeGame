import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const INITIAL_FOOD = { x: 15, y: 15 };
const INITIAL_LIVES = 3;

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
  const gameLoopRef = useRef(null);
  const timerRef = useRef(null);
  const gameBoardRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);

  // Audio context and sounds
  const audioContextRef = useRef(null);
  const eatSoundRef = useRef(null);
  const gameOverSoundRef = useRef(null);

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

  const playEatSound = () => {
    const now = audioContextRef.current.currentTime;
    eatSoundRef.current.frequency.setValueAtTime(440, now);
    eatSoundRef.current.frequency.linearRampToValueAtTime(880, now + 0.1);
    const eatGain = eatSoundRef.current.connect(audioContextRef.current.createGain());
    eatGain.gain.setValueAtTime(0.2, now);
    eatGain.gain.linearRampToValueAtTime(0, now + 0.1);
    eatGain.connect(audioContextRef.current.destination);
  };

  const playGameOverSound = () => {
    const now = audioContextRef.current.currentTime;
    gameOverSoundRef.current.frequency.setValueAtTime(100, now);
    gameOverSoundRef.current.frequency.linearRampToValueAtTime(50, now + 0.5);
    const gameOverGain = gameOverSoundRef.current.connect(audioContextRef.current.createGain());
    gameOverGain.gain.setValueAtTime(0.2, now);
    gameOverGain.gain.linearRampToValueAtTime(0, now + 0.5);
    gameOverGain.connect(audioContextRef.current.destination);
  };

  const moveSnake = useCallback(() => {
    if (gameOver) return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      head.x += direction.x;
      head.y += direction.y;

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
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
          if (newScore % 5 === 0) {
            setSpeed(prevSpeed => Math.max(prevSpeed - 10, 50));
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
        playEatSound();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameOver, lives]);

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

  const generateFood = (snake) => {
    const isColliding = (food) => snake.some(segment => segment.x === food.x && segment.y === food.y);
    
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (isColliding(newFood));
    
    return newFood;
  };

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
      <div className="flex justify-between items-center w-full max-w-4xl mb-4 px-2 sm:px-4">
        <NeumorphicBox color="#ffd700">
        <div className="text-sm sm:text-2xl font-bold text-yellow-500">Time: {formatTime(timer)}</div>
        </NeumorphicBox>
        <NeumorphicBox color="#ff69b4" glow>
          <div className="text-2xl sm:text-4xl font-bold text-pink-500">Score: {score}</div>
        </NeumorphicBox>
        <NeumorphicBox color="#00ff00">
          <div className="text-sm sm:text-2xl font-bold text-green-500">Lives: {lives}</div>
        </NeumorphicBox>
      </div>
      <div 
        ref={gameBoardRef}
        className="relative border-4 rounded-lg shadow-lg overflow-hidden transition-colors duration-300"
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
          className="absolute bg-red-500 rounded-full animate-pulse"
          style={{
            left: food.x * cellSize,
            top: food.y * cellSize,
            width: cellSize,
            height: cellSize,
            boxShadow: '0 0 5px #ff0000, 0 0 10px #ff0000',
          }}
        />
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