export async function updateGameState() {
    try {
        const response = await fetch('/api/checkgame');
        if (!response.ok)
            return null;
        return await response.json();
    } catch (err) {
        console.error("API error:", err);
        return null;
    }
}

export async function shootEnemy(containerId) {
    try {
        const res = await fetch('/api/shoot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({id: containerId})
        });
        return res.ok;

    } catch (err) {
        console.error('Could not reach API')
        return false;
    }
}
