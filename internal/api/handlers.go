package api

import (
	"encoding/json"
	"env_tester/internal/game"
	"net/http"
)

type GameHandler struct {
	GameModel *game.GameModel
}

type ShotRequest struct {
	ContainerId string `json:"id"`
}

type SetGameRequest struct {
	KillMethod string `json:"kill_method"`
	Iterations int `json:"iterations"`
}

func NewGameHandler() (*GameHandler, error) {
	// these are the default settings then
	// the website will request settings from the player
	gm, err := game.NewGameModel(game.Sigkill, 10)
	if err != nil {
		return nil, err
	}
	return &GameHandler{GameModel: gm}, nil
}

func (gh *GameHandler) Home(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./web/index.html")

}

func (gh *GameHandler) ShootPost(w http.ResponseWriter, r *http.Request) {
	var req ShotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		gh.GameModel.ErrorLog.Printf("Bad shot request structure: %v", err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	if err := gh.GameModel.Shoot(req.ContainerId); err != nil {
		gh.GameModel.ErrorLog.Printf("Couldn't kill the container: %v", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (gh *GameHandler) GetShotPost(w http.ResponseWriter, r *http.Request) {
	if err := gh.GameModel.GetShot(); err != nil {
		// will write a helper for this.
		gh.GameModel.ErrorLog.Printf("Couldn't check the game: %v", err)
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (gh *GameHandler) CheckGameGet(w http.ResponseWriter, r *http.Request) {
	payload, err := gh.GameModel.CheckGame()
	if err != nil {
		gh.GameModel.ErrorLog.Printf("Couldn't check the game: %v", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
}

func (gh *GameHandler) SetGamePost(w http.ResponseWriter, r *http.Request) {
	var setReq SetGameRequest
	if err := json.NewDecoder(r.Body).Decode(&setReq); err != nil {
		gh.GameModel.ErrorLog.Printf("Couldn't set the settings.")
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	if err := gh.GameModel.SetGame(setReq.KillMethod, setReq.Iterations); err != nil {
		gh.GameModel.ErrorLog.Printf("Couldn't set the settings.")
		http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
}
