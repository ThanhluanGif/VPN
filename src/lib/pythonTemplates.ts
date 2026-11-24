import type { AppProfilesData, ProxyNode } from '../types/network';
import { formatSingBoxConfigJson } from './configBuilder';
import type { ZipFileEntry } from './zipBuilder';

export interface PythonModuleSpec {
  id: string;
  stage: string;
  filename: string;
  title: string;
  summary: string;
  code: string;
}

export const WINDOWS_ONE_CLICK_BAT = `@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title PingGate — Khoi dong 1-Click (Windows)

:: 1. Tu dong xin quyen Administrator (bat buoc de tao card mang ao TUN)
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [PingGate] Dang xin quyen Administrator de khoi tao card mang ao TUN...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

:: 2. Kiem tra Python 3
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Chua tim thay Python 3.11+ tren may.
    echo Vui long tai Python tai https://www.python.org/downloads/ (nho tich "Add python.exe to PATH").
    pause
    exit /b 1
)

:: 3. Tu dong cai dat thu vien giao dien CustomTkinter neu thieu
python -c "import customtkinter" >nul 2>&1
if %errorlevel% neq 0 (
    echo [PingGate] Dang cai dat thu vien giao dien customtkinter...
    python -m pip install --upgrade customtkinter
)

:: 4. Tu dong tai sing-box.exe chinh thuc tu GitHub SagerNet neu chua co
if not exist "bin\\sing-box.exe" (
    echo [PingGate] Dang tai loi mang sing-box.exe chinh thuc tu GitHub...
    mkdir bin >nul 2>&1
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$ErrorActionPreference='Stop';" ^
      "$rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/SagerNet/sing-box/releases/latest';" ^
      "$asset = $rel.assets | Where-Object { $_.name -match 'windows-amd64\\.zip$' -and $_.name -notmatch 'legacy' } | Select-Object -First 1;" ^
      "if (-not $asset) { throw 'Khong tim thay ban sing-box windows-amd64' };" ^
      "Invoke-WebRequest -Uri $asset.browser_download_url -OutFile 'bin\\sing-box.zip';" ^
      "Expand-Archive -Path 'bin\\sing-box.zip' -DestinationPath 'bin\\tmp' -Force;" ^
      "$exe = Get-ChildItem -Path 'bin\\tmp' -Recurse -Filter 'sing-box.exe' | Select-Object -First 1;" ^
      "Copy-Item -Path $exe.FullName -Destination 'bin\\sing-box.exe' -Force;" ^
      "Remove-Item -Path 'bin\\sing-box.zip','bin\\tmp' -Recurse -Force;"
    if %errorlevel% neq 0 (
        echo [LOI] Khong the tu dong tai sing-box.exe. Hay tai thu cong tu https://github.com/SagerNet/sing-box/releases va dat vao thu muc bin\\sing-box.exe
        pause
        exit /b 1
    )
)

echo [PingGate] Da san sang! Dang khoi chay ung dung Desktop + Local Bridge (127.0.0.1:17890)...
python main_ui.py
if %errorlevel% neq 0 pause
`;

export const MACOS_ONE_CLICK_SH = `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

pause_on_exit() {
  local code=$?
  if [ "$code" -ne 0 ]; then
    echo ""
    echo "[PingGate] Da xay ra loi (ma loi: $code)."
    read -r -p "Nhan Enter de dong cua so..." _
  fi
}
trap pause_on_exit EXIT

echo "[PingGate] Dang chuan bi moi truong macOS..."

if ! command -v python3 >/dev/null 2>&1; then
  echo "[LOI] Chua tim thay python3. Hay cai Python 3.11+ (https://www.python.org/downloads/ hoac brew install python)."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[LOI] Chua tim thay curl tren he thong."
  exit 1
fi

# Tao moi truong ao cuc bo .venv de tranh loi PEP 668 va dam bao sudo python3 thay customtkinter
VENV_DIR=".venv"
if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "[PingGate] Dang tao moi truong Python cuc bo (.venv)..."
  python3 -m venv "$VENV_DIR"
fi

if ! "$VENV_DIR/bin/python" -c "import customtkinter" >/dev/null 2>&1; then
  echo "[PingGate] Dang cai dat thu vien giao dien customtkinter..."
  "$VENV_DIR/bin/python" -m pip install --upgrade pip certifi customtkinter
fi

# Dung curl goc cua macOS (xac thuc chung chi SSL bang macOS Keychain, tranh loi SSL cua python.org)
if [ ! -f "bin/sing-box" ]; then
  echo "[PingGate] Dang tai loi mang sing-box chinh thuc tu GitHub..."
  mkdir -p bin
  OS_NAME="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH_RAW="$(uname -m)"
  if [ "$ARCH_RAW" = "arm64" ] || [ "$ARCH_RAW" = "aarch64" ]; then
    ARCH="arm64"
  else
    ARCH="amd64"
  fi

  RELEASE_JSON="$(curl -fsSL -H "User-Agent: PingGate" "https://api.github.com/repos/SagerNet/sing-box/releases/latest")"
  DOWNLOAD_URL="$(printf '%s' "$RELEASE_JSON" | "$VENV_DIR/bin/python" - "$OS_NAME" "$ARCH" <<'PY'
import json, sys
os_name, arch = sys.argv[1], sys.argv[2]
rel = json.load(sys.stdin)
suffix = f"{os_name}-{arch}.tar.gz"
asset = next(
    (
        a for a in rel.get("assets", [])
        if a.get("name", "").endswith(suffix) and "legacy" not in a.get("name", "")
    ),
    None,
)
if not asset:
    raise SystemExit(f"Khong tim thay ban sing-box cho {suffix}")
print(asset["browser_download_url"])
PY
)"

  curl -fsSL -H "User-Agent: PingGate" "$DOWNLOAD_URL" -o "bin/sing-box.tar.gz"
  "$VENV_DIR/bin/python" - <<'PY'
import pathlib, tarfile
archive = pathlib.Path("bin/sing-box.tar.gz")
with tarfile.open(archive, "r:gz") as tar:
    member = next(m for m in tar.getmembers() if m.name.endswith("/sing-box"))
    with tar.extractfile(member) as src, open("bin/sing-box", "wb") as dst:
        dst.write(src.read())
archive.unlink(missing_ok=True)
PY
  chmod +x bin/sing-box
  xattr -d com.apple.quarantine bin/sing-box 2>/dev/null || true
fi

echo "[PingGate] Nhap mat khau macOS (sudo) de khoi tao card mang ao TUN..."
sudo "$VENV_DIR/bin/python" main_ui.py
`;

