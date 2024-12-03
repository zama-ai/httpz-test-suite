#!/usr/bin/env bash

set -e

# Import env variables from the .env file.
export $(cat .env | xargs)

sudo docker container prune -f
sudo docker network prune -f

sudo docker compose -vvv \
    -f ../../docker-compose/docker-compose-s3-mock.yml \
    -f ../../docker-compose/docker-compose-centralized-kms-integrated-in-gw.yml \
    -f ../../docker-compose/docker-compose-coprocesor.yml \
    -f ../../docker-compose/docker-compose-db-migration.yml \
    down -v --remove-orphans
