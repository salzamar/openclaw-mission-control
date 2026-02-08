#!/bin/bash
# Bulk update tasks SAAS-SPEC-001 through SAAS-SPEC-014 to DONE

ENDPOINT="https://fortunate-bat-669.convex.site/tasks/update"

for i in $(seq -f "%03g" 1 14); do
  TASK_ID="SAAS-SPEC-$i"
  echo -n "Updating $TASK_ID... "
  
  RESULT=$(curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{\"taskId\": \"$TASK_ID\", \"status\": \"DONE\"}")
  
  SUCCESS=$(echo "$RESULT" | grep -o '"success":true' || echo "")
  if [ -n "$SUCCESS" ]; then
    echo "✓ Done"
  else
    ERROR=$(echo "$RESULT" | grep -o '"error":"[^"]*"' || echo "$RESULT")
    echo "✗ Failed: $ERROR"
  fi
done

echo ""
echo "Bulk update complete!"