export const BUILD_EXE_BAT = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [PingGate] Dang cai PyInstaller va dong goi file PingGate.exe doc lap...
python -m pip install --upgrade pyinstaller customtkinter
pyinstaller --noconfirm --onefile --windowed --name PingGate --uac-admin --add-data "bin\\sing-box.exe;bin" --add-data "profiles.json;." main_ui.py
echo [PingGate] Hoan tat! File chay doc lap nam tai thu muc dist\\PingGate.exe
pause
`;

export const README_TXT = `PINGGATE — HƯỚNG DẪN BẬT LÊN VÀ SỬ DỤNG NGAY (WINDOWS / MACOS)
================================================================

Bộ tệp này đã đóng gói sẵn danh sách Node và quy tắc Split-Tunneling
mà bạn vừa thiết lập trên ứng dụng web PingGate.

CÁCH CHẠY 1-CLICK TRÊN WINDOWS:
1. Giải nén toàn bộ thư mục PingGate-Desktop.zip ra máy tính.
2. Nhấp đúp vào tệp: PingGate-Windows.bat
3. Chọn "Yes" khi Windows hỏi quyền Administrator (bắt buộc để tạo card mạng ảo TUN).
   -> Tệp .bat sẽ tự cài thư viện giao diện và tự tải lõi sing-box.exe chính thức.
4. Cửa sổ PingGate Desktop sẽ mở lên — nhấn "Bật tối ưu mạng Game" là chạy thật!

CÁCH CHẠY TRÊN MACOS:
1. Giải nén thư mục và nhấp đúp tệp PingGate-macOS.command (hoặc chạy: bash PingGate-macOS.command).
2. Nhập mật khẩu máy tính để cấp quyền sudo cho card mạng ảo TUN.

ĐIỀU KHIỂN TRỰC TIẾP TỪ TRANG WEB (LOCAL AGENT):
- Khi PingGate Desktop đang chạy, cầu nối cục bộ (127.0.0.1:17890) tự động mở sẵn.
- Bạn có thể quay lại trang web PingGate, bấm "Kết nối máy tính (Local Agent)"
  để bật/tắt VPN thật và đo TCP Ping thật ngay trên trình duyệt.

ĐÓNG GÓI THÀNH FILE .EXE ĐỘC LẬP:
- Sau khi chạy PingGate-Windows.bat ít nhất 1 lần (để có sẵn bin\\sing-box.exe),
  nhấp đúp build_exe.bat để tạo file dist\\PingGate.exe chạy độc lập.
`;

export const PYTHON_MODULES: PythonModuleSpec[] = [
  {
    id: 'stage-1-parser',
    stage: 'Giai đoạn 1',
    filename: 'parser.py',
    title: 'URI Parser Module (VLESS, Trojan, VMess, Shadowsocks)',
    summary:
      'Giải mã chuỗi link cấu hình chuẩn (Base64 / URL parameters) thành dictionary outbound hợp lệ cho sing-box, hỗ trợ TLS, Reality, WebSocket và gRPC.',
    code: `"""
Giai đoạn 1: URI Parser Module (parser.py)
Chuyển đổi link vless://, trojan://, vmess://, ss:// sang outbound dict chuẩn của sing-box.
"""

from __future__ import annotations

import base64
import json
import re
from typing import Any, Dict, Tuple
from urllib.parse import parse_qs, unquote, urlparse

UUID_PATTERN = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


class ProxyParseError(ValueError):
    """Ngoại lệ khi link cấu hình không hợp lệ hoặc thiếu tham số bắt buộc."""


def _decode_base64(payload: str) -> str:
    cleaned = payload.strip().replace("-", "+").replace("_", "/")
    padding = "=" * ((4 - len(cleaned) % 4) % 4)
    try:
        return base64.b64decode(cleaned + padding).decode("utf-8")
    except Exception as exc:
        raise ProxyParseError(f"Không thể giải mã Base64: {exc}") from exc


