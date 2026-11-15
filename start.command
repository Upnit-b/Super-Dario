#!/bin/zsh
# Runs Nova Rift locally. Closing this Terminal stops only this launcher's server.
set -eu
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  print -u2 'Nova Rift needs Python 3 to serve its local game files. Install Python 3, then launch again.'
  exit 1
fi
PORT=8642
python3 -m http.server "$PORT" --bind 127.0.0.1 &
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
    print -u2 "Could not start Nova Rift. Port $PORT may already be in use. Close its previous Terminal window and try again."
    exit 1
  fi
  if /usr/sbin/lsof -a -p "$game_server_pid" -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null &&
     curl --fail --silent --max-time 1 "http://127.0.0.1:$PORT/index.html" >/dev/null; then
    print "Nova Rift is running at http://localhost:$PORT"
    print 'Close this Terminal window or press Ctrl+C when finished.'
    open "http://localhost:$PORT/index.html"
    wait "$game_server_pid"
    exit 0
  fi
  sleep 0.1
done
print -u2 'The local server did not become ready. See the error above and try again.'
exit 1
