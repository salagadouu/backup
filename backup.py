import os
import time
import requests
from datetime import datetime
import subprocess
import json

x_min, x_max = 1040, 1044
y_min, y_max = 728, 733
base_url = "https://backend.wplace.live/files/s0/tiles/{x}/{y}.png"

REQUEST_DELAY = 0.5
MAX_RETRIES = 5
RETRY_DELAY = 5 

timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
output_dir = os.path.join("tiles", timestamp)
os.makedirs(output_dir, exist_ok=True)

print(f"Saving tiles in: {output_dir}")

for x in range(x_min, x_max + 1):
    for y in range(y_min, y_max + 1):
        output_path = os.path.join(output_dir, f"{x}_{y}.png")
        retries = 0

        while retries < MAX_RETRIES:
            url = base_url.format(x=x, y=y)
            try:
                response = requests.get(url, timeout=10)

                if response.status_code == 200:
                    with open(output_path, "wb") as f:
                        f.write(response.content)
                    print(f"Downloaded tile ({x}, {y})")
                    break

                elif response.status_code == 429:
                    retries += 1
                    print(f"Rate limited at ({x}, {y}), retry {retries}/{MAX_RETRIES}")
                    time.sleep(RETRY_DELAY)

                else:
                    print(f"Tile ({x}, {y}) not found (HTTP {response.status_code})")
                    break 

            except Exception as e:
                retries += 1
                print(f"Error downloading ({x}, {y}): {e}")
                time.sleep(RETRY_DELAY)

        time.sleep(REQUEST_DELAY)


index_path = os.path.join("tiles", "index.json")

# Load existing index.json if it exists
if os.path.exists(index_path):
    with open(index_path, "r") as f:
        index = json.load(f)
else:
    index = {}

# List all PNG files in the current run folder
files = sorted([f for f in os.listdir(output_dir) if f.endswith(".png")])

# Add entry for this timestamp
index[timestamp] = files

# Save back to index.json
with open(index_path, "w") as f:
    json.dump(index, f, indent=2)

print(f"Updated index.json with folder {timestamp}")
