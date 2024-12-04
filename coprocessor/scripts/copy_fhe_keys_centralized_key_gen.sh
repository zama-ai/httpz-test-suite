#!/usr/bin/env bash

# Script to create keys by downloading from MinIO and copying them to the appropriate folder
# Usage: ./copy_fhe_keys_threshold_key_gen.sh [LOCAL_BUILD_PUBLIC_KEY_PATH]

if [ "$#" -ge 1 ]; then
    LOCAL_BUILD_PUBLIC_KEY_PATH=$1
    NETWORK_KEYS_PUBLIC_PATH="${LOCAL_BUILD_PUBLIC_KEY_PATH}"
else
    NETWORK_KEYS_PUBLIC_PATH="./volumes/network-public-fhe-keys"
fi

mkdir -p "$NETWORK_KEYS_PUBLIC_PATH"
rm -f "$NETWORK_KEYS_PUBLIC_PATH/*"

MAX_RETRIES=30
DELAY=10

retry_until_success() {
    local url=$1
    local retries=$2
    local delay=$3
    local output_file=$4
    local response=""

    while ((retries > 0)); do
        if [[ -n $output_file ]]; then
            response=$(curl -f -o "$output_file" "$url")
        else
            response=$(curl -f "$url")
        fi
        if [[ $? -eq 0 ]]; then
            echo $response
            return 0
        fi
        ((retries--))
        sleep "$delay"
    done
    return 1
}

KEYS_URLS_JSON=$(retry_until_success "http://localhost:7077/keyurl" "$MAX_RETRIES" "$DELAY")
if [[ $? -ne 0 ]]; then
    echo "Error: Failed to get keys from gateway at http://localhost:7077/keyurl. Is the gateway running?"
    exit 1
fi

echo $KEYS_URLS_JSON
echo

# Get the URLs and extract the IDs
PKS_URL=$(jq -r '.response.fhe_key_info[0].fhe_public_key.urls[0]' <<< "$KEYS_URLS_JSON")
SKS_URL=$(jq -r '.response.fhe_key_info[0].fhe_server_key.urls[0]' <<< "$KEYS_URLS_JSON")
CRS_URL=$(jq -r '.response.crs."2048".urls[0]' <<< "$KEYS_URLS_JSON")
SIGNER1_URL=$(jq -r '.response.verf_public_key[0].verf_public_key_address' <<< "$KEYS_URLS_JSON")

# Extract only the ID part from each URL
PKS_ID=$(basename "$PKS_URL")
SKS_ID=$(basename "$SKS_URL")
CRS_ID=$(basename "$CRS_URL")
SIGNER1_ID=$(basename "$SIGNER1_URL")

# Prepare the list of files to download
FILES_TO_DOWNLOAD=(
  "PUB/PublicKey/$PKS_ID"
  "PUB/ServerKey/$SKS_ID"
  "PUB/CRS/$CRS_ID"
  "PUB/VerfAddress/$SIGNER1_ID"
)

# Print the file paths for confirmation
echo "Files to download:"
for path in "${FILES_TO_DOWNLOAD[@]}"; do
    echo "$path"
done

echo "###########################################################"
echo "All the required keys will be downloaded to $NETWORK_KEYS_PUBLIC_PATH"
echo "###########################################################"

# Copy the required files to the specified public path
echo "Copying keys to $NETWORK_KEYS_PUBLIC_PATH..."

retry_until_success "$PKS_URL" "$MAX_RETRIES" "$DELAY" "$NETWORK_KEYS_PUBLIC_PATH/pks"
if [[ $? -ne 0 ]]; then
    echo "Error: Failed to get pks file"
    exit 1
fi

retry_until_success "$SKS_URL" "$MAX_RETRIES" "$DELAY" "$NETWORK_KEYS_PUBLIC_PATH/sks"
if [[ $? -ne 0 ]]; then
    echo "Error: Failed to get sks file"
    exit 1
fi

retry_until_success "$CRS_URL" "$MAX_RETRIES" "$DELAY" "$NETWORK_KEYS_PUBLIC_PATH/pp"
if [[ $? -ne 0 ]]; then
    echo "Error: Failed to get pp file"
    exit 1
fi

retry_until_success "$SIGNER1_URL" "$MAX_RETRIES" "$DELAY" "$NETWORK_KEYS_PUBLIC_PATH/signer1"
if [[ $? -ne 0 ]]; then
    echo "Error: Failed to get signer1 file"
    exit 1
fi

echo "###########################################################"
echo "All keys have been copied to $NETWORK_KEYS_PUBLIC_PATH"
echo "###########################################################"