def _build_tls(params: Dict[str, str], default_host: str, default_security: str) -> Dict[str, Any] | None:
    security = params.get("security", default_security).lower()
    if not security or security == "none":
        return None

    server_name = params.get("sni") or params.get("peer") or default_host
    if security == "reality":
        public_key = params.get("pbk", "").strip()
        if not public_key:
            raise ProxyParseError("VLESS Reality thiếu khóa công khai (pbk).")
        return {
            "enabled": True,
            "server_name": server_name,
            "utls": {
                "enabled": True,
                "fingerprint": params.get("fp", "chrome"),
            },
            "reality": {
                "enabled": True,
                "public_key": public_key,
                "short_id": params.get("sid", ""),
            },
        }

    if security == "tls":
        tls: Dict[str, Any] = {
            "enabled": True,
            "server_name": server_name,
        }
        if params.get("allowInsecure") in ("1", "true") or params.get("insecure") in ("1", "true"):
            tls["insecure"] = True
        if params.get("alpn"):
            tls["alpn"] = [item.strip() for item in params["alpn"].split(",") if item.strip()]
        if params.get("fp"):
            tls["utls"] = {"enabled": True, "fingerprint": params["fp"]}
        return tls

    raise ProxyParseError(f"Chế độ bảo mật không hỗ trợ: {security}")


def _build_transport(params: Dict[str, str]) -> Dict[str, Any] | None:
    net_type = params.get("type", "tcp").lower()
    if net_type in ("ws", "websocket"):
        transport: Dict[str, Any] = {
            "type": "ws",
            "path": params.get("path", "/"),
        }
        if params.get("host"):
            transport["headers"] = {"Host": params["host"]}
        return transport
    if net_type == "grpc":
        return {
            "type": "grpc",
            "service_name": params.get("serviceName") or params.get("path") or "grpc",
        }
    if net_type == "httpupgrade":
        transport = {"type": "httpupgrade", "path": params.get("path", "/")}
        if params.get("host"):
            transport["host"] = params["host"]
        return transport
    return None


def _parse_vless_or_trojan(uri: str, protocol: str) -> Tuple[str, Dict[str, Any]]:
    parsed = urlparse(uri)
    credential = unquote(parsed.username or "").strip()
    server = (parsed.hostname or "").strip()
    port = parsed.port or 443

    if not server or not (1 <= port <= 65535):
        raise ProxyParseError("Địa chỉ server hoặc port không hợp lệ.")
    if not credential:
        raise ProxyParseError(f"Link {protocol}:// thiếu thông tin xác thực.")
    if protocol == "vless" and not UUID_PATTERN.match(credential):
        raise ProxyParseError("UUID trong link VLESS không đúng định dạng.")

    flat_params = {k: v[0] for k, v in parse_qs(parsed.query).items() if v}
    outbound: Dict[str, Any] = {
        "type": protocol,
        "tag": "proxy-outbound",
        "server": server,
        "server_port": port,
        "packet_encoding": "xudp",
    }

    if protocol == "vless":
        outbound["uuid"] = credential
        if flat_params.get("flow"):
            outbound["flow"] = flat_params["flow"]
    else:
        outbound["password"] = credential

    tls = _build_tls(flat_params, server, "tls" if protocol == "trojan" else "none")
    if tls:
        outbound["tls"] = tls

    transport = _build_transport(flat_params)
    if transport:
        outbound["transport"] = transport

    remark = unquote(parsed.fragment).strip() if parsed.fragment else f"{protocol.upper()} {server}:{port}"
    return remark, outbound


def _parse_vmess(uri: str) -> Tuple[str, Dict[str, Any]]:
    raw_json = _decode_base64(uri[len("vmess://") :])
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ProxyParseError(f"JSON bên trong VMess không hợp lệ: {exc}") from exc

    server = str(data.get("add", "")).strip()
    port = int(data.get("port", 0))
    uuid = str(data.get("id", "")).strip()
    if not server or not (1 <= port <= 65535) or not uuid:
        raise ProxyParseError("Cấu hình VMess thiếu server, port hoặc id.")

    params = {
        "security": "tls" if str(data.get("tls", "")).lower() == "tls" else "none",
        "sni": str(data.get("sni") or data.get("host") or server),
        "type": str(data.get("net", "tcp")),
        "path": str(data.get("path", "/")),
        "host": str(data.get("host", "")),
    }

    outbound: Dict[str, Any] = {
        "type": "vmess",
        "tag": "proxy-outbound",
        "server": server,
        "server_port": port,
        "uuid": uuid,
        "security": str(data.get("scy", "auto")),
        "alter_id": int(data.get("aid", 0) or 0),
        "packet_encoding": "xudp",
    }
    tls = _build_tls(params, server, "none")
    if tls:
        outbound["tls"] = tls
    transport = _build_transport(params)
    if transport:
        outbound["transport"] = transport

    remark = str(data.get("ps", "")).strip() or f"VMess {server}:{port}"
    return remark, outbound


