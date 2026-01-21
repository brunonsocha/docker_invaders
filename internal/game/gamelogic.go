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
	StatusWaiting GameStatus = "FINALIZING"
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
	Stats []RecoveryData `json:"stats"`
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
	if err := g.ApiClient.KillContainer(containerId, string(g.State.Weapon)); err != nil {
		return err
	}
	g.State.Score++
	if g.State.Score == g.State.MaxScore {
		g.State.Status = StatusWaiting
		go func(){
			g.ApiClient.WaitForData()
			g.Mu.Lock()
			g.State.Status = StatusVictory
			g.Mu.Unlock()
		}()
	}
	return nil
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
	status := g.State.Status
	targetLabel := g.State.TargetLabel
	g.Mu.RUnlock()
	enemies, err := g.ApiClient.CheckContainers(targetLabel)
	if err != nil {
		return nil, err
	}

	if status == StatusVictory {
		return &GameDataPayload{
			Status: status,
			Enemies: enemies,
			HP: hp,
			Score: score,
			MaxScore: maxScore,
			Stats: g.ApiClient.GetStats(),
		}, nil
	}

	return &GameDataPayload{
		Status: status,
		Enemies: enemies,
		HP: hp,
		Score: score,
		MaxScore: maxScore,
	}, nil
}

func (g *GameModel) SetGame(killMethod string, maxScore int) error {
	var validMethod KillMethod
	switch killMethod {
	case string(Sigkill):
		validMethod = Sigkill
	case string(Sigterm):
		validMethod = Sigterm
	case string(Sigsegv):
		validMethod = Sigsegv
	default:
		return fmt.Errorf("Invalid kill method.")
	}
	if maxScore <= 0 {
		return fmt.Errorf("Invalid number of iterations.")
	}
	g.Mu.Lock()
	defer g.Mu.Unlock()
	g.State.MaxScore = maxScore
	g.State.Weapon = validMethod
	g.State.HP = 3
	g.State.Status = StatusPlaying
	g.State.Score = 0
	return nil
}


