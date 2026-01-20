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

func (gh *GameHandler) Home(w http.ResponseWriter, r *http.Request) {
	// this just renders the game
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

func (gh *GameHandler) CheckGame(w http.ResponseWriter, r *http.Request) {
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
