import asyncio
import json
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

_connections: dict[str, list[WebSocket]] = {}
_lock = asyncio.Lock()


async def connect(run_id: str, websocket: WebSocket) -> None:
    await websocket.accept()
    async with _lock:
        if run_id not in _connections:
            _connections[run_id] = []
        _connections[run_id].append(websocket)


async def disconnect(run_id: str, websocket: WebSocket) -> None:
    async with _lock:
        if run_id in _connections:
            try:
                _connections[run_id].remove(websocket)
            except ValueError:
                pass
            if not _connections[run_id]:
                del _connections[run_id]


async def broadcast_to_run(run_id: str, message: dict[str, Any]) -> None:
    async with _lock:
        connections = _connections.get(run_id, [])
        if not connections:
            return
        dead_connections = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead_connections.append(ws)
        for ws in dead_connections:
            try:
                connections.remove(ws)
            except ValueError:
                pass
        if not connections and run_id in _connections:
            del _connections[run_id]


async def websocket_endpoint(websocket: WebSocket, run_id: str) -> None:
    await connect(run_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await disconnect(run_id, websocket)
    except Exception:
        await disconnect(run_id, websocket)
