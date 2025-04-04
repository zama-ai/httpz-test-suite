import json
import time
import sys
from web3 import Web3
from web3._utils.events import event_abi_to_log_topic

# ✅ Define WebSocket and Contract Address
WS_URL = "ws://localhost:8746"  # Change if needed
CONTRACT_ADDRESS = "0x596E6682c72946AF006B27C131793F2b62527A4b"

# ✅ Connect to Geth WebSocket
web3 = Web3(Web3.LegacyWebSocketProvider(WS_URL))

# ✅ Ensure Web3 is Connected
if not web3.is_connected():
    raise Exception("❌ Failed to connect to Web3 provider!")

# ✅ Load Contract ABI
with open("./TFHEExecutor.json") as f:
    contract_abi = json.load(f)["abi"]

# ✅ Get Contract Instance
contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)

# ✅ Parse Command Line Arguments for Event Filtering
cli_args = sys.argv[1:]  # Get command-line arguments
all_events = [event.event_name for event in contract.events]  # List of all available events

if cli_args:
    # If arguments provided, filter only given events
    EVENT_NAMES = set(cli_args)
    print(f"🎯 Filtering events: {', '.join(EVENT_NAMES)}")
else:
    # If no arguments provided, listen to all events
    EVENT_NAMES = set(all_events)
    print(f"🎯 No filter applied, listening to ALL events: {', '.join(EVENT_NAMES)}")

# ✅ Display WebSocket and Contract Info
print("\n🚀 Event Listener Started")
print(f"🔌 WebSocket Provider: {WS_URL}")
print(f"🏛️ Contract Address: {CONTRACT_ADDRESS}")
print("🔍 Press CTRL+C to stop.\n")

# ✅ Function to Decode Events Properly (Web3.py v6+)
def decode_event(event_log):
    """Decodes raw event logs into structured event data."""
    for event in contract.events:
        if event.event_name in EVENT_NAMES:  # Only decode if in the filter list
            try:
                decoded_event = event.process_log(event_log)  # ✅ Correct Web3.py v6 method
                return decoded_event
            except:
                continue  # Ignore if decoding fails for an event type
    return None  # No matching event found

# ✅ Function to Handle Events
def handle_event(event_log):
    decoded_event = decode_event(event_log)
    
    print("\n🔔 **New Event Detected** 🔔")
    print(f"📌 Event Signature: {event_log['topics'][0].hex()}")
    
    if decoded_event:
        print(f"✅ Decoded Event: {decoded_event.event}")
        print(f"🎯 Event Args: {decoded_event.args}")
    else:
        print(f"⚠️ Could not decode event, showing raw data:")
        print(event_log)

    print(f"🔗 Tx Hash: {event_log['transactionHash'].hex()}")
    print(f"⛓️ Block Number: {event_log['blockNumber']}")
    print("-" * 50)

# ✅ Poll Events (Web3 v6+ Best Method)
def listen_events():
    latest_block = web3.eth.block_number

    while True:
        try:
            # ✅ Fetch each event separately (avoids "exceed max topics" error)
            for event in contract.events:
                if event.event_name not in EVENT_NAMES:
                    continue  # Skip events not specified in command-line arguments

                event_abi = event._get_event_abi()
                event_topic = event_abi_to_log_topic(event_abi)

                logs = web3.eth.get_logs({
                    "address": CONTRACT_ADDRESS,
                    "topics": [event_topic],
                    "fromBlock": latest_block
                })

                for log in logs:
                    handle_event(log)

            latest_block = web3.eth.block_number  # Update latest block to avoid duplication
            time.sleep(2)  # Reduce CPU usage

        except Exception as e:
            print(f"⚠️ Error: {e}")
            time.sleep(5)  # Avoid excessive retries

# ✅ Run Event Listener
if __name__ == "__main__":
    listen_events()
