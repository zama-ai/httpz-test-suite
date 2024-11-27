#!/usr/bin/env bash

# Import env variables from the .env file.
export $(cat .env | xargs)

cd $FHEVM_SOLIDITY_PATH && npx hardhat test --grep 'test async decrypt uint64'
cd $FHEVM_SOLIDITY_PATH && npx hardhat test --grep 'test reencrypt euint64'
