/* eslint-disable no-unused-vars */

import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

//components
import ModelViewer from './ModelViewer.jsx'

//images
import rangeOnImage from './assets/rangeOn.png';
import rangeOffImage from './assets/rangeOff.png';
import mageOnImage from './assets/mageOn.png';
import mageOffImage from './assets/mageOff.png';
import meleeOnImage from './assets/meleeOn.png';
import meleeOffImage from './assets/meleeOff.png';
import blobImage from './assets/blobSmol.png';
import snakeImage from './assets/melee.png';
import dudeImage from './assets/ranger.png';


const TICK_DURATION = 600;


const PrayerFlickGames = () => {
  //state:
    //game logic
  const [displayTick, setDisplayTick] = useState(1);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [drain, setDrain] = useState(0);
  const [gameMode, setGameMode] = useState('single');
  const [lag, setLag] = useState(0);
    //settings
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showErrorLog, setShowErrorLog] = useState(true);
    const [lastError, setLastError] = useState('');
    const [lastErrorTime, setLastErrorTime] = useState(null);
    //3d
  const [use3DModel, setUse3DModel] = useState(true);
  const [playAttackAnimation, setPlayAttackAnimation] = useState(false)


  //refs:
  const gameStartTime = useRef(Date.now());
  const prayerState = useRef({
    isOn: false,
    lastToggle: 0,
    currentPrayer: null,
    lastActionTick: 0,
    lastActionTimeInTick: 0
  });
  const ticksOn = useRef(0);
  const lastProcessedTick = useRef(0);
  const audioContext = useRef(null);
  const tutorialText = {
    single: "Ranger will attack tick 4.",
    alternate: "Alternate every tick.",
    '1t': "Pray on-> Doubleclick every tick.",
  };

  //helper functions:
    //to show tick in 1-4 format
  const getCycleTick = (tick) => ((tick - 1) % 4) + 1;

    //to reset game
  const resetGame = () => {
    setScore(0);
    setHits(0);
    setDrain(0);
    gameStartTime.current = Date.now();
    prayerState.current = { isOn: false, lastToggle: 0, currentPrayer: null };
    ticksOn.current = 0;
    lastProcessedTick.current = 0;
    setShowTutorial(true);
  };


    //to render prayer buttons
  const renderPrayerButton = (prayerType) => {
    let onImage, offImage;
    switch (prayerType) {
      case 'range':
        onImage = rangeOnImage;
        offImage = rangeOffImage;
        break;
      case 'mage':
        onImage = mageOnImage;
        offImage = mageOffImage;
        break;
      default: // 'single' or '1t'
        onImage = meleeOnImage;
        offImage = meleeOffImage;
    }

    const isOn = prayerState.current.isOn && 
      (gameMode === 'alternate' ? prayerState.current.currentPrayer === prayerType : true);

    return (
      <button 
        onClick={() => handleClick(prayerType)}
        className="prayer-button"
      >
        <img 
          src={isOn ? onImage : offImage} 
          alt={`${prayerType} prayer ${isOn ? 'on' : 'off'}`}
        />
      </button>
    );
  };
 //handlers
    //tick system & game mechanics handler
    const processTick = useCallback((tick) => {
      let scored = false;
      let hit = false;
      let errorReason = '';
      const cycleTick = getCycleTick(tick);
      const lastActionCycleTick = getCycleTick(prayerState.current.lastActionTick);
      const tickStartTime = gameStartTime.current + (tick - 1) * TICK_DURATION;
     
      const prayerOnAtTickStart = prayerState.current.isOn && 
        (prayerState.current.lastToggle <= tickStartTime);
    
        if (gameMode === 'single') {
          if (cycleTick === 4) {
            setPlayAttackAnimation(true);
            if (prayerOnAtTickStart) {
              scored = true;
            } else {
              hit = true;
              errorReason = `Tanked tick ${cycleTick} (last toggle: tick ${lastActionCycleTick} @ ${prayerState.current.lastActionTimeInTick}ms)`;
            }
          }
        } else if (gameMode === 'alternate') {
          const expectedPrayer = prayerState.current.lastPrayer === 'range' ? 'mage' : 'range';
          if (prayerState.current.currentPrayer !== prayerState.current.lastPrayer && prayerOnAtTickStart) {
            scored = true;
          } else {
            hit = true;
            errorReason = `Didn't alternate (expected: ${expectedPrayer}, prayed: ${prayerState.current.currentPrayer || 'none'}) during tick ${lastActionCycleTick} @ ${prayerState.current.lastActionTimeInTick}ms`;
          }
        } else if (gameMode === '1t') {
          if (prayerOnAtTickStart) {
            scored = true;
          } else {
            hit = true;
            errorReason = `Tanked tick ${cycleTick} (last toggle: tick ${lastActionCycleTick} @ ${prayerState.current.lastActionTimeInTick}ms)`;
          }
        }
      
    
      if (prayerOnAtTickStart) {
        ticksOn.current++;
        if (ticksOn.current >= 2 && ticksOn.current % 2 === 0) {
          setDrain(prev => prev + 1);
        }
      } else {
        ticksOn.current = 0;
      }
    
      if (scored) setScore(prev => prev + 1);
  
      if (hit && prayerState.current.lastActionTick && 
        !errorReason.includes('NaN') && !errorReason.includes('undefined')) {
      setHits(prev => prev + 1);
      setLastError(errorReason);
      setLastErrorTime(Date.now());
    } else if (hit) {
      // This else block handles the case where there's a hit, but we don't want to count it
      // We don't increment hits, but we might want to set an error message for feedback
      setLastError("Game started. Pray up to begin!");
      setLastErrorTime(Date.now());
    }
  
    prayerState.current.lastPrayer = prayerState.current.currentPrayer;
  }, [gameMode, setScore, setHits, setDrain, setLastError, setLastErrorTime, setPlayAttackAnimation]);
  
   
      //sound handler
    const playMetronomeSound = () => {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const oscillator = audioContext.current.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.current.currentTime);
      oscillator.connect(audioContext.current.destination);
      oscillator.start();
      oscillator.stop(audioContext.current.currentTime + 0.1);
    };
  
  
      //animation handler
    const handleAttackAnimationComplete = () => {
      console.log("animation:completed")
      setPlayAttackAnimation(false);
    };
  
  
  
      //click handler
    const handleClick = (prayerType) => {
      const now = Date.now();
      const clickTime = now - gameStartTime.current;
      const currentTick = Math.floor(clickTime / TICK_DURATION) + 1;
      const timeWithinTick = clickTime % TICK_DURATION;
    
      if (gameMode === 'single' || gameMode === '1t') {
        prayerState.current.isOn = !prayerState.current.isOn;
      } else if (gameMode === 'alternate') {
        if (prayerType === prayerState.current.currentPrayer) {
          prayerState.current.isOn = false;
          prayerState.current.currentPrayer = null;
        } else {
          prayerState.current.isOn = true;
          prayerState.current.currentPrayer = prayerType;
        }
      }
    
      prayerState.current.lastToggle = now;
      prayerState.current.lastActionTick = getCycleTick(currentTick);
      prayerState.current.lastActionTimeInTick = Math.round(timeWithinTick);
    
      if (!prayerState.current.isOn) {
        ticksOn.current = 0;
      }
    };
  
  //use effects:
    //useeffect base
  useEffect(() => {
    let interval;
    if (isGameRunning) {
      interval = setInterval(() => {
        const now = Date.now();
        const lagAdjustedTime = now - gameStartTime.current + lag;
        const newTick = Math.floor(lagAdjustedTime / TICK_DURATION) + 1;
        const newDisplayTick = ((newTick - 1) % 4) + 1;

        setDisplayTick(newDisplayTick);
        
        if (newTick !== lastProcessedTick.current) {
          processTick(newTick);
          lastProcessedTick.current = newTick;
          if (metronomeEnabled) playMetronomeSound();
        }
      }, 16);
    }

    return () => clearInterval(interval);
  }, [lag, gameMode, metronomeEnabled, processTick, isGameRunning]);


    //tutorial useeffect
  useEffect(() => {
    if (showTutorial) {
      const timer = setTimeout(() => setShowTutorial(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showTutorial]);


    //keyboard shortcut useefect
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'p' || event.key === 'P') {
        setIsGameRunning(prevState => !prevState);
      }
    };
  
    document.addEventListener('keydown', handleKeyPress);
  
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);


 
  //main component return
  return (
    <div className="prayer-flick-container">

      <div className="game-card">
        <h2>Prayer Flick Trainer</h2>
        <button className="settings-button" onClick={() => setShowSettings(!showSettings)}>
        Settings
      </button>
        <div className="tutorial-tooltip">
          <span className="tooltip-text"><i>{tutorialText[gameMode]}</i></span>
          {/*<button className="help-button">How to Play</button>*/}
        </div>

        {gameMode === "single" && use3DModel ? (
          <ModelViewer url="ranger.glb" playAnimation={playAttackAnimation} onAnimationComplete={handleAttackAnimationComplete}/>
        ) : (
          <img src={gameMode === "single" ? dudeImage : 
                  gameMode === "alternate" ? blobImage : 
                  snakeImage} 
              alt={`${gameMode} mode`} 
              style={{ height: '180px' }} />
        )}

        {showErrorLog && lastError && Date.now() - lastErrorTime < 4800 && !lastError.includes('NaN') && !lastError.includes('undefined') && (
            <div className="error-log" style={{
              opacity: 1 - (Date.now() - lastErrorTime) / 4800
            }}>
              {lastError}
            </div>
        )}
          
        <div className="tick-display" style={{ display: 'flex', justifyContent: 'center' }}>
        <h1>{displayTick}</h1>
        </div>



        <div className="prayer-buttons">
          {gameMode === 'single' && renderPrayerButton('range')}
          {gameMode === 'alternate' && (
            <>
              {renderPrayerButton('mage')}
              {renderPrayerButton('range')}
            </>
          )}
          {gameMode === '1t' && renderPrayerButton('1t')}
        </div>
        <div className="score-grid">
          <div>
            <h3>Flicked</h3>
            <p>{score}</p>
          </div>
          <div>
            <h3>Tanked</h3>
            <p>{hits}</p>
          </div>
          <div>
            <h3>PP drained</h3>
            <p>{drain}</p>
          </div>
        </div>

        <div className="game-controls">
          <button onClick={resetGame}>Reset</button>
          <button style={{  "fontWeight": "bold", "width": "150px"}} onClick={() => setIsGameRunning(!isGameRunning)}>
          {isGameRunning ? 
  <span><u>P</u>ause</span> : 
  <span><u>P</u>lay</span>
}
</button>
        </div>
      </div>



      {showSettings && (
        <div className="settings-panel">
          <div className="game-modes">
          <h2>Game Modes:</h2>
        <button 
          onClick={() => { setGameMode('single'); resetGame(); }}
          className={gameMode === 'single' ? 'active' : ''}
        >
          Single
        </button>
        <button 
          onClick={() => { setGameMode('alternate'); resetGame(); }}
          className={gameMode === 'alternate' ? 'active' : ''}
        >
          Alternate
        </button>
        <button 
          onClick={() => { setGameMode('1t'); resetGame(); }}
          className={gameMode === '1t' ? 'active' : ''}
        >
          1t Flick
        </button>
      </div>
      <hr></hr>
      <h3>Settings</h3>
          <div>
            <label htmlFor="lag">Lag (ms):</label>
            <input
              id="lag"
              type="number"
              min="0"
              max="400"
              value={lag}
              onChange={(e) => setLag(Math.min(400, Math.max(0, parseInt(e.target.value) || 0)))}
            />
          </div>
          <div>
            <label htmlFor="metronome">Enable Metronome:</label>
            <input
              id="metronome"
              type="checkbox"
              checked={metronomeEnabled}
              onChange={(e) => setMetronomeEnabled(e.target.checked)}
            />
          </div>
          <div>
            <label htmlFor="use3DModel">3D Model(Single):</label>
              <input
              id="use3DModel"
              type="checkbox"
              checked={use3DModel}
              onChange={(e) => setUse3DModel(e.target.checked)}
              />
          </div>

          <div>
              <label htmlFor="showErrorLog">Show Error Detail:</label>
              <input
                id="showErrorLog"
                type="checkbox"
                checked={showErrorLog}
                onChange={(e) => setShowErrorLog(e.target.checked)}
              />
          </div>
<hr></hr>

        </div>

        
      )}
      <div className="footnote">
          <a href="https://twitter.com/tomexrage" target="_blank" rel="noopener noreferrer">Twitter</a>
          <a href="https://github.com/tomexlol/flick-trainer" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://paypal.me/tomexlol" target="_blank" rel="noopener noreferrer">Donate</a>
      </div>

    </div>
  );
};

export default PrayerFlickGames;