def _parse_shadowsocks(uri: str) -> Tuple[str, Dict[str, Any]]:
    body = uri[len("ss://") :].strip()
    main_part, _, fragment = body.partition("#")
    main_part = main_part.split("?", 1)[0]

    if "@" in main_part:
        userinfo_raw, host_port = main_part.rsplit("@", 1)
        userinfo = unquote(userinfo_raw) if ":" in userinfo_raw else _decode_base64(userinfo_raw)
    else:
        decoded = _decode_base64(main_part)
        if "@" not in decoded:
            raise ProxyParseError("Cấu trúc link Shadowsocks không hợp lệ.")
        userinfo, host_port = decoded.rsplit("@", 1)

    if ":" not in userinfo or ":" not in host_port:
        raise ProxyParseError("Link Shadowsocks thiếu method:password hoặc server:port.")

    method, password = userinfo.split(":", 1)
    server, port_str = host_port.rsplit(":", 1)
    port = int(port_str)
    if not server or not (1 <= port <= 65535):
        raise ProxyParseError("Địa chỉ server hoặc port Shadowsocks không hợp lệ.")

    outbound: Dict[str, Any] = {
        "type": "shadowsocks",
        "tag": "proxy-outbound",
        "server": server.strip("[]"),
        "server_port": port,
        "method": method.strip(),
        "password": password,
    }
    remark = unquote(fragment).strip() if fragment else f"SS {server}:{port}"
    return remark, outbound


def parse_proxy_uri(uri: str) -> Tuple[str, Dict[str, Any]]:
    """Phân tích URI proxy thành cặp (tên hiển thị, sing-box outbound dict)."""
    cleaned = uri.strip()
    if not cleaned:
        raise ProxyParseError("Đường dẫn cấu hình không được để trống.")

    lower = cleaned.lower()
    if lower.startswith("vless://"):
        return _parse_vless_or_trojan(cleaned, "vless")
    if lower.startswith("trojan://"):
        return _parse_vless_or_trojan(cleaned, "trojan")
    if lower.startswith("vmess://"):
        return _parse_vmess(cleaned)
    if lower.startswith("ss://"):
        return _parse_shadowsocks(cleaned)

    raise ProxyParseError("Chỉ hỗ trợ các giao thức: vless://, trojan://, vmess://, ss://.")
`,
  },
  {
    id: 'stage-2-config-builder',
    stage: 'Giai đoạn 2',
    filename: 'config_builder.py',
    title: 'Routing & Split-Tunneling Generator (config_builder.py)',
    summary:
      'Sinh file config.json hoàn chỉnh cho sing-box với TUN Interface bắt toàn bộ UDP/TCP của game, DNS chống rò rỉ và rule process_name tách riêng lưu lượng game.',
    code: `"""
Giai đoạn 2: Routing & Split-Tunneling Generator (config_builder.py)
Sinh file config.json chuẩn sing-box hỗ trợ TUN mode và định tuyến riêng theo tiến trình game.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, List

DEFAULT_GAME_PROCESSES: List[str] = [
    "RobloxPlayerBeta.exe",
    "RobloxPlayer",
    "RobloxStudioBeta.exe",
]

DEFAULT_GAME_DOMAINS: List[str] = [
    "roblox.com",
    "rbxcdn.com",
    "robloxlabs.com",
    "rbxinfra.net",
]

DEFAULT_BYPASS_PROCESSES: List[str] = [
    "Discord.exe",
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
]


def build_singbox_config(
    proxy_outbound: Dict[str, Any],
    *,
    split_tunnel: bool = True,
    game_processes: Iterable[str] = DEFAULT_GAME_PROCESSES,
    game_domains: Iterable[str] = DEFAULT_GAME_DOMAINS,
    bypass_processes: Iterable[str] = DEFAULT_BYPASS_PROCESSES,
    tun_stack: str = "system",
    mtu: int = 9000,
) -> Dict[str, Any]:
    """Tạo cấu hình sing-box hoàn chỉnh (TUN + DNS + Split/Global routing)."""
    outbound_copy = dict(proxy_outbound)
    outbound_copy["tag"] = "proxy-outbound"

    processes = sorted({p.strip() for p in game_processes if p and p.strip()})
    domains = sorted({d.strip().lower() for d in game_domains if d and d.strip()})
    bypasses = sorted({b.strip() for b in bypass_processes if b and b.strip()})

    dns_rules: List[Dict[str, Any]] = []
    if split_tunnel and domains:
        dns_rules.append({"domain_suffix": domains, "server": "proxy-dns"})

    route_rules: List[Dict[str, Any]] = [
        {"action": "sniff"},
        {"protocol": "dns", "action": "hijack-dns"},
        {"ip_is_private": True, "outbound": "direct"},
    ]

    if split_tunnel:
        if bypasses:
            route_rules.append({"process_name": bypasses, "outbound": "direct"})
        if processes:
            route_rules.append({"process_name": processes, "outbound": "proxy-outbound"})
        if domains:
            route_rules.append({"domain_suffix": domains, "outbound": "proxy-outbound"})

    return {
        "log": {"level": "info", "timestamp": True},
        "dns": {
            "servers": [
                {
                    "type": "https",
                    "tag": "proxy-dns",
                    "server": "1.1.1.1",
                    "detour": "proxy-outbound",
                },
                {
                    "type": "udp",
                    "tag": "local-dns",
                    "server": "1.1.1.1",
                },
            ],
            "rules": dns_rules,
            "strategy": "ipv4_only",
            "final": "local-dns" if split_tunnel else "proxy-dns",
        },
        "inbounds": [
            {
                "type": "tun",
                "tag": "tun-in",
                "address": ["172.19.0.1/30"],
                "mtu": mtu,
                "auto_route": True,
                "strict_route": True,
                "stack": tun_stack,
            }
        ],
        "outbounds": [
            outbound_copy,
            {"type": "direct", "tag": "direct"},
        ],
        "route": {
            "auto_detect_interface": True,
            "default_domain_resolver": "local-dns",
            "rules": route_rules,
            "final": "direct" if split_tunnel else "proxy-outbound",
        },
    }


def write_config_file(config: Dict[str, Any], output_path: str | Path = "config.json") -> Path:
    """Ghi config.json an toàn bằng cơ chế ghi file tạm rồi thay thế."""
    target = Path(output_path)
    tmp_path = target.with_suffix(".json.tmp")
    try:
        tmp_path.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp_path.replace(target)
        return target
    except OSError as exc:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Không thể ghi tệp cấu hình {target}: {exc}") from exc
`,
  },
  {
    id: 'stage-3-core-manager',
    stage: 'Giai đoạn 3',
    filename: 'core_manager.py',
    title: 'Process & Core Manager + Latency Checker',
    summary:
      'Quản lý tiến trình con sing-box trên Windows/macOS, kiểm tra quyền Administrator/Root trước khi bật TUN interface, và tự động dọn dẹp an toàn khi tắt hoặc crash.',
    code: `"""
