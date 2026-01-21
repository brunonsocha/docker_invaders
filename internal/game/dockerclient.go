package game

import (
	"context"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

type DockerClient struct {
	cli *client.Client
	dataStorage []RecoveryData
	mu sync.RWMutex
	wg sync.WaitGroup
}

type RecoveryData struct {
	Container ContainerInfo `json:"container"`
	KillMethod string `json:"kill_method"`
	TimeToRecover time.Duration `json:"ttr"`
	State string `json:"state"`
}

type ContainerInfo struct {
	ID string `json:"id"`
	Name string `json:"name"`
}

func NewDockerClient() (*DockerClient, error){
	cli, err := client.NewClientWithOpts(client.FromEnv)
	return &DockerClient{cli: cli, mu: sync.RWMutex{}, wg: sync.WaitGroup{}}, err
}

func (d *DockerClient) CheckContainers(targetLabel string) ([]ContainerInfo, error) {
	filter := filters.NewArgs()
	filter.Add("label", targetLabel)
	filter.Add("health", "healthy")
	containers, err := d.cli.ContainerList(context.Background(), container.ListOptions{All: false, Filters: filter})
	if err != nil {
		return nil, err
	}
	var containerIds []ContainerInfo
	for _, i := range containers {
		ctr := ContainerInfo{ID: i.ID, Name: i.Names[0]}
		containerIds = append(containerIds, ctr)
	}
	return containerIds, nil
}

// changed back to string, dockerclient shouldn't depend on types declared in the game logic
func (d *DockerClient) KillContainer(containerId, killMethod string) error {
	exec := container.ExecOptions{
		Cmd: []string{"kill", "-s", killMethod, "-1"},
		AttachStdout: false,
		AttachStderr: false,
	}
	resp, err := d.cli.ContainerExecCreate(context.Background(), containerId, exec)
	if err != nil {
		return err
	}
	if err := d.cli.ContainerExecStart(context.Background(), resp.ID, container.ExecStartOptions{}); err != nil {
		return err
	}
	d.wg.Add(1)
	go func(){
		defer d.wg.Done()
		var startTime time.Time
		killTime := time.Now()
		for {
			time.Sleep(500 * time.Millisecond)
			stateResp, err := d.cli.ContainerInspect(context.Background(), containerId)
			if err != nil {
				d.mu.Lock()
				defer d.mu.Unlock()
				d.dataStorage = append(d.dataStorage, RecoveryData{
					Container: ContainerInfo{
						ID: containerId,
						Name: "Unknown",
					},
					KillMethod: killMethod,
					TimeToRecover: time.Duration(0),
					State: "FAILED",
				})
				return
			}
			if stateResp.State.Health != nil {
				if stateResp.State.Health.Status != "healthy" {
					startTime = time.Now()
					break
				}
			} else {
				if !stateResp.State.Running {
					startTime = time.Now()
					break
				}
			}
			if time.Since(killTime) >= (time.Second * 30) {
				d.mu.Lock()
				defer d.mu.Unlock()
				d.dataStorage = append(d.dataStorage, RecoveryData{
					Container: ContainerInfo{
						ID: containerId,
						Name: "Unknown",
					},
					KillMethod: killMethod,
					TimeToRecover: time.Duration(0),
					State: "FAILED",
				})
				return
			}
		}
		recoveryTime := time.Now()
		for {
			time.Sleep(500 * time.Millisecond)
			stateResp, err := d.cli.ContainerInspect(context.Background(), containerId)
			if err != nil {
				d.mu.Lock()
				defer d.mu.Unlock()
				d.dataStorage = append(d.dataStorage, RecoveryData{
					Container: ContainerInfo{
						ID: containerId,
						Name: "Unknown",
					},
					KillMethod: killMethod,
					TimeToRecover: time.Duration(0),
					State: "FAILED",
				})
				return
			}
			if (stateResp.State.Health != nil && stateResp.State.Health.Status == "healthy" && stateResp.State.Running) || stateResp.State.Health == nil && stateResp.State.Running == true {
				d.mu.Lock()
				defer d.mu.Unlock()
				d.dataStorage = append(d.dataStorage, RecoveryData{
					Container: ContainerInfo{
						ID: containerId,
						Name: stateResp.Name,
					},
					KillMethod: killMethod,
					TimeToRecover: time.Now().Sub(startTime),
					State: "RECOVERED",
				})
				return
			}
			if time.Since(recoveryTime) >= (time.Second * 30) {
				d.mu.Lock()
				defer d.mu.Unlock()
				d.dataStorage = append(d.dataStorage, RecoveryData{
					Container: ContainerInfo{
						ID: containerId,
						Name: stateResp.Name,
					},
					KillMethod: killMethod,
					TimeToRecover: time.Duration(0),
					State: "FAILED",
				})
				return
			}
		}
		
	}()
	return nil
}

func (d *DockerClient) GetStats() []RecoveryData {
	d.mu.RLock()
	defer d.mu.RUnlock()
	copied := make([]RecoveryData, len(d.dataStorage))
	copy(copied, d.dataStorage)
	return copied
}

func (d *DockerClient) WaitForData() {
	d.wg.Wait()
}
