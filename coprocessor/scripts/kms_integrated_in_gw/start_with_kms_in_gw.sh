#!/usr/bin/env bash

set -e

sudo docker container prune

sudo docker compose -vvv --env-file .env -f ../../docker-compose/docker-compose-s3-mock.yml \
    -f ../../docker-compose/docker-compose-centralized-kms-integrated-in-gw.yml \
    -f ../../docker-compose/docker-compose-coprocesor.yml \
    up -d --wait
