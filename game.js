// Pool Game

// Constants
const BALL_RADIUS = 15;
const POCKET_RADIUS = 25;
const FRICTION = 0.99;
const MIN_SPEED = 0.1;
const CUE_BALL_COLOR = '#FFFFFF';
const BALL_COLORS = [
    '#FFFF00', // 1 - Yellow
    '#0000FF', // 2 - Blue
    '#FF0000', // 3 - Red
    '#800080', // 4 - Purple
    '#FFA500', // 5 - Orange
    '#008000', // 6 - Green
    '#800000', // 7 - Maroon
    '#000000', // 8 - Black
    '#FFFF00', // 9 - Yellow striped
    '#0000FF', // 10 - Blue striped
    '#FF0000', // 11 - Red striped
    '#800080', // 12 - Purple striped
    '#FFA500', // 13 - Orange striped
    '#008000', // 14 - Green striped
    '#800000'  // 15 - Maroon striped
];

const GAME_STATES = {
  START: 'start',
  PLAYING: 'playing',
  GAME_OVER: 'game_over'
};

const ACHIEVEMENTS = [
  {
    id: 'first_shot',
    title: 'First Shot',
    description: 'Take your first shot',
    unlocked: false,
    icon: '🎯'
  },
  {
    id: 'first_pocket',
    title: 'Pocket Master',
    description: 'Pocket your first ball',
    unlocked: false,
    icon: '🎱'
  },
  {
    id: 'three_in_one',
    title: 'Triple Threat',
    description: 'Pocket 3 balls in one shot',
    unlocked: false,
    icon: '🏆'
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Clear the table in under 60 seconds',
    unlocked: false,
    icon: '⚡'
  },
  {
    id: 'perfect_game',
    title: 'Perfect Game',
    description: 'Win without scratching',
    unlocked: false,
    icon: '👑'
  }
];

const PLAYER_MODES = {
  ONE_PLAYER: 'one_player',
  TWO_PLAYER: 'two_player'
};

const PLAYER_COLORS = {
  PLAYER1: '#4169E1', // Royal Blue
  PLAYER2: '#FF4500'  // Orange Red
};

