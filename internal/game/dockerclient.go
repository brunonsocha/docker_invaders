package game 

import (
	"context"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

type DockerClient struct {
	cli *client.Client
}

type ContainerInfo struct {
	ID string
	Name string
}

func NewDockerClient() (*DockerClient, error){
	cli, err := client.NewClientWithOpts(client.FromEnv)
	return &DockerClient{cli: cli}, err
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

func (d *DockerClient) KillContainer(containerId string, killMethod KillMethod) error {
	exec := container.ExecOptions{
		Cmd: []string{"kill", "-s", string(killMethod), "-1"},
		AttachStdout: false,
		AttachStderr: false,
	}
	resp, err := d.cli.ContainerExecCreate(context.Background(), containerId, exec)
	if err != nil {
		return err
	}
	return d.cli.ContainerExecStart(context.Background(), resp.ID, container.ExecStartOptions{})
}
