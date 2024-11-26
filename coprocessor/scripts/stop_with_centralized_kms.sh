#!/usr/bin/env bash

sudo docker compose -vvv \
    -f docker-compose/docker-compose-kms-base.yml \
    -f docker-compose/docker-compose-kms-centralized.yml \
    -f docker-compose/docker-compose-kms-gateway-centralized.yml \
    -f docker-compose/docker-compose-coprocesor.yml \
    down -v --remove-orphans
