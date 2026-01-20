package main

import (
	"env_tester/internal/api"
	"log"
	"net/http"
)



func main() {
	gh, err := api.NewGameHandler()
	if err != nil {
		log.Fatal("Can't start the game.")
	}
	fs := http.FileServer(http.Dir("./web"))
	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", fs))
	mux.HandleFunc("GET /", gh.Home)
	mux.HandleFunc("POST /api/shoot", gh.ShootPost)
	mux.HandleFunc("POST /api/getshot", gh.GetShotPost)
	mux.HandleFunc("GET /api/checkgame", gh.CheckGameGet)
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