// Canvas setup
const canvas = document.getElementById('poolCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

// Game state
let balls = [];
let pockets = [];
let cue = {
    x: 0,
    y: 0,
    visible: false,
    angle: 0,
    power: 5  // Fixed power value
};
let gameState = GAME_STATES.START; // start, playing, game_over
let playState = 'aiming'; // aiming, shooting, waiting
let gameOverReason = '';
let achievements = [...ACHIEVEMENTS];
let gameStartTime = 0;
let ballsPocketedThisShot = 0;
let hasScratchedThisGame = false;
let showAchievement = false;
let currentAchievement = null;
let achievementTimer = 0;
let playerMode = PLAYER_MODES.ONE_PLAYER;
let currentPlayer = 1; // 1 or 2
let player1Score = 0;
let player2Score = 0;
let cueSticks = [
  {
    visible: false,
    angle: 0,
    power: 5,
    color: PLAYER_COLORS.PLAYER1
  },
  {
    visible: false,
    angle: Math.PI,
    power: 5,
    color: PLAYER_COLORS.PLAYER2
  }
];

// Initialize the game
function init() {
    createPockets();
    createBalls();
    loadAchievements();
    
    // Event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Create pockets at the corners and middle sides
function createPockets() {
    const pocketPositions = [
        { x: 0, y: 0 },                    // Top-left
        { x: width / 2, y: 0 },            // Top-middle
        { x: width, y: 0 },                // Top-right
        { x: 0, y: height },               // Bottom-left
        { x: width / 2, y: height },       // Bottom-middle
        { x: width, y: height }            // Bottom-right
    ];
    
    pockets = pocketPositions.map(pos => ({
        x: pos.x,
        y: pos.y,
        radius: POCKET_RADIUS
    }));
}

// Create and position all balls
function createBalls() {
    balls = [];
    
    // Add cue ball
    balls.push({
        x: width / 4,
        y: height / 2,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        color: CUE_BALL_COLOR,
        number: 0,
        inPlay: true
    });
    
    // Position for the first ball in the triangle
    const startX = width * 0.75;
    const startY = height / 2;
    
    // Create the triangle formation
    let ballIndex = 0;
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
            if (ballIndex < 15) {
                const x = startX + row * BALL_RADIUS * 2;
                const y = startY - (row * BALL_RADIUS) + (col * BALL_RADIUS * 2);
                
                balls.push({
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    radius: BALL_RADIUS,
                    color: BALL_COLORS[ballIndex],
                    number: ballIndex + 1,
                    striped: ballIndex >= 8,
                    inPlay: true
                });
                
                ballIndex++;
            }
        }
    }
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Update achievement timer
    if (showAchievement) {
        achievementTimer--;
        if (achievementTimer <= 0) {
            showAchievement = false;
        }
    }

    if (gameState === GAME_STATES.PLAYING && playState === 'waiting') {
        // Update ball positions
        let moving = false;
        let cueBallInPocket = false;
        
        balls.forEach(ball => {
            if (ball.inPlay) {
                // Apply friction
                ball.vx *= FRICTION;
                ball.vy *= FRICTION;
                
                // Stop very slow balls
                if (Math.abs(ball.vx) < MIN_SPEED) ball.vx = 0;
                if (Math.abs(ball.vy) < MIN_SPEED) ball.vy = 0;
                
                // Update position
                ball.x += ball.vx;
                ball.y += ball.vy;
                
                // Check if any ball is still moving
                if (Math.abs(ball.vx) > 0 || Math.abs(ball.vy) > 0) {
                    moving = true;
                }
                
                // Wall collisions
                if (ball.x - ball.radius < 0) {
                    ball.x = ball.radius;
                    ball.vx = -ball.vx;
                }
                if (ball.x + ball.radius > width) {
                    ball.x = width - ball.radius;
                    ball.vx = -ball.vx;
                }
                if (ball.y - ball.radius < 0) {
                    ball.y = ball.radius;
                    ball.vy = -ball.vy;
                }
                if (ball.y + ball.radius > height) {
                    ball.y = height - ball.radius;
                    ball.vy = -ball.vy;
                }
                
                // Check pocket collisions
                pockets.forEach(pocket => {
                    const dx = ball.x - pocket.x;
                    const dy = ball.y - pocket.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < pocket.radius) {
                        ball.inPlay = false;
                        
                        // Check if cue ball fell in pocket
                        if (ball.number === 0) {
                            cueBallInPocket = true;
                            hasScratchedThisGame = true;
                        } else {
                            ballsPocketedThisShot++;
                        }
                    }
                });
            }
        });
        
        // Check ball collisions
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                if (balls[i].inPlay && balls[j].inPlay) {
                    handleBallCollision(balls[i], balls[j]);
                }
            }
        }
        
        // Check for "first_pocket" achievement
        if (ballsPocketedThisShot > 0) {
            unlockAchievement('first_pocket');
        }
        
        // Check for "three_in_one" achievement
        if (ballsPocketedThisShot >= 3) {
            unlockAchievement('three_in_one');
        }
        
        // If cue ball fell in pocket, game over
        if (cueBallInPocket) {
            gameState = GAME_STATES.GAME_OVER;
            gameOverReason = 'Scratch! White ball in pocket';
        }
        
        // If all balls stopped moving, switch to aiming
        if (!moving) {
            playState = 'aiming';
            
            // In two-player mode, switch turns if no balls were pocketed
            if (playerMode === PLAYER_MODES.TWO_PLAYER && ballsPocketedThisShot === 0) {
                switchPlayer();
            }
            
            // Update scores
            if (currentPlayer === 1) {
                player1Score += ballsPocketedThisShot;
            } else {
                player2Score += ballsPocketedThisShot;
            }
            
            ballsPocketedThisShot = 0; // Reset for next shot
            
            // Check if all balls except cue ball are pocketed (win condition)
            const remainingBalls = balls.filter(ball => ball.inPlay && ball.number > 0).length;
            if (remainingBalls === 0) {
                gameState = GAME_STATES.GAME_OVER;
                gameOverReason = 'You won! All balls pocketed';
                
                // Check for "speed_demon" achievement
                const gameTime = (Date.now() - gameStartTime) / 1000; // in seconds
                if (gameTime < 60) {
                    unlockAchievement('speed_demon');
                }
                
                // Check for "perfect_game" achievement
                if (!hasScratchedThisGame) {
                    unlockAchievement('perfect_game');
                }
            }
        }
    }
}

