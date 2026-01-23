# Docker Invaders

## Description
This is a fork of the [env_tester](https://github.com/brunonsocha/env_tester) project, a tool to test containers by killing them, restarting them and measuring the recovery time.

While it was very fun to write, it's very boring to watch. This project is supposed to help with that.

Shoot at your containers, kill them and watch them ~~restart~~ respawn. At the end, you'll be presented with stats and an option to download detailed data in .csv format.

## How to run it
### What you'll need
- Docker
- Docker Compose

### How to run it
1. Setup
   Mark the containers you want to test with the label chosen in the *config.yaml* file like so:
   ```yaml
   services:
     your-project:
      restart: always
      labels:
        tested: true
   ```
   Make sure the healthcheck is on as well.

2. **Start up the demo**
   ```bash
   docker compose --profile demo up
   ```
   Alternatively, if you want to test it on some random containers:
   ```bash
   docker compose up
   ```

3. **Open the browser**
   Navigate to:
   ```text
   http://localhost:3000/
   ```

4. **Play**

5. **Get the report**  
   While you were playing, the program was collecting data about the containers you were killing. You'll be presented with a summary screen, with an option to download detailed data in a .csv format.

### Clean up
Run:
```bash
docker compose down
```

## How it works
1. The tool mounts */var/run/docker.sock* to check the container list.
2. The tool selects containers marked with the chosen label.
3. The tool lets you kill the containers using SIGKILL, SIGTERM or SIGSEGV, by communicating with the API.
4. The frontend has no impact on measurements of shutdown and restart times.
5. The tool monitors the state of targeted containers by polling the Docker API for their state.

## Project structure

```text
.
├── cmd/
│   └── controller/
│       └── main.go           # Entrypoint
├── internal/
│   ├── api/
│   │   └── handlers.go       # HTTP handlers
│   ├── demo_containers/
│   │   └── enemycontainer.go # Entrypoint of demo containers
│   └── game/
│       ├── dockerclient.go   # Docker interaction layer
│       └── gamelogic.go      # Game logic
├── web/
│   ├── img/                  # Assets (images)
│   ├── api.js                # Frontend-backend communication
│   ├── game.js               # Game and rendering
│   ├── index.html            # Webpage
│   ├── style.css             # Styling
│   └── ui.js                 # UI logic
├── docker-compose.yaml       # Sets up the controller (and demo containers) 
├── Dockerfile.controller     # Controller's dockerfile
├── Dockerfile.demo           # Demo containers' dockerfile 
├── go.mod
├── go.sum
└── README.md
```
