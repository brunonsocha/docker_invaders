import { 
    updateGameState,
    shootEnemy,
    getShot,
    setGame
} from './api.js';

import {
    log,
    updateUI,
    initMenu,
    showGameInterface,
    showVictory,
    showDefeat,
    showLoading,
    initWelcome
} from './ui.js'

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = 1000;
let boundaryLeft = 0;
let boundaryRight = 0;

function drawBackground() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(boundaryLeft, 0, GAME_WIDTH, canvas.height);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1a1a1a'; 
    
    for(let x = boundaryLeft; x <= boundaryRight; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for(let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(boundaryLeft, y); ctx.lineTo(boundaryRight, y); ctx.stroke();
    }
}

function drawForeground() {
    ctx.clearRect(0, 0, boundaryLeft, canvas.height);
    ctx.clearRect(boundaryRight, 0, canvas.width - boundaryRight, canvas.height);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#976393'; 
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#976393';
    ctx.beginPath();
    ctx.moveTo(boundaryLeft, 0); ctx.lineTo(boundaryLeft, canvas.height);
    ctx.moveTo(boundaryRight, 0); ctx.lineTo(boundaryRight, canvas.height);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

class Player {
    constructor() {
        this.position = {
            x:375,
            y:525
        }
        this.velocity = {
            x: 0,
            y: 0
        }

        this.rotation = 0
        
        const image = new Image()
        image.src = '/static/img/spaceship.png'
        image.onload = () => {
            const scale = 0.10
            this.image = image
            this.width = image.width * scale
            this.height = image.height * scale
            this.loaded = true;
            this.position = {
                x: boundaryLeft + (GAME_WIDTH / 2) - (this.width / 2),
                y: canvas.height - 100
            }
        }


    }
    draw() {
        if (!this.loaded)
            return;
        ctx.save()
        ctx.translate(this.position.x + this.width/2, this.position.y + this.height/2)
        ctx.rotate(this.rotation)
        ctx.translate(-this.position.x - this.width/2, -this.position.y - this.height/2)
        ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height)
        ctx.restore()
    }

    update() {
        if (this.loaded) {
            this.draw()
            this.position.x += this.velocity.x
        }
    }
}

class Projectile {
    constructor({position, velocity}) {
        this.position = position
        this.velocity = velocity
        this.radius = 3
        this.markDelete = false;
    }

    draw() {
        ctx.beginPath()
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = '#feda84'
        ctx.fill()
        ctx.closePath()
    }

    update() {
        this.draw()
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y
    }
}

class Enemy {
    constructor({position, dockerId, name}) {
        this.position = position
        this.velocity = {
            x: 0,
            y: 0
        },
        this.width = 40
        this.height = 40
        this.dockerId = dockerId
        this.name = name.startsWith('/') ? name.substring(1) : name
        this.isKill = false;
        this.markDelete = false;
    }

    draw() {
        if (this.isKill) {
            ctx.globalAlpha = 0.5;
        }
        ctx.fillStyle = '#feda83'
        ctx.font = '16px "VT323"'
        ctx.textAlign = 'center'
        ctx.fillText(this.name, this.position.x + this.width/2, this.position.y - 10)
        ctx.fillStyle = '#0db7ed'
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#0db7ed'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        ctx.globalAlpha = 1.0;
    }
    update() {
        this.draw()
    }
}

class EnemyProjectile {
    constructor({position, velocity}) {
        this.position = position
        this.velocity = velocity
        this.radius = 4 
        this.markDelete = false;
    }

    draw() {
        ctx.beginPath()
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = '#ff9b83'
        ctx.fill()
        ctx.closePath()
    }

    update() {
        this.draw()
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y
    }
}

const player = new Player()
let projectiles = []
let enemies = new Map();
let enemyProjectiles = []
let gameRunning = false;
let isFinalizing = false;
let gameInterval = null;
let animationId = null;
const keys = {
    a: {
        pressed: false
    },
    d: {
        pressed: false
    },
    space: {
        pressed: false
    }
}

function getSafePosition(newWidth, newHeight, existingEnemies) {
    const padding = 20; 
    const buffer = 50; 
    const maxY = canvas.height * 0.3; 
    
    let attempts = 0;
    let maxAttempts = 100;
    let x, y;
    let safe = false;
    const minX = boundaryLeft + padding;
    const maxX = boundaryRight - newWidth - padding;
    while (!safe && attempts < maxAttempts) {
        attempts++;
        x = Math.random() * (maxX - minX) + minX;
        y = Math.random() * (maxY - newHeight - padding) + padding;
        safe = true;

        for (const enemy of existingEnemies.values()) {
            const ex = enemy.position.x;
            const ey = enemy.position.y;
            const ew = enemy.width;
            const eh = enemy.height;

            if (x < ex + ew + buffer &&
                x + newWidth + buffer > ex &&
                y < ey + eh + buffer &&
                y + newHeight + buffer > ey) {
                safe = false;
                break; 
            }
        }
    }
    return { x, y };
}

