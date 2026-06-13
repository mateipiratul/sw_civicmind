import inspect
import sys
from pathlib import Path

# Add legislative-intelligence path to sys.path
sys.path.insert(0, str(Path("C:/Users/Matei/Desktop/civicmind/legislative-intelligence").resolve()))

from env_setup import load_project_env
load_project_env()

try:
    from langgraph.prebuilt import create_react_agent
    sig = inspect.signature(create_react_agent)
    res = f"Signature: {sig}\nDocstring: {create_react_agent.__doc__}"
except Exception as e:
    res = f"Failed: {e}"

with open("C:/Users/Matei/Desktop/civicmind/legislative-intelligence/data/signature.txt", "w", encoding="utf-8") as f:
    f.write(res)
