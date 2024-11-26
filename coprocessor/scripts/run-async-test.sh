#!/usr/bin/env bash

export FHEVM_SOLIDITY_PATH=/home/petar/zama/zbc-solidity

cd $FHEVM_SOLIDITY_PATH && npx hardhat test --grep 'test async decrypt uint64'
