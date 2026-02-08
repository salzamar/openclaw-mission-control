#!/bin/bash
# Fix unassigned tasks in Mission Control
# Calls the /tasks/fix-unassigned endpoint to auto-assign agents based on task type

CONVEX_URL="${CONVEX_URL:-https://comfortable-puffin-140.convex.site}"

echo "🔧 Fixing unassigned tasks..."
echo "Endpoint: ${CONVEX_URL}/tasks/fix-unassigned"
echo ""

result=$(curl -s -X POST "${CONVEX_URL}/tasks/fix-unassigned" \
  -H "Content-Type: application/json")

if echo "$result" | grep -q '"success":true'; then
  total=$(echo "$result" | jq -r '.totalUnassigned // 0')
  fixed=$(echo "$result" | jq -r '.fixed // 0')
  
  echo "✅ Done!"
  echo "   Total unassigned tasks found: $total"
  echo "   Successfully assigned: $fixed"
  echo ""
  
  if [ "$total" -gt 0 ]; then
    echo "📋 Assignment details:"
    echo "$result" | jq -r '.results[] | "   • \(.title[0:50])... → \(.assignedTo // "NOT ASSIGNED")"'
  fi
else
  echo "❌ Error:"
  echo "$result" | jq -r '.error // "Unknown error"'
  exit 1
fi
