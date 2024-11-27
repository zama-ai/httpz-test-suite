#!/usr/bin/env bash

set -e

# Import env variables from the .env file.
export $(cat .env | xargs)

# Create directories.
mkdir -p ../../network-keys

# Run KMS, GW, coprocessor and geth.
sudo docker compose -vvv --env-file .env -f ../../docker-compose/docker-compose-kms-base.yml \
    -f ../../docker-compose/docker-compose-kms-centralized.yml \
    -f ../../docker-compose/docker-compose-kms-gateway-centralized.yml \
    -f ../../docker-compose/docker-compose-coprocesor.yml \
    up -d --wait

# Wait a bit.
sleep 4

# Copy keys.
bash ../copy_fhe_keys_centralized_key_gen.sh ../../network-fhe-keys
bash ../update_signers.sh $FHEVM_SOLIDITY_PATH/.env.example.deployment ../../network-fhe-keys 1

# Insert keys.
sudo COMPOSE_PROJECT_NAME=zama-kms-gateway docker compose -vvv -f ../../docker-compose/docker-compose-db-migration.yml up -d --wait

cp $FHEVM_SOLIDITY_PATH/.env.example.deployment $FHEVM_SOLIDITY_PATH/.env

# Clean fhevm openzeppelin.
rm -rf $FHEVM_SOLIDITY_PATH/.openzeppelin

# Fund test addresses.
sudo $FHEVM_SOLIDITY_PATH/fund_tests_addresses_docker.sh

# Precompute addresses.
cd $FHEVM_SOLIDITY_PATH && ./precompute-addresses.sh

# Start coprocessor.
cd $FHEVM_SOLIDITY_PATH && ./launch-fhevm-coprocessor.sh
