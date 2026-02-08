# Mission Control API Test Commands

Base URL: `https://fortunate-bat-669.convex.site`

## 1. Sync Objectives

```bash
curl -X POST https://fortunate-bat-669.convex.site/objectives/sync \
  -H "Content-Type: application/json" \
  -d '{
    "objectives": [
      {
        "objectiveId": "OBJ-001",
        "title": "Launch SaaS MVP",
        "description": "Deploy and validate core SaaS platform",
        "status": "active",
        "progress": 35,
        "priority": "P0",
        "targetDate": "2026-03-01"
      },
      {
        "objectiveId": "OBJ-002",
        "title": "Mission Control v2",
        "description": "Build planner dashboard with real-time sync",
        "status": "active",
        "progress": 60,
        "priority": "P1"
      }
    ]
  }'
```

Expected response:
```json
{"success":true,"created":2,"updated":0,"objectives":["OBJ-001","OBJ-002"]}
```

## 2. Sync Projects

```bash
curl -X POST https://fortunate-bat-669.convex.site/projects/sync \
  -H "Content-Type: application/json" \
  -d '{
    "projects": [
      {
        "projectId": "PROJ-MC",
        "name": "Mission Control",
        "description": "Agent coordination dashboard",
        "objectiveId": "OBJ-002",
        "status": "active"
      },
      {
        "projectId": "PROJ-SAAS",
        "name": "SaaS Platform",
        "description": "Multi-tenant SaaS core",
        "objectiveId": "OBJ-001",
        "status": "active"
      }
    ]
  }'
```

Expected response:
```json
{"success":true,"created":2,"updated":0,"projects":["PROJ-MC","PROJ-SAAS"]}
```

## 3. Sync Planner State

```bash
curl -X POST https://fortunate-bat-669.convex.site/planner/sync \
  -H "Content-Type: application/json" \
  -d '{
    "status": "running",
    "lastRun": "2026-02-08T12:30:00Z",
    "iterationCount": 42,
    "costToday": 2.50,
    "costResetDate": "2026-02-08",
    "currentObjective": "OBJ-002",
    "nextTask": "SAAS-SPEC-002",
    "waitingApproval": [
      {
        "taskId": "DEPLOY-001",
        "reason": "Production deployment requires approval"
      }
    ]
  }'
```

Expected response:
```json
{"success":true,"action":"created"}
```

## 4. Update Agent Status

```bash
# Set agent to active
curl -X POST https://fortunate-bat-669.convex.site/agents/status \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "coder",
    "status": "active",
    "currentTask": "SAAS-SPEC-001"
  }'

# Set agent to idle
curl -X POST https://fortunate-bat-669.convex.site/agents/status \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "analyst",
    "status": "idle"
  }'

# Set agent to blocked
curl -X POST https://fortunate-bat-669.convex.site/agents/status \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "architect",
    "status": "blocked"
  }'
```

Expected response:
```json
{"success":true,"agentName":"Coder","status":"active"}
```

## 5. Update Task Status (existing endpoint)

```bash
curl -X POST https://fortunate-bat-669.convex.site/tasks/update \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "SAAS-SPEC-001",
    "status": "in_progress",
    "assignee": "analyst"
  }'
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Status codes:
- `200` - Success
- `400` - Bad request (missing/invalid fields)
- `404` - Resource not found
- `500` - Internal server error
