package game

import (
	"fmt"
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
	HP int
	Score int
	MaxScore int
	Weapon KillMethod
	TargetLabel string
}

type GameDataPayload struct {
	Status GameStatus `json:"status"`
	Enemies []ContainerInfo `json:"enemies"`
	HP int `json:"hp"`
	Score int `json:"score"`
	MaxScore int `json:"max_score"`
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
			HP: 3,
			Score: 0,
			MaxScore: maxScore,
			Weapon: killMethod,
			TargetLabel: "tested=true",
		}, 
		InfoLog: infoLog,
		ErrorLog: errorLog,
	},
	nil
}

func (g *GameModel) Shoot(containerId string) error {
	if g.State.Status != StatusPlaying {
		return fmt.Errorf("Game has already finished.")
	}
	g.Mu.Lock()
	defer g.Mu.Unlock()
	g.State.Score++
	if g.State.Score == g.State.MaxScore {
		g.State.Status = StatusVictory
	}
	return g.ApiClient.KillContainer(containerId, string(g.State.Weapon))
}

func (g *GameModel) GetShot() error {
	if g.State.Status != StatusPlaying {
		return fmt.Errorf("Game has already finished.")
	}
	g.Mu.Lock()
	defer g.Mu.Unlock()
	g.State.HP--
	if g.State.HP <= 0 {
		g.State.Status = StatusDefeat
	}
	return nil
}

func (g *GameModel) CheckGame() (*GameDataPayload, error) {
	g.Mu.RLock()
	hp := g.State.HP
	score := g.State.Score
	maxScore := g.State.MaxScore
	g.Mu.RUnlock()
	enemies, err := g.ApiClient.CheckContainers(g.State.TargetLabel)
	if err != nil {
		return nil, err
	} 
	return &GameDataPayload{
		Status: g.State.Status,
		Enemies: enemies,
		HP: hp,
		Score: score,
		MaxScore: maxScore,
	}, nil
}