Giai đoạn 3: Process & Core Manager (core_manager.py)
Quản lý sing-box subprocess, kiểm tra quyền Admin/Root và đo độ trễ TCP tới từng node.
"""

from __future__ import annotations

import atexit
import ctypes
import os
import platform
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional


class CoreManagerError(RuntimeError):
    """Lỗi khi khởi chạy hoặc dừng lõi mạng sing-box."""


def is_admin() -> bool:
    """Kiểm tra quyền Administrator (Windows) hoặc root (macOS/Linux)."""
    system = platform.system()
    if system == "Windows":
        try:
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False
    return hasattr(os, "geteuid") and os.geteuid() == 0


def measure_tcp_ping(host: str, port: int, timeout: float = 2.5) -> Optional[int]:
    """Đo độ trễ kết nối TCP (ms) tới node proxy; trả về None nếu quá hạn."""
    start = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            elapsed_ms = (time.perf_counter() - start) * 1000
            return max(1, round(elapsed_ms))
    except (OSError, socket.timeout):
        return None


class SingBoxCoreManager:
    """Quản lý vòng đời tiến trình con sing-box một cách an toàn."""

    def __init__(self, binary_path: str | Path | None = None) -> None:
        self.binary_path = self._resolve_binary(binary_path)
        self._process: Optional[subprocess.Popen[str]] = None
        self.active_node_name: Optional[str] = None
        atexit.register(self.stop)

    @staticmethod
    def _resolve_binary(custom_path: str | Path | None) -> Path:
        if custom_path:
            return Path(custom_path)
        exe_name = "sing-box.exe" if platform.system() == "Windows" else "sing-box"
        base_dir = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
        local_bin = base_dir / "bin" / exe_name
        if local_bin.exists():
            return local_bin
        cwd_bin = Path.cwd() / "bin" / exe_name
        if cwd_bin.exists():
            return cwd_bin
        in_path = shutil.which(exe_name)
        if in_path:
            return Path(in_path)
        return local_bin

    @property
    def is_running(self) -> bool:
        return self._process is not None and self._process.poll() is None

    def start(self, config_path: str | Path = "config.json", node_name: str | None = None) -> None:
        if self.is_running:
            self.stop()

        if not is_admin():
            raise CoreManagerError(
                "Cần chạy ứng dụng với quyền Administrator (Windows) hoặc sudo (macOS/Linux) để khởi tạo card mạng ảo TUN."
            )

        cfg = Path(config_path)
        if not cfg.exists():
            raise CoreManagerError(f"Không tìm thấy tệp cấu hình: {cfg}")
        if not self.binary_path.exists():
            raise CoreManagerError(f"Không tìm thấy tệp thực thi sing-box tại: {self.binary_path}")

        creation_flags = subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0
        try:
            self._process = subprocess.Popen(
                [str(self.binary_path), "run", "-c", str(cfg)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=creation_flags,
            )
            time.sleep(0.45)
            if self._process.poll() is not None:
                err_out = (self._process.stderr.read() if self._process.stderr else "").strip()
                self._process = None
                raise CoreManagerError(f"sing-box dừng đột ngột khi khởi động: {err_out or 'Không rõ nguyên nhân'}")
            self.active_node_name = node_name
        except OSError as exc:
            self._process = None
            raise CoreManagerError(f"Lỗi hệ điều hành khi chạy sing-box: {exc}") from exc

    def stop(self) -> None:
        self.active_node_name = None
        if not self._process:
            return
        proc = self._process
        self._process = None
        try:
            if proc.poll() is None:
                if platform.system() == "Windows":
                    proc.terminate()
                else:
                    proc.send_signal(signal.SIGTERM)
                proc.wait(timeout=4.0)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=2.0)
        except Exception:
            pass
`,
  },
  {
    id: 'stage-4-main-ui',
    stage: 'Giai đoạn 4',
    filename: 'main_ui.py',
    title: 'Desktop Client Interface (CustomTkinter + Auto Bridge)',
    summary:
      'Giao diện desktop 1-click connect đọc thẳng profiles.json xuất từ web, đồng thời mở sẵn Local Bridge (127.0.0.1:17890) để bạn có thể bật/tắt VPN thật từ cả app desktop lẫn trình duyệt.',
    code: `"""
