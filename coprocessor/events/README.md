# Run python listener

INFO:

- TFHEExecutor.events.sol: this file is the deployed contract with events
- TFHEExecutor.json: this is the abi of the TFHEExecutor.events.sol contract, it is needed to be able listen events (used by listen.py) 

## Prepare python listener using web3

1. Set virtual env
`python3 -m venv .venv`

2. Install web3 package
pip install -r requirement.txt

## Run listener

- if no arguments = no event filter
- if arguments = filter given events

Note: list of events in event.txt

Filter fheAdd operation

```bash
python listen.py FheAdd
```

Typical output:

```bash
$python3 listen.py FheAdd        
🎯 Filtering events: FheAdd

🚀 Event Listener Started
🔌 WebSocket Provider: ws://localhost:8746
🏛️ Contract Address: 0x596E6682c72946AF006B27C131793F2b62527A4b
🔍 Press CTRL+C to stop.


🔔 **New Event Detected** 🔔
📌 Event Signature: ca101b6655df270ab4c630a5cd2c2df7b974e16b2d53387ce9ed51591f7742ed
✅ Decoded Event: FheAdd
🎯 Event Args: AttributeDict({'lhs': 70084675581859205593639557565875076875281902952131178072004241064879069201664, 'rhs': 10000, 'scalarByte': b'\x01', 'result': 106174070065000109436498558594766928612149996076848564747187355064862907237632})
🔗 Tx Hash: 22cc7e429a3b4d3755658ca577082d6f03866050d2cdbaecc58c198af29298ba
⛓️ Block Number: 749
--------------------------------------------------
```

## Start an ERC20 test to trigger FHE operations, though not necessarily TrivialEncrypt.

Run the ERC20 transfer test in work_dir/fhevm

```bash
npx hardhat test --grep 'should transfer' --network localCoprocessor  
```
