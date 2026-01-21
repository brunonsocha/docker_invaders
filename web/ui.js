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

export function initWelcome() {
    const btn = document.getElementById('enterBtn');
    btn.onclick = () => {
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('menuScreen').classList.remove('hidden');
    };
}

export function showLoading() {
    document.getElementById('loadingScreen').classList.remove('hidden');
}

export function showVictory(stats) {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.remove('hidden');

    if (!stats) return;

    const list = document.getElementById('statsList');
    list.innerHTML = '';
    
    let totalNs = 0;
    let maxNs = 0;
    let slowestName = "None";

    stats.forEach(s => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        
        const seconds = (s.ttr / 1_000_000_000).toFixed(2);
        totalNs += s.ttr;

        if (s.ttr > maxNs) {
            maxNs = s.ttr;
            slowestName = s.container.name;
        }

        row.innerHTML = `
            <span style="color: #fff">${s.container.name}</span>
            <span style="color: ${s.state === 'RECOVERED' ? 'var(--success)' : 'var(--danger)'}">${s.state}</span>
            <span style="font-family: monospace">${seconds}s</span>
        `;
        list.appendChild(row);
    });

    const avgSeconds = (stats.length > 0) ? (totalNs / stats.length / 1_000_000_000).toFixed(2) : "0.00";
    document.getElementById('avgTime').innerText = avgSeconds + "s";
    document.getElementById('slowestContainer').innerText = slowestName;
    
    window.lastGameStats = stats;
}

window.downloadCSV = function() {
    if (!window.lastGameStats) return;
    
    const stats = window.lastGameStats;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Container ID,Name,Kill Method,Status,Recovery Time (s)\n";

    stats.forEach(s => {
        const timeSec = (s.ttr / 1_000_000_000).toFixed(4);
        csvContent += `${s.container.id},${s.container.name},${s.kill_method},${s.state},${timeSec}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "docker_invaders_telemetry.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function showDefeat() {
    document.getElementById('defeatScreen').classList.remove('hidden');
    window.history.pushState({}, "", "/forbidden.html")
}