Giai đoạn 4: Desktop UI Client (main_ui.py)
Giao diện CustomTkinter Dark Mode đọc trực tiếp profiles.json xuất từ PingGate Web
và tự động bật Local Bridge (127.0.0.1:17890) chạy song song.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any, Dict, List

import customtkinter as ctk

from config_builder import (
    DEFAULT_BYPASS_PROCESSES,
    DEFAULT_GAME_DOMAINS,
    DEFAULT_GAME_PROCESSES,
    build_singbox_config,
    write_config_file,
)
from core_manager import CoreManagerError, SingBoxCoreManager, measure_tcp_ping
from local_bridge import start_bridge_in_background
from parser import ProxyParseError, parse_proxy_uri

PROFILES_FILE = Path("profiles.json")
CONFIG_FILE = Path("config.json")


class PingGateApp(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("green")

        self.title("PingGate — Game Network Optimizer")
        self.geometry("780x560")
        self.minsize(700, 500)

        self.core = SingBoxCoreManager()
        self.bridge_server = start_bridge_in_background(self.core, CONFIG_FILE)

        self.data = self._load_profiles()
        self.nodes: List[Dict[str, Any]] = self.data["nodes"]
        self.routing: Dict[str, Any] = self.data["routing"]
        self.active_node_id: str | None = self.data.get("activeNodeId")
        if not self.active_node_id and self.nodes:
            self.active_node_id = self.nodes[0].get("id")

        self.split_mode_var = ctk.BooleanVar(value=self.routing.get("mode", "split") == "split")

        self._build_layout()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _load_profiles(self) -> Dict[str, Any]:
        default_data: Dict[str, Any] = {
            "version": 1,
            "activeNodeId": None,
            "nodes": [],
            "routing": {
                "mode": "split",
                "games": [],
                "customProcesses": [],
                "customDomains": [],
                "bypassProcesses": list(DEFAULT_BYPASS_PROCESSES),
                "tun": {"stack": "system", "mtu": 9000},
            },
        }
        if not PROFILES_FILE.exists():
            return default_data
        try:
            raw = json.loads(PROFILES_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict) and isinstance(raw.get("nodes"), list):
                default_data.update(raw)
                return default_data
            if isinstance(raw, list):
                default_data["nodes"] = raw
                return default_data
        except Exception:
            pass
        return default_data

    def _save_profiles(self) -> None:
        self.routing["mode"] = "split" if self.split_mode_var.get() else "global"
        payload = {
            "version": 1,
            "activeNodeId": self.active_node_id,
            "nodes": self.nodes,
            "routing": self.routing,
        }
        PROFILES_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    def _get_active_node(self) -> Dict[str, Any] | None:
        for node in self.nodes:
            if node.get("id") == self.active_node_id:
                return node
        return self.nodes[0] if self.nodes else None

    def _collect_targets(self) -> tuple[List[str], List[str]]:
        processes = list(self.routing.get("customProcesses", []))
        domains = list(self.routing.get("customDomains", []))
        for game in self.routing.get("games", []):
            if game.get("enabled"):
                processes.extend(game.get("processes", []))
                domains.extend(game.get("domains", []))
        if not processes:
            processes = list(DEFAULT_GAME_PROCESSES)
        if not domains:
            domains = list(DEFAULT_GAME_DOMAINS)
        return processes, domains

    def _build_layout(self) -> None:
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=24, pady=(20, 10))
        ctk.CTkLabel(header, text="PingGate Desktop", font=("Plus Jakarta Sans", 22, "bold")).pack(side="left")

        self.mode_switch = ctk.CTkSwitch(
            header,
            text="Chỉ định tuyến riêng Game (Split-Tunneling)",
            variable=self.split_mode_var,
            command=self._save_profiles,
        )
        self.mode_switch.pack(side="right")

        center = ctk.CTkFrame(self, corner_radius=12)
        center.pack(fill="x", padx=24, pady=10)

        self.status_label = ctk.CTkLabel(center, text="Chưa kết nối", font=("Plus Jakarta Sans", 16, "bold"))
        self.status_label.pack(pady=(18, 4))

        ctk.CTkLabel(
            center,
            text="Local Bridge đang chạy tại http://127.0.0.1:17890 (có thể điều khiển trực tiếp từ web)",
            font=("Plus Jakarta Sans", 11),
            text_color="#94A3B8",
        ).pack(pady=(0, 8))

        self.connect_btn = ctk.CTkButton(
            center,
            text="Bật tối ưu mạng Game",
            width=230,
            height=48,
            font=("Plus Jakarta Sans", 15, "bold"),
            command=self._toggle_connection,
        )
        self.connect_btn.pack(pady=(4, 18))

        import_row = ctk.CTkFrame(self, fg_color="transparent")
        import_row.pack(fill="x", padx=24, pady=(8, 6))
        self.uri_entry = ctk.CTkEntry(
            import_row,
            placeholder_text="Dán link cấu hình vless://, trojan://, vmess:// hoặc ss:// ...",
        )
        self.uri_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        ctk.CTkButton(import_row, text="Thêm Node", width=110, command=self._add_node).pack(side="left", padx=(0, 6))
        ctk.CTkButton(import_row, text="Đo Ping thật", width=110, command=self._test_all_pings).pack(side="left")

        self.feedback_label = ctk.CTkLabel(self, text="", text_color="#94A3B8")
        self.feedback_label.pack(anchor="w", padx=26)

        self.node_list_frame = ctk.CTkScrollableFrame(self, height=220)
        self.node_list_frame.pack(fill="both", expand=True, padx=24, pady=(6, 20))
        self._render_nodes()

    def _render_nodes(self) -> None:
        for widget in self.node_list_frame.winfo_children():
            widget.destroy()
        active = self._get_active_node()
        active_id = active.get("id") if active else None
        for idx, item in enumerate(self.nodes):
            row = ctk.CTkFrame(self.node_list_frame)
            row.pack(fill="x", pady=4, padx=4)
            ping_val = item.get("latencyMs")
            ping_text = f"{ping_val} ms" if isinstance(ping_val, (int, float)) else "Chưa đo"
            outbound = item.get("outbound", {})
            proto = str(outbound.get("type", "proxy")).upper()
            label = f"{item.get('name', 'Node')}  ·  {proto}  ·  {ping_text}"
            is_selected = item.get("id") == active_id
            btn = ctk.CTkButton(
                row,
                text=label,
                anchor="w",
                fg_color="#065F46" if is_selected else "#1E293B",
                command=lambda nid=item.get("id"): self._select_node(nid),
            )
            btn.pack(side="left", fill="x", expand=True, padx=(4, 6), pady=4)
            ctk.CTkButton(
                row,
                text="Xóa",
                width=60,
                fg_color="#7F1D1D",
                command=lambda i=idx: self._delete_node(i),
            ).pack(side="right", padx=4, pady=4)

    def _select_node(self, node_id: str | None) -> None:
        self.active_node_id = node_id
        self._save_profiles()
        self._render_nodes()

    def _delete_node(self, idx: int) -> None:
        if 0 <= idx < len(self.nodes):
            removed = self.nodes.pop(idx)
            if removed.get("id") == self.active_node_id:
                self.active_node_id = self.nodes[0].get("id") if self.nodes else None
            self._save_profiles()
            self._render_nodes()

    def _add_node(self) -> None:
        raw = self.uri_entry.get().strip()
        try:
            name, outbound = parse_proxy_uri(raw)
        except ProxyParseError as exc:
            self.feedback_label.configure(text=str(exc), text_color="#F87171")
            return

        new_id = f"node-{len(self.nodes) + 1}-{outbound['server_port']}"
        self.nodes.insert(0, {"id": new_id, "name": name, "rawUri": raw, "outbound": outbound, "latencyMs": None})
        self.active_node_id = new_id
        self._save_profiles()
        self.uri_entry.delete(0, "end")
        self.feedback_label.configure(text=f"Đã thêm node: {name}", text_color="#34D399")
        self._render_nodes()

    def _test_all_pings(self) -> None:
        def worker() -> None:
            for item in self.nodes:
                out = item.get("outbound", {})
                item["latencyMs"] = measure_tcp_ping(str(out.get("server", "")), int(out.get("server_port", 443)))
            self._save_profiles()
            self.after(0, self._render_nodes)
            self.after(0, lambda: self.feedback_label.configure(text="Đã hoàn tất đo TCP Ping thực tế.", text_color="#34D399"))

        self.feedback_label.configure(text="Đang đo TCP Ping thực tế tới từng máy chủ...", text_color="#94A3B8")
        threading.Thread(target=worker, daemon=True).start()

    def _toggle_connection(self) -> None:
        if self.core.is_running:
            self.core.stop()
            self.status_label.configure(text="Đã ngắt kết nối")
            self.connect_btn.configure(text="Bật tối ưu mạng Game")
            return

        active = self._get_active_node()
        if not active:
            self.feedback_label.configure(text="Vui lòng thêm và chọn ít nhất một Node trước.", text_color="#F87171")
            return

        try:
            processes, domains = self._collect_targets()
            tun_cfg = self.routing.get("tun", {})
            cfg = build_singbox_config(
                active["outbound"],
                split_tunnel=self.split_mode_var.get(),
                game_processes=processes,
                game_domains=domains,
                bypass_processes=self.routing.get("bypassProcesses", DEFAULT_BYPASS_PROCESSES),
                tun_stack=str(tun_cfg.get("stack", "system")),
                mtu=int(tun_cfg.get("mtu", 9000)),
            )
            write_config_file(cfg, CONFIG_FILE)
            self.core.start(CONFIG_FILE, node_name=active.get("name"))
            self.status_label.configure(text=f"Đang kết nối thật: {active.get('name')}")
            self.connect_btn.configure(text="Ngắt kết nối")
            self.feedback_label.configure(text="TUN interface đã khởi tạo thành công.", text_color="#34D399")
        except (CoreManagerError, RuntimeError) as exc:
            self.feedback_label.configure(text=str(exc), text_color="#F87171")

    def _on_close(self) -> None:
        self.core.stop()
        if self.bridge_server:
            self.bridge_server.shutdown()
        self.destroy()


