# Bingo Application Test Cases

## Overview
This document provides comprehensive test case documentation for the Bingo application, covering both backend unit tests and frontend E2E scenarios.

## Backend Unit Tests (Jest)

### GameService Tests

#### Room Creation
- **TC-B001**: Should create room with name
  - **Input**: hostId='host1', name='Test Room'
  - **Expected**: Returns valid roomId, room stored with name
  
#### Player Management
- **TC-B002**: Should throw error if room not found
  - **Input**: Invalid roomId
  - **Expected**: Throws "Room not found"

- **TC-B003**: Should throw error if player not found
  - **Input**: Valid roomId, invalid playerId
  - **Expected**: Throws "Player not found"

#### Number Punching
- **TC-B004**: Should throw error if number not drawn
  - **Input**: Room with player, number on card but not drawn
  - **Expected**: Throws "Number not drawn yet"

- **TC-B005**: Should throw error if number not on card
  - **Input**: Room with player, drawn number not on player's card
  - **Expected**: Throws "Number not on card"

- **TC-B006**: Should return player if valid punch
  - **Input**: Valid roomId, playerId, number on card and drawn
  - **Expected**: Returns player object with correct ID

#### Bingo Detection
- **TC-B007**: Should detect bingo correctly
  - **Input**: Player with complete row marked
  - **Expected**: `isBingo=true`

- **TC-B008**: Should detect reach correctly
  - **Input**: Player with 4 of 5 in a row marked
  - **Expected**: `isReach=true`, `isBingo=false`

- **TC-B009**: Should count single reach correctly
  - **Input**: Player with one line having 4/5 marked
  - **Expected**: `reachCount=1`

- **TC-B010**: Should count double reach correctly
  - **Input**: Player with two lines having 4/5 each
  - **Expected**: `reachCount>=2`

---

## Frontend E2E Tests (Playwright)

###  Host Flow

#### Room Creation
- **TC-F001**: Create room with name
  - **Steps**:
    1. Navigate to /host
    2. Enter "Test Room" in room name input
    3. Click "CREATE ROOM"
  - **Expected**: Room created, displays room code and name

- **TC-F002**: Start game
  - **Steps**:
    1. Create room
    2. Wait for player to join
    3. Click "START GAME"
  - **Expected**: Status changes to PLAYING

#### Number Drawing
- **TC-F003**: Draw number with animation
  - **Steps**:
    1. Create and start game
    2. Click "DRAW NUMBER"
  - **Expected**: 2-second loading animation, number displayed

- **TC-F004**: View player stats
  - **Steps**:
    1. Game in progress
    2. Player reaches/bingos
  - **Expected**: Stats update showing reach/bingo count

---

### Player Flow

#### Joining Room
- **TC-F101**: Join room successfully
  - **Steps**:
    1. Navigate to /play/{roomId}
    2. Enter player name
    3. Click "JOIN PARTY"
  - **Expected**: Joined room, displays bingo card and room name

#### Number Punching
- **TC-F102**: Punch drawn number
  - **Steps**:
    1. Joined room
    2. Number drawn by host
    3. Click matching number on card
  - **Expected**: Number marked, confetti animation

- **TC-F103**: Cannot punch undrawn number
  - **Steps**:
    1. Joined room
    2. Click number not yet drawn
  - **Expected**: No effect, number not marked

#### Reach Detection
- **TC-F104**: Single reach notification
  - **Steps**:
    1. Punch numbers until 4/5 in one line
  - **Expected**: "REACH!" overlay shows for 3 seconds

- **TC-F105**: Double reach notification
  - **Steps**:
    1. Punch numbers until 4/5 in two lines
  - **Expected**: "DOUBLE REACH!" overlay shows

- **TC-F106**: Triple reach notification
  - **Steps**:
    1. Punch numbers until 4/5 in three lines
  - **Expected**: "TRIPLE REACH!" overlay shows

#### Bingo Detection
- **TC-F107**: Bingo notification
  - **Steps**:
    1. Complete full line
  - **Expected**: "BINGO!" overlay, confetti explosion

---

### Admin Flow

#### Admin Panel Access
- **TC-F201**: Access admin panel
  - **Steps**:
    1. Navigate to /admin/{roomId}
  - **Expected**: Admin panel loads with room stats

#### List View
- **TC-F202**: View player list
  - **Steps**:
    1. Access admin panel
    2. Ensure List View is selected
  - **Expected**: Shows all players with reach/bingo status

- **TC-F203**: List updates on player reach
  - **Steps**:
    1. Player achieves reach
  - **Expected**: Player marked with "REACH" badge

#### Grid View
- **TC-F204**: View player cards
  - **Steps**:
    1. Access admin panel
    2. Click "Grid View"
  - **Expected**: Shows all player bingo cards

- **TC-F205**: Grid shows drawn numbers
  - **Steps**:
    1. In grid view
    2. Host draws number
  - **Expected**: Drawn numbers highlighted on all cards

---

## Test Data

### Sample Room Configuration
```json
{
  "roomId": "ABC123",
  "name": "Test Room",
  "status": "WAITING",
  "hostId": "host-socket-id",
  "players": [],
  "numbersDrawn": []
}
```

### Sample Player
```json
{
  "id": "uuid-v4",
  "socketId": "socket-id",
  "name": "Test Player",
  "card": [[1,16,31,46,61], ...],
  "isReach": false,
  "isBingo": false
}
```

---

## Test Execution

### Backend Tests
```bash
cd packages/backend
npm test
```

**Current Status**: ✅ 10/10 tests passing

### E2E Tests
```bash
cd packages/frontend
npm run test:e2e
```

**Current Status**: ⏸️ Pending implementation

---

## Coverage Goals

- **Backend Unit Tests**: ≥80% code coverage
- **E2E Tests**: Cover all critical user paths
- **Regression Tests**: All existing features tested

## Notes

- All tests use deterministic data where possible
- E2E tests require both backend and frontend servers running
- Test isolation: Each test creates its own room/players