// Handle collision between two balls
function handleBallCollision(ball1, ball2) {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if balls are colliding
    if (distance < ball1.radius + ball2.radius) {
        // Calculate collision normal
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate relative velocity
        const relVelX = ball2.vx - ball1.vx;
        const relVelY = ball2.vy - ball1.vy;
        
        // Calculate relative velocity in terms of the normal direction
        const relVelDotNormal = relVelX * nx + relVelY * ny;
        
        // Do not resolve if velocities are separating
        if (relVelDotNormal > 0) return;
        
        // Calculate restitution (elasticity of collision)
        const restitution = 0.9;
        
        // Calculate impulse scalar
        const impulseScalar = -(1 + restitution) * relVelDotNormal / 2;
        
        // Apply impulse
        ball1.vx -= impulseScalar * nx;
        ball1.vy -= impulseScalar * ny;
        ball2.vx += impulseScalar * nx;
        ball2.vy += impulseScalar * ny;
        
        // Move balls apart to prevent sticking
        const overlap = (ball1.radius + ball2.radius - distance) / 2;
        ball1.x -= overlap * nx;
        ball1.y -= overlap * ny;
        ball2.x += overlap * nx;
        ball2.y += overlap * ny;
    }
}

// Render the game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (gameState === GAME_STATES.START) {
        // Draw start panel
        drawStartPanel();
    } else if (gameState === GAME_STATES.PLAYING) {
        // Draw game elements
        drawGameElements();
    } else if (gameState === GAME_STATES.GAME_OVER) {
        // Draw game over panel
        drawGameOverPanel();
    }
}

