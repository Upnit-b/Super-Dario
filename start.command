#!/bin/zsh
# Runs the same asset-only server as npm start. Closing Terminal stops this instance.
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  print -u2 'Nova Rift needs Node.js 24 or 26. Install Node.js, then launch again.'
  exit 1
fi
game_port=${PORT:-8642}
if [[ "$game_port" != <1-65535> ]]; then
  print -u2 'PORT must be an integer between 1 and 65535.'
  exit 1
fi
node scripts/server.mjs &
game_server_pid=$!
cleanup() {
  if kill -0 "$game_server_pid" 2>/dev/null; then
    kill "$game_server_pid"
    wait "$game_server_pid" || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for attempt in {1..40}; do
  if ! kill -0 "$game_server_pid" 2>/dev/null; then
    print -u2 "Could not start Nova Rift. Port $game_port may already be in use. Close its previous Terminal window and try again."
    exit 1
  fi
  if /usr/sbin/lsof -a -p "$game_server_pid" -iTCP:"$game_port" -sTCP:LISTEN -t >/dev/null &&
     curl --fail --silent --max-time 1 "http://127.0.0.1:$game_port/index.html" >/dev/null; then
    print "Nova Rift is running at http://localhost:$game_port"
    print 'Close this Terminal window or press Ctrl+C when finished.'
    open "http://localhost:$game_port/index.html"
    wait "$game_server_pid"
    exit 0
  fi
  sleep 0.1
done
print -u2 'The local server did not become ready. See the error above and try again.'
exit 1
