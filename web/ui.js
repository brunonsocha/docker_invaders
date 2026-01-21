export function log(msg, type="normal") {
    const box = document.getElementById('consoleLog');
    const time = new Date().toLocaleTimeString('en-US', {hour12:false});
    const entry = document.createElement('div');
    entry.className = "log-entry";
    entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg ${type}">${msg}</span>`;
    box.appendChild(entry);
    box.scrollTop = box.scrollHeight;
}

export function updateUI(gamestate) {
    const setText = (id, text) => {
        const element = document.getElementById(id);
        if (element)
            element.innerText = text;
    };
    setText('livesVal', gamestate.hp !== undefined ? gamestate.hp : 3);
    const current = gamestate.score || 0;
    const total = gamestate.max_score || "?";
    setText('targetsVal', `${current}/${total}`);
}

export function initMenu(onStartGame) {
    const btn = document.getElementById('startBtn');
    btn.onclick = () => {
        const killMethod = document.getElementById('weaponSelect').value;
        const iterations = document.getElementById('iterInput').value;
        onStartGame(killMethod, iterations)
    };
}

export function showGameInterface() {
    document.getElementById('menuScreen').classList.add('hidden');
}

export function showVictory() {
    document.getElementById('victoryScreen').classList.remove('hidden');
}
export function showDefeat() {
    document.getElementById('defeatScreen').classList.remove('hidden');
    window.history.pushState({}, "", "/forbidden.html")
}


