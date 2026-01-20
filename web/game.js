const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function drawGrid() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    for(let x=0; x<800; x+=50) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    }
    for(let y=0; y<600; y+=50) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }
}

drawGrid()

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
        }


    }
    draw() {
        ctx.save()
        ctx.translate(player.position.x + player.width/2, player.position.y + player.height/2)
        ctx.rotate(this.rotation)
        ctx.translate(-player.position.x - player.width/2, -player.position.y - player.height/2)
        ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height)
        ctx.restore()
    }

    update() {
        if (this.image) {
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
    }

    draw() {
        ctx.beginPath()
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = 'red'
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
    constructor({position, dockerId}) {
        this.position = position
        this.velocity = {
            x: 0,
            y: 0
        },
        this.width = 40
        this.height = 40
        this.dockerId = dockerId
    }

    draw() {
        ctx.fillStyle = '#FF30DD'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        ctx.fillStyle = 'black'
        ctx.font = '14px monospace'
        ctx.textAlign = 'center'
        const shortId = this.dockerId.substring(0, 12)
        ctx.fillText(shortId, this.position.x + this.width/2, this.position.y, this.height/2)
    }
    update() {
        this.draw()
    }
}

const player = new Player()
const projectiles = []
const enemies = []
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

function animate() {
    requestAnimationFrame(animate)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawGrid()
    player.update()
    projectiles.forEach((projectile, i) => {
        if (projectile.position.y + projectile.radius <= 0) {
            setTimeout(() => {
                projectiles.splice(i, 1)
            }, 0)
        } else {
            projectile.update()
        }
    })
    if (keys.a.pressed && player.position.x >= 0) {
        player.velocity.x = -5
        player.rotation = -0.15
    } else if (keys.d.pressed && (player.position.x + player.width <= canvas.width)) {
        player.velocity.x = 5
        player.rotation = 0.15
    } else {
        player.velocity.x = 0
        player.rotation = 0
    }
}
animate()

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
            break
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

function log(msg, type="normal") {
    const box = document.getElementById('consoleLog');
    const time = new Date().toLocaleTimeString('en-US', {hour12:false});
    const entry = document.createElement('div');
    entry.className = "log-entry";
    entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg ${type}">${msg}</span>`;
    box.appendChild(entry);
    box.scrollTop = box.scrollHeight;
}

setTimeout(() => log("Connected to localhost:8080", "info"), 1000);
setTimeout(() => log("WARNING: No containers detected", "error"), 2000);
