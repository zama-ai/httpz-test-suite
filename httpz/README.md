# HTTPZ dev setup for E2E tests

## All-in-One CLI

The test suite offers a unified CLI for all operations:

```sh
cd httpz
# Deploy the entire stack
./httpz-cli deploy

# Run specific tests
./httpz-cli test input-proof
# Trivial
./httpz-cli test user-decryption
# Trivial
./httpz-cli test public-decryption
./httpz-cli test erc20

# Upgrade a specific service
./httpz-cli upgrade coprocessor

# View logs
./httpz-cli logs relayer

# Clean up
./httpz-cli clean