// Add function to draw start panel
function drawStartPanel() {
    // Draw background
    ctx.fillStyle = '#0a5c36';
    ctx.fillRect(0, 0, width, height);
    
    // Draw title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pool Game', width / 2, height / 3);
    
    // Draw mode selection
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Select Mode', width / 2, height * 2/5);
    
    // Draw mode buttons
    const buttonWidth = 150;
    const buttonHeight = 40;
    const modeSpacing = 20;  // Renamed from 'spacing' to 'modeSpacing'
    
    // One Player button
    const onePlayerX = width / 2 - buttonWidth - modeSpacing / 2;
    const modeButtonY = height * 2/5 + 30;
    
    ctx.fillStyle = playerMode === PLAYER_MODES.ONE_PLAYER ? '#4CAF50' : '#555555';
    ctx.fillRect(onePlayerX, modeButtonY, buttonWidth, buttonHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('One Player', onePlayerX + buttonWidth / 2, modeButtonY + buttonHeight / 2);
    
    // Two Player button
    const twoPlayerX = width / 2 + modeSpacing / 2;  // Use modeSpacing here
    
    ctx.fillStyle = playerMode === PLAYER_MODES.TWO_PLAYER ? '#4CAF50' : '#555555';
    ctx.fillRect(twoPlayerX, modeButtonY, buttonWidth, buttonHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Two Players', twoPlayerX + buttonWidth / 2, modeButtonY + buttonHeight / 2);
    
    // Draw play button
    const playButtonWidth = 200;
    const playButtonHeight = 60;
    const playButtonX = width / 2 - playButtonWidth / 2;
    const playButtonY = height * 2 / 3 - playButtonHeight / 2;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(playButtonX, playButtonY, playButtonWidth, playButtonHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Play Game', width / 2, height * 2 / 3);
    
    // Draw instructions
    ctx.font = '16px Arial';
    ctx.fillText('Click and aim with mouse, release to shoot', width / 2, height * 2 / 3 + 60);
    
    // Draw achievements section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Achievements', width / 2, height * 1/6);
    
    // Draw achievement list
    const achievementSize = 50;
    const achievementSpacing = 10;  // Renamed from 'spacing' to 'achievementSpacing'
    const totalWidth = achievements.length * (achievementSize + achievementSpacing) - achievementSpacing;
    let startX = (width - totalWidth) / 2;
    
    achievements.forEach((achievement, index) => {
        const x = startX + index * (achievementSize + achievementSpacing);
        const y = height * 1/6 + 30;
        
        // Draw achievement background
        ctx.fillStyle = achievement.unlocked ? '#FFD700' : '#555555';
        ctx.fillRect(x, y, achievementSize, achievementSize);
        
        // Draw achievement icon
        ctx.fillStyle = achievement.unlocked ? '#000000' : '#AAAAAA';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(achievement.icon, x + achievementSize/2, y + achievementSize/2);
        
        // Draw tooltip on hover
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;
        if (mouseX >= x && mouseX <= x + achievementSize &&
            mouseY >= y && mouseY <= y + achievementSize) {
            // Draw tooltip
            const tooltipWidth = 200;
            const tooltipHeight = 70;
            const tooltipX = Math.min(width - tooltipWidth - 10, Math.max(10, x - tooltipWidth/2 + achievementSize/2));
            const tooltipY = y + achievementSize + 10;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
            ctx.strokeStyle = achievement.unlocked ? '#FFD700' : '#AAAAAA';
            ctx.lineWidth = 1;
            ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
            
            ctx.fillStyle = achievement.unlocked ? '#FFD700' : '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(achievement.title, tooltipX + tooltipWidth/2, tooltipY + 20);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.fillText(achievement.description, tooltipX + tooltipWidth/2, tooltipY + 45);
        }
    });
}

// Add function to draw game elements
function drawGameElements() {
    // Draw pockets
    pockets.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
    });
    
    // Draw balls with enhanced numbers
    balls.forEach(ball => {
        if (ball.inPlay) {
            // Draw ball
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = ball.color;
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw stripes if needed
            if (ball.striped) {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0.25 * Math.PI, 0.75 * Math.PI);
                ctx.arc(ball.x, ball.y, ball.radius, 1.25 * Math.PI, 1.75 * Math.PI, false);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
            }
            
            // Draw number with improved styling
            if (ball.number > 0) {
                // Draw white circle background for number
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
                
                // Draw number with better font
                ctx.fillStyle = ball.number === 8 ? '#FFFFFF' : '#000000';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ball.number.toString(), ball.x, ball.y);
            }
        }
    });
    
    // Draw player information
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Game State: ${playState}`, 20, 30);
    
    if (playerMode === PLAYER_MODES.TWO_PLAYER) {
        // Draw player scores and turn indicator
        ctx.font = 'bold 16px Arial';
        
        // Player 1 info
        ctx.fillStyle = currentPlayer === 1 ? PLAYER_COLORS.PLAYER1 : '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(`Player 1: ${player1Score}`, 20, 60);
        
        // Player 2 info
        ctx.fillStyle = currentPlayer === 2 ? PLAYER_COLORS.PLAYER2 : '#FFFFFF';
        ctx.textAlign = 'right';
        ctx.fillText(`Player 2: ${player2Score}`, width - 20, 60);
        
        // Current turn indicator
        ctx.fillStyle = currentPlayer === 1 ? PLAYER_COLORS.PLAYER1 : PLAYER_COLORS.PLAYER2;
        ctx.textAlign = 'center';
        ctx.fillText(`Player ${currentPlayer}'s Turn`, width / 2, 30);
    }
    
    // Draw cue sticks
    const cueBall = balls.find(ball => ball.number === 0 && ball.inPlay);
    
    if (cueBall) {
        // Draw active player's cue stick
        const activeStick = cueSticks[currentPlayer - 1];
        if ((playState === 'aiming' || playState === 'shooting') && activeStick.visible) {
            drawCueStick(cueBall, activeStick, currentPlayer);
        }
        
        // In two-player mode, also draw the inactive player's cue stick to the side
        if (playerMode === PLAYER_MODES.TWO_PLAYER) {
            const inactivePlayer = currentPlayer === 1 ? 2 : 1;
            const inactiveStick = cueSticks[inactivePlayer - 1];
            
            // Position the inactive cue stick to the side
            if (inactivePlayer === 1) {
                // Position on the left side
                drawSideCueStick(20, height - 50, inactiveStick, inactivePlayer);
            } else {
                // Position on the right side
                drawSideCueStick(width - 20, height - 50, inactiveStick, inactivePlayer);
            }
        }
    }
    
    // Draw achievement notification if needed
    if (showAchievement && currentAchievement) {
        // Draw achievement popup
        const popupWidth = 300;
        const popupHeight = 80;
        const popupX = width / 2 - popupWidth / 2;
        const popupY = 20;
        
        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(popupX, popupY, popupWidth, popupHeight);
        ctx.strokeStyle = '#FFD700'; // Gold
        ctx.lineWidth = 2;
        ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);
        
        // Draw icon
        ctx.font = '30px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentAchievement.icon, popupX + 20, popupY + 40);
        
        // Draw title
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.textAlign = 'left';
        ctx.fillText('Achievement Unlocked!', popupX + 60, popupY + 25);
        
        // Draw description
        ctx.font = '14px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(currentAchievement.title, popupX + 60, popupY + 45);
        ctx.fillText(currentAchievement.description, popupX + 60, popupY + 65);
    }
}

