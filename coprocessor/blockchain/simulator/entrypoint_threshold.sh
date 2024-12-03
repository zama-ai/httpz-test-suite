#!/bin/bash

apt-get update && apt-get install -y jq

fetch_key_id() {
    sleep 2 && echo "Launching insecure-key-gen..."
    output=$(simulator -f /app/config/local_threshold_from_compose.toml --max-iter 3600 insecure-key-gen)
    if [[ $? -ne 0 ]]; then
        echo "Error during key-gen. Exiting."
        exit 1
    fi
    echo $output
    
    key_id=$(echo "$output" | jq -r ".[0].keygen_response.request_id")
}

fetch_crs_id() {
    sleep 2 && echo -e "\n\nLaunching crs_gen_response..."
    output=$(simulator -f /app/config/local_threshold_from_compose.toml --max-iter 3600 insecure-crs-gen --max-num-bits 2048)
    if [[ $? -ne 0 ]]; then
        echo "Error during key-gen. Exiting."
        exit 1
    fi
    echo $output
    
    crs_id=$(echo "$output" | jq -r ".[0].crs_gen_response.request_id")
}

fetch_key_id
fetch_crs_id

env_file=$1
echo "GATEWAY__KMS__KEY_ID=$key_id" > "$env_file"
echo "GATEWAY__KMS__CRS_ID=$crs_id" >> "$env_file"

echo "Updated env file:"
cat "$env_file"
