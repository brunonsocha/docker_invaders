package game

import (
	"sync"

	"github.com/docker/docker/client"
)

type GameModel struct {
	Mu sync.RWMutex
	ApiClient DockerClient
	State GameState
}