if __name__ == "__main__":
    app = PingGateApp()
    app.mainloop()
`,
  },
  {
    id: 'stage-5-local-bridge',
    stage: 'Cầu nối Web ↔ PC',
    filename: 'local_bridge.py',
    title: 'Local Agent HTTP Bridge (127.0.0.1:17890)',
    summary:
      'Chạy ngầm cục bộ trên 127.0.0.1:17890 bằng thư viện chuẩn Python — cho phép nút Bật/Tắt và Đo Ping trên giao diện Web điều khiển sing-box THẬT ngay trên máy tính.',
    code: `"""
Cầu nối cục bộ: Local Agent HTTP Bridge (local_bridge.py)
Lắng nghe duy nhất trên 127.0.0.1:17890 để giao diện Web PingGate có thể
bật/tắt sing-box thật và đo TCP Ping thật ngay trên máy tính của bạn.
"""

from __future__ import annotations

import json
import platform
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Optional

from config_builder import write_config_file
from core_manager import CoreManagerError, SingBoxCoreManager, is_admin, measure_tcp_ping

BRIDGE_HOST = "127.0.0.1"
BRIDGE_PORT = 17890


def _make_handler(core: SingBoxCoreManager, config_path: Path):
    class BridgeHandler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
            return

        def _send_json(self, status: int, payload: Dict[str, Any]) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self) -> None:
            self._send_json(200, {"ok": True})

        def do_GET(self) -> None:
            if self.path == "/health":
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "running": core.is_running,
                        "isAdmin": is_admin(),
                        "platform": platform.system(),
                        "singBoxFound": core.binary_path.exists(),
                        "activeNodeName": core.active_node_name,
                    },
                )
                return
            self._send_json(404, {"ok": False, "error": "Not found"})

        def do_POST(self) -> None:
            length = int(self.headers.get("Content-Length", "0") or 0)
            raw_body = self.rfile.read(length) if length > 0 else b"{}"
            try:
                data = json.loads(raw_body.decode("utf-8"))
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "JSON không hợp lệ."})
                return

            if self.path == "/connect":
                cfg = data.get("config")
                node_name = data.get("nodeName")
                if not isinstance(cfg, dict):
                    self._send_json(400, {"ok": False, "error": "Thiếu cấu hình sing-box config."})
                    return
                try:
                    write_config_file(cfg, config_path)
                    core.start(config_path, node_name=node_name)
                    self._send_json(200, {"ok": True, "message": "Đã bật card mạng ảo TUN qua sing-box."})
                except (CoreManagerError, RuntimeError) as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                return

            if self.path == "/disconnect":
                core.stop()
                self._send_json(200, {"ok": True, "message": "Đã dừng sing-box và khôi phục mạng mặc định."})
                return

            if self.path == "/ping":
                host = str(data.get("host", "")).strip()
                port = int(data.get("port", 443) or 443)
                if not host:
                    self._send_json(400, {"ok": False, "error": "Thiếu địa chỉ host để đo ping."})
                    return
                latency = measure_tcp_ping(host, port)
                self._send_json(200, {"ok": True, "latencyMs": latency})
                return

            self._send_json(404, {"ok": False, "error": "Not found"})

    return BridgeHandler