// Add function to draw game over panel
function drawGameOverPanel() {
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw game over message
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', width / 2, height / 3);
    
    // Draw reason
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(gameOverReason, width / 2, height / 2);
    
    // Draw play again button
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = height * 2 / 3 - buttonHeight / 2;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Play Again', width / 2, height * 2 / 3);
}

// Add a function to reset the game
function resetGame() {
    balls = [];
    createBalls();
    playState = 'aiming';
    gameState = GAME_STATES.PLAYING;
    gameStartTime = Date.now();
    ballsPocketedThisShot = 0;
    hasScratchedThisGame = false;
    currentPlayer = 1;
    player1Score = 0;
    player2Score = 0;
    
    // Reset cue sticks
    cueSticks[0].visible = true;
    cueSticks[1].visible = false;
}

// Mouse event handlers
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (gameState === GAME_STATES.START) {
        // Check if mode buttons are clicked
        const buttonWidth = 150;
        const buttonHeight = 40;
        const modeSpacing = 20;
        const onePlayerX = width / 2 - buttonWidth - modeSpacing / 2;
        const twoPlayerX = width / 2 + modeSpacing / 2;
        const modeButtonY = height * 2/5 + 30;
        
        // One Player button
        if (mouseX >= onePlayerX && mouseX <= onePlayerX + buttonWidth &&
            mouseY >= modeButtonY && mouseY <= modeButtonY + buttonHeight) {
            playerMode = PLAYER_MODES.ONE_PLAYER;
        }
        
        // Two Player button
        if (mouseX >= twoPlayerX && mouseX <= twoPlayerX + buttonWidth &&
            mouseY >= modeButtonY && mouseY <= modeButtonY + buttonHeight) {
            playerMode = PLAYER_MODES.TWO_PLAYER;
        }
        
        // Check if play button is clicked
        const playButtonWidth = 200;
        const playButtonHeight = 60;
        const playButtonX = width / 2 - playButtonWidth / 2;
        const playButtonY = height * 2 / 3 - playButtonHeight / 2;
        
        if (mouseX >= playButtonX && mouseX <= playButtonX + playButtonWidth &&
            mouseY >= playButtonY && mouseY <= playButtonY + playButtonHeight) {
            resetGame();
        }
    } else if (gameState === GAME_STATES.GAME_OVER) {
        // Check if play again button is clicked
        const playAgainButtonWidth = 200;
        const playAgainButtonHeight = 60;
        const playAgainButtonX = width / 2 - playAgainButtonWidth / 2;
        const playAgainButtonY = height * 2 / 3 - playAgainButtonHeight / 2;
        
        if (mouseX >= playAgainButtonX && mouseX <= playAgainButtonX + playAgainButtonWidth &&
            mouseY >= playAgainButtonY && mouseY <= playAgainButtonY + playAgainButtonHeight) {
            resetGame();
        }
    } else if (gameState === GAME_STATES.PLAYING && playState === 'aiming') {
        const cueBall = balls.find(ball => ball.number === 0 && ball.inPlay);
        
        if (cueBall) {
            cue.angle = Math.atan2(mouseY - cueBall.y, mouseX - cueBall.x);
            cue.visible = true;
            
            playState = 'shooting';
        }
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
    
    if (gameState === GAME_STATES.PLAYING && (playState === 'shooting' || playState === 'aiming')) {
        const cueBall = balls.find(ball => ball.number === 0 && ball.inPlay);
        
        if (cueBall) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Update angle for current player's cue stick
            const activeStick = cueSticks[currentPlayer - 1];
            activeStick.angle = Math.atan2(mouseY - cueBall.y, mouseX - cueBall.x);
            
            // Show cue stick when in aiming mode
            if (playState === 'aiming') {
                activeStick.visible = true;
            }
        }
    }
}

function handleMouseUp(e) {
    if (gameState === GAME_STATES.PLAYING && playState === 'shooting') {
        const cueBall = balls.find(ball => ball.number === 0 && ball.inPlay);
        
        if (cueBall) {
            const activeStick = cueSticks[currentPlayer - 1];
            
            // Apply fixed force to cue ball
            cueBall.vx = Math.cos(activeStick.angle + Math.PI) * activeStick.power;
            cueBall.vy = Math.sin(activeStick.angle + Math.PI) * activeStick.power;
            
            // Unlock first shot achievement
            unlockAchievement('first_shot');
            
            activeStick.visible = false;
            playState = 'waiting';
        }
    }
}

