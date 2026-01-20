package game

import (
	"log"
	"os"
	"sync"
)

type GameModel struct {
	Mu sync.RWMutex
	ApiClient *DockerClient
	State GameState
	InfoLog *log.Logger
	ErrorLog *log.Logger
}

type GameStatus string

const (
	StatusPlaying GameStatus = "PLAYING"
	StatusVictory GameStatus = "VICTORY"
	StatusDefeat GameStatus = "DEFEAT"
)

type KillMethod string

const (
	Sigkill KillMethod = "SIGKILL"
	Sigterm KillMethod = "SIGTERM"
	Sigsegv KillMethod = "SIGSEGV"
)

type GameState struct {
	Status GameStatus
	Score int
	MaxScore int
	Weapon KillMethod

}

func NewGameModel(killMethod KillMethod, maxScore int) (*GameModel, error) {
	cli, err := NewDockerClient()
	if err != nil {
		return nil, err
	}
	infoLog := log.New(os.Stdout, "[INFO]\t", log.Ltime)
	errorLog := log.New(os.Stderr, "[ERROR]\t", log.Ltime)
	return &GameModel{
		Mu: sync.RWMutex{}, 
		ApiClient: cli, 
		State: GameState{
			Status: StatusPlaying,
			Score: 0,
			MaxScore: maxScore,
			Weapon: killMethod,
		}, 
		InfoLog: infoLog,
		ErrorLog: errorLog,
	},
	nil
}

func (g *GameModel) Shoot(containerId string) error {
	g.Mu.Lock()
	defer g.Mu.Unlock()
	g.State.Score++
	return g.ApiClient.KillContainer(containerId, g.State.Weapon)
}