def start_bridge_in_background(
    core: SingBoxCoreManager,
    config_path: Path = Path("config.json"),
) -> Optional[ThreadingHTTPServer]:
    try:
        server = ThreadingHTTPServer((BRIDGE_HOST, BRIDGE_PORT), _make_handler(core, config_path))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server
    except OSError:
        return None


if __name__ == "__main__":
    manager = SingBoxCoreManager()
    srv = ThreadingHTTPServer((BRIDGE_HOST, BRIDGE_PORT), _make_handler(manager, Path("config.json")))
    print(f"[PingGate] Local Bridge dang lang nghe tai http://{BRIDGE_HOST}:{BRIDGE_PORT}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        manager.stop()
        srv.shutdown()
`,
  },
];

export function buildDesktopBundleFiles(
  profiles: AppProfilesData,
  activeNode: ProxyNode | null,
  platform: 'all' | 'windows' | 'macos' = 'all',
): ZipFileEntry[] {
  const prefix =
    platform === 'windows'
      ? 'PingGate-Windows/'
      : platform === 'macos'
        ? 'PingGate-macOS/'
        : 'PingGate-Desktop/';
  const configJson = formatSingBoxConfigJson(activeNode, profiles.routing);
  const profilesJson = JSON.stringify(profiles, null, 2);

  const entries: ZipFileEntry[] = [];

  if (platform === 'all' || platform === 'windows') {
    entries.push(
      {
        name: `${prefix}PingGate-Windows.bat`,
        content: WINDOWS_ONE_CLICK_BAT.replace(/\r?\n/g, '\r\n'),
        unixPermissions: 0o100755,
      },
      {
        name: `${prefix}build_exe.bat`,
        content: BUILD_EXE_BAT.replace(/\r?\n/g, '\r\n'),
        unixPermissions: 0o100755,
      },
    );
  }

  if (platform === 'all' || platform === 'macos') {
    entries.push({
      name: `${prefix}PingGate-macOS.command`,
      content: MACOS_ONE_CLICK_SH,
      unixPermissions: 0o100755,
    });
  }

  entries.push(
    {
      name: `${prefix}requirements.txt`,
      content: 'customtkinter>=5.2.2\n',
    },
    {
      name: `${prefix}README.txt`,
      content: README_TXT,
    },
    {
      name: `${prefix}config.json`,
      content: configJson,
    },
    {
      name: `${prefix}profiles.json`,
      content: profilesJson,
    },
  );

  for (const mod of PYTHON_MODULES) {
    entries.push({
      name: `${prefix}${mod.filename}`,
      content: mod.code,
    });
  }

  return entries;
}