async function syncGame() {
    if (!gameRunning)
        return;
    
    const data = await updateGameState();
    if (!data)
        return;
    if (data.status === "FINALIZING") {
        isFinalizing = true;
        enemyProjectiles = [];
        showLoading();
        return;
    } 
    if (data.status === "VICTORY") {
        gameRunning = false;
        clearInterval(gameInterval);
        showVictory(data.stats);
        return;
    }
    if (data.status === "DEFEAT") {
        gameRunning = false;
        clearInterval(gameInterval);
        showDefeat();
        return;
    }

    updateUI(data);

    if (!data.enemies) {
        enemies.clear();
        return;
    }

    const serverIds = new Set();

    data.enemies.forEach((enemyData, index) => {
        serverIds.add(enemyData.id);
        if (!enemies.has(enemyData.id)) {
            const {
                x, 
                y
            } = getSafePosition(40, 40, enemies);
            const newEnemy = new Enemy({
                position: {
                    x: x,
                    y: y
                },
                dockerId: enemyData.id,
                name: enemyData.name || (enemyData.Names ? enemyData.Names[0] : "Unknown")
            });
            enemies.set(enemyData.id, newEnemy);
        }
    });

    for (const [id, enemy] of enemies) {
        if (!serverIds.has(id)) {
            enemies.delete(id);
        }
    }


}

function animate() {
    if (!gameRunning)
        return;
    animationId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    if (keys.a.pressed && player.position.x >= boundaryLeft) {
        player.velocity.x = -7;
        player.rotation = -0.15;
    } else if (keys.d.pressed && (player.position.x + player.width <= boundaryRight)) {
        player.velocity.x = 5;
        player.rotation = 0.15;
    } else {
        player.velocity.x = 0;
        player.rotation = 0;
    }
    player.update();
    enemies.forEach(enemy => {
        enemy.update();

        if (!enemy.isKill && Math.random() < 0.005 && !isFinalizing) {
            enemyProjectiles.push(new EnemyProjectile({
                position: {
                    x: enemy.position.x + enemy.width/2,
                    y: enemy.position.y + enemy.height
                },
                velocity: {
                    x: 0,
                    y: 2
                }
            }));
        }
    });

    enemyProjectiles.forEach(proj => {
        proj.update();

        if (proj.position.y - proj.radius > canvas.height) {
            proj.markDelete = true;
        }

        if (player.loaded && !proj.markDelete && !isFinalizing) {
            if (proj.position.x >= player.position.x &&
                proj.position.x <= player.position.x + player.width &&
                proj.position.y >= player.position.y &&
                proj.position.y <= player.position.y + player.height) {
                proj.markDelete = true;
                log("Hit registered", "error");
                getShot();
            }
        }
    });

    let activeEnemyProjectiles = [];
    enemyProjectiles.forEach(p => {
        if (!p.markDelete)
            activeEnemyProjectiles.push(p);
    });
    enemyProjectiles = activeEnemyProjectiles;

    projectiles.forEach(projectile => {
        projectile.update();

        if (projectile.position.y + projectile.radius <= 0) {
            projectile.markDelete = true;
        }

        enemies.forEach(enemy => {
            if (enemy.isKill || projectile.markDelete) return;

            const distX = Math.abs(projectile.position.x - (enemy.position.x + enemy.width/2));
            const distY = Math.abs(projectile.position.y - (enemy.position.y + enemy.height/2));

            if (distX <= (enemy.width/2 + projectile.radius) && 
                distY <= (enemy.height/2 + projectile.radius)) {
                
                projectile.markDelete = true;
                enemy.isKill = true;
                
                shootEnemy(enemy.dockerId).then(success => {
                    if (!success) {
                        enemy.isKill = false;
                    }
                });
            }
        });
    });

    let activeProjectiles = [];
    projectiles.forEach(p => {
        if (!p.markDelete) activeProjectiles.push(p);
    });
    projectiles = activeProjectiles;
    drawForeground();
}

const startGame = async (killMethod, iterations) => {
    const success = await setGame(killMethod, iterations);
    if (success) {
        showGameInterface();
        gameRunning = true;
        isFinalizing = false;
        if (gameInterval)
            clearInterval(gameInterval);
        if (animationId)
            cancelAnimationFrame(animationId);
        gameInterval = setInterval(syncGame, 500);
        animate();
    }
}

addEventListener('keydown', ({key}) => {
    switch (key) {
        case 'a':
            keys.a.pressed = true
            break
        case 'd':
            keys.d.pressed = true
            break
        case ' ':
            keys.space.pressed = true
            projectiles.push(new Projectile({
                position: {
                    x: player.position.x + player.width/2, 
                    y: player.position.y
                },
                velocity: {
                    x: 0,
                    y: -10
                }
            }))
            break;
    }
})

addEventListener('keyup', ({key}) => {
    switch (key) {
        case 'a':
            keys.a.pressed = false
            break
        case 'd':
            keys.d.pressed = false
            break
        case ' ':
            keys.space.pressed = false
            break
    }
}) 
function resizeCanvas() {
    canvas.width = window.innerWidth;
    const container = document.querySelector('.canvas-container');
    if (container) {
        canvas.height = container.clientHeight;
    } else {
        canvas.height = window.innerHeight; 
    }

    boundaryLeft = (canvas.width / 2) - (GAME_WIDTH / 2);
    boundaryRight = (canvas.width / 2) + (GAME_WIDTH / 2);

    if (typeof player !== 'undefined' && player.position) {
        if (player.position.x < boundaryLeft) player.position.x = boundaryLeft;
        if (player.position.x > boundaryRight - player.width) player.position.x = boundaryRight - player.width;
    }

    if (typeof enemies !== 'undefined') {
        enemies.forEach(enemy => {
             if (enemy.position.x < boundaryLeft) enemy.position.x = boundaryLeft + 10;
             if (enemy.position.x > boundaryRight - enemy.width) enemy.position.x = boundaryRight - enemy.width - 10;
        });
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initWelcome();
initMenu(startGame);

