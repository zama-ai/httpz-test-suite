#!/usr/bin/env bash

set -e

# Import env variables from the .env file.
export $(cat ../.env | xargs)

export FHEVM_SOLIDITY_PATH=/home/petar/zama/zbc-solidity

# Create directories.
mkdir -p ../network-keys

# Run KMS and GW
sudo docker compose -vvv --env-file ../.env -f ../docker-compose/docker-compose-kms-base.yml \
    -f ../docker-compose/docker-compose-kms-centralized.yml \
    -f ../docker-compose/docker-compose-kms-gateway-centralized.yml \
    -f ../docker-compose/docker-compose-coprocesor.yml \
    up -d --wait

# Wait a bit.
sleep 4

# Copy keys.
bash ./copy_fhe_keys_centralized_key_gen.sh ../network-fhe-keys
bash ./update_signers.sh $FHEVM_SOLIDITY_PATH/.env.example.deployment ../network-fhe-keys 1

# Insert keys.
COMPOSE_PROJECT_NAME=zama-kms-gateway sudo docker compose -vvv -f ../docker-compose/docker-compose-db-migration.yml up -d --wait

# Fund test addresses.
sudo $FHEVM_SOLIDITY_PATH/fund_tests_addresses_docker.sh

# Precompute addresses.
cd $FHEVM_SOLIDITY_PATH && ./precompute-addresses.sh

# Start coprocessor.
cd $FHEVM_SOLIDITY_PATH && ./launch-fhevm-coprocessor.sh