// Add a function to unlock achievements
function unlockAchievement(id) {
    const achievement = achievements.find(a => a.id === id);
    if (achievement && !achievement.unlocked) {
        achievement.unlocked = true;
        showAchievement = true;
        currentAchievement = achievement;
        achievementTimer = 180; // Show for 3 seconds (60 frames/second)
        
        // Save achievements to localStorage
        localStorage.setItem('poolAchievements', JSON.stringify(achievements));
    }
}

// Add a function to load achievements from localStorage
function loadAchievements() {
    const savedAchievements = localStorage.getItem('poolAchievements');
    if (savedAchievements) {
        const parsed = JSON.parse(savedAchievements);
        // Merge saved unlocked status with our achievement definitions
        achievements = ACHIEVEMENTS.map(achievement => {
            const saved = parsed.find(a => a.id === achievement.id);
            return {
                ...achievement,
                unlocked: saved ? saved.unlocked : false
            };
        });
    }
}

// Add mouse position tracking
let mousePos = { x: 0, y: 0 };

// Add a function to draw a cue stick
function drawCueStick(cueBall, cueStick, playerNum) {
    const cueLength = 200;  // Fixed length
    const endX = cueBall.x + Math.cos(cueStick.angle) * cueLength;
    const endY = cueBall.y + Math.sin(cueStick.angle) * cueLength;
    
    // Draw cue stick with gradient
    const gradient = ctx.createLinearGradient(
        cueBall.x, cueBall.y,
        endX, endY
    );
    
    // Use player color for the cue
    gradient.addColorStop(0, '#F5DEB3');  // Wheat color for tip
    gradient.addColorStop(0.1, cueStick.color); // Player color for main part
    gradient.addColorStop(0.8, '#D2691E'); // Chocolate for handle
    gradient.addColorStop(1, '#A52A2A');   // Brown for end
    
    // Draw a semi-transparent background for the cue to ensure visibility
    ctx.beginPath();
    ctx.moveTo(cueBall.x + Math.cos(cueStick.angle) * (cueBall.radius + 2), 
               cueBall.y + Math.sin(cueStick.angle) * (cueBall.radius + 2));
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
    ctx.lineWidth = 10;
    ctx.stroke();
    
    // Draw the actual cue stick
    ctx.beginPath();
    ctx.moveTo(cueBall.x + Math.cos(cueStick.angle) * (cueBall.radius + 2), 
               cueBall.y + Math.sin(cueStick.angle) * (cueBall.radius + 2));
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 6;
    ctx.stroke();
    
    // Draw cue tip
    ctx.beginPath();
    ctx.arc(
        cueBall.x + Math.cos(cueStick.angle) * (cueBall.radius + 2),
        cueBall.y + Math.sin(cueStick.angle) * (cueBall.radius + 2),
        3, 0, Math.PI * 2
    );
    ctx.fillStyle = '#87CEFA'; // Light blue for chalk
    ctx.fill();
    
    // Draw player number on the cue
    const textX = cueBall.x + Math.cos(cueStick.angle) * (cueLength * 0.7);
    const textY = cueBall.y + Math.sin(cueStick.angle) * (cueLength * 0.7);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`P${playerNum}`, textX, textY);
}

// Add a function to draw a cue stick on the side
function drawSideCueStick(x, y, cueStick, playerNum) {
    const cueLength = 150;
    const angle = playerNum === 1 ? 0 : Math.PI; // Horizontal orientation
    
    const endX = x + Math.cos(angle) * cueLength;
    const endY = y;
    
    // Draw background for visibility
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(50, 50, 50, 0.7)';
    ctx.lineWidth = 10;
    ctx.stroke();
    
    // Draw cue stick
    const gradient = ctx.createLinearGradient(x, y, endX, endY);
    gradient.addColorStop(0, '#F5DEB3');
    gradient.addColorStop(0.1, cueStick.color);
    gradient.addColorStop(0.8, '#D2691E');
    gradient.addColorStop(1, '#A52A2A');
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 6;
    ctx.stroke();
    
    // Draw player number
    const textX = x + Math.cos(angle) * (cueLength * 0.5);
    const textY = y;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`P${playerNum}`, textX, textY);
}

// Add a function to switch players
function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    
    // Update cue stick visibility
    cueSticks[0].visible = currentPlayer === 1;
    cueSticks[1].visible = currentPlayer === 2;
}

// Start the game
window.onload = init; 