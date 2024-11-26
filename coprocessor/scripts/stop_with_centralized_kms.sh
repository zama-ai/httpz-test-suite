#!/usr/bin/env bash

set -e

# Import env variables from the .env file.
export $(cat ../.env | xargs)

sudo docker compose -vvv \
    -f ../docker-compose/docker-compose-kms-base.yml \
    -f ../docker-compose/docker-compose-kms-centralized.yml \
    -f ../docker-compose/docker-compose-kms-gateway-centralized.yml \
    -f ../docker-compose/docker-compose-coprocesor.yml \
    -f ../docker-compose/docker-compose-db-migration.yml \
    down -v --remove-orphans
