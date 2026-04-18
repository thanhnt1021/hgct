#!/bin/bash
# Claude Code Telegram Notification Hook
# Events:
#   UserPromptSubmit           → save start time (silent)
#   PreToolUse(AskUserQuestion) → "Wait for Answers"
#   Notification(permission_prompt) → "Permission needed"
#   Stop                       → "Task completed" + duration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/telegram_config.env"

# Skip if not configured
[ -z "${CHAT_ID:-}" ] && exit 0
[ -z "${BOT_TOKEN:-}" ] && exit 0

INPUT=$(cat)
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
PROJECT=$(basename "${CWD:-unknown}")
HOST=$(hostname)

TMPDIR="/tmp/claude_hooks"
mkdir -p "$TMPDIR"
TMPFILE="$TMPDIR/${SESSION_ID}"

send_telegram() {
  local MSG="$1"
  local ARGS=(-s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"
              --data-urlencode "text=${MSG}"
              -d "chat_id=${CHAT_ID}"
              -d "parse_mode=HTML")
  if [ -n "${TELEGRAM_THREAD_ID:-}" ]; then
    ARGS+=(-d "message_thread_id=${TELEGRAM_THREAD_ID}")
  fi
  curl "${ARGS[@]}" > /dev/null 2>&1 || true
}

format_elapsed() {
  local SECS=$1
  local M=$((SECS / 60))
  local S=$((SECS % 60))
  if [ "$M" -gt 0 ]; then echo "${M}p ${S}s"; else echo "${S}s"; fi
}

case "$EVENT" in
  UserPromptSubmit)
    PROMPT=$(echo "$INPUT" | jq -r '.prompt // "unknown"')
    echo "$(date +%s)|${PROMPT}" > "$TMPFILE"
    ;;

  PreToolUse)
    TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
    if [ "$TOOL" = "AskUserQuestion" ]; then
      QUESTION=$(echo "$INPUT" | jq -r '.tool_input.questions[0].question // "Interactive question"')
      [ ${#QUESTION} -gt 200 ] && QUESTION="${QUESTION:0:200}..."

      TIME_STR=""
      if [ -f "$TMPFILE" ]; then
        IFS='|' read -r START_TIME _ < "$TMPFILE"
        TIME_STR=$(format_elapsed $(( $(date +%s) - START_TIME )))
      fi

      MSG="<b>[Claude Code]</b> Wait for Answers
<b>Host:</b> ${HOST}
<b>Project:</b> ${PROJECT}${TIME_STR:+
<b>Elapsed:</b> ${TIME_STR}}
<b>Question:</b> ${QUESTION}"
      send_telegram "$MSG"
    fi
    ;;

  Notification)
    NTYPE=$(echo "$INPUT" | jq -r '.notification_type // empty')
    if [ "$NTYPE" = "permission_prompt" ]; then
      NMSG=$(echo "$INPUT" | jq -r '.message // "Permission needed"')
      [ ${#NMSG} -gt 200 ] && NMSG="${NMSG:0:200}..."

      TIME_STR=""
      if [ -f "$TMPFILE" ]; then
        IFS='|' read -r START_TIME _ < "$TMPFILE"
        TIME_STR=$(format_elapsed $(( $(date +%s) - START_TIME )))
      fi

      MSG="<b>[Claude Code]</b> Permission needed
<b>Host:</b> ${HOST}
<b>Project:</b> ${PROJECT}${TIME_STR:+
<b>Elapsed:</b> ${TIME_STR}}
<b>Detail:</b> ${NMSG}"
      send_telegram "$MSG"
    fi
    ;;

  Stop)
    if [ -f "$TMPFILE" ]; then
      IFS='|' read -r START_TIME PROMPT < "$TMPFILE"
      DURATION=$(( $(date +%s) - START_TIME ))

      if [ "$DURATION" -lt "${MIN_DURATION:-3}" ]; then
        rm -f "$TMPFILE"
        exit 0
      fi

      TIME_STR=$(format_elapsed "$DURATION")
      [ ${#PROMPT} -gt 150 ] && PROMPT="${PROMPT:0:150}..."

      MSG="<b>[Claude Code]</b> Task completed
<b>Host:</b> ${HOST}
<b>Project:</b> ${PROJECT}
<b>Duration:</b> ${TIME_STR}
<b>Task:</b> ${PROMPT}"
      send_telegram "$MSG"
      rm -f "$TMPFILE"
    fi
    ;;
esac

exit 0
