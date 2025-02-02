# Bidding Game

A real-time bidding game where players join a room and bid points based on oral answers. Each player starts with **100 points**. When a player submits a bid, the host (room creator) evaluates the bid as **correct** or **incorrect**:

- **Correct Answer:** The player gains points equal to the bid (doubling their bid).
- **Incorrect Answer:** The player loses the bid amount.

When a player’s points drop to **0 or below**, they are marked as **eliminated** and cannot continue playing. Once all but one player are eliminated, the server broadcasts a **winner event** to all connected clients.

> **Note:**  
> - The host is not displayed as a contestant; only joining players receive points and appear in the player list.  
> - This project uses an in-memory store for room and player data, which is suitable for a demo or proof of concept. For production, consider adding a persistent data store and additional error handling and security.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)
- [License](#license)

## Features

- **Room Creation and Join:**  
  The host creates a room and shares a unique room code. Players join using that room code.
  
- **Real-Time Communication:**  
  Uses Socket.IO for live updates (e.g., room status, bid submissions, and winner announcements).

- **Bidding Logic:**  
  - Players start with 100 points.
  - Correct bids add points (double the bid).
  - Incorrect bids subtract points.
  - Players are marked as eliminated when points reach 0 or below.
  
- **Winner Declaration:**  
  When only one non-eliminated player remains, the system broadcasts a winner announcement to all clients.

## Tech Stack

- **Backend:**  
  - Node.js
  - Express
  - Socket.IO
  - CORS

- **Frontend:**  
  - React
  - Socket.IO Client

## Installation

### Backend Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/bidding-game.git
   cd bidding-game/server
   ```

2. **Initialize the project and install dependencies:**

   ```bash
   npm init -y
   npm install express socket.io cors
   ```

3. **Run the backend server:**

   ```bash
   node server.js
   ```

   The server will listen on port **5000** (adjustable in the code).

### Frontend Setup

1. **Navigate to the frontend directory** (assuming you have created the React app within the same repository):

   ```bash
   cd ../client
   ```

2. **Install dependencies:**

   ```bash
   npm install socket.io-client
   ```

3. **Run the development server:**

   ```bash
   npm start
   ```

   The app will open in your default browser at [http://localhost:3000](http://localhost:3000).

## Usage

1. **Creating a Room:**
   - Open the app in your browser.
   - Click **"Create Room"** and enter your name (you will be the host).
   - A room code will be generated and displayed.

2. **Joining a Room:**
   - Other players click **"Join Room"** and enter their name along with the room code.
   - Each player starts with **100 points**.

3. **Starting a Round and Bidding:**
   - The host clicks **"Start Round"**. No question is entered because the question is asked orally.
   - Players submit their bid amounts based on their oral responses.
   - The host then evaluates each bid as **Correct** or **Incorrect**.

4. **Game Outcome:**
   - If a player answers correctly, they gain points equal to the bid.
   - If a player answers incorrectly, they lose the bid amount.
   - Players with 0 or fewer points are eliminated.
   - When only one player remains, a winner alert is broadcast to all connected clients.

## Project Structure

```
bidding-game/
├── server/
│   ├── server.js         # Express/Socket.IO backend
│   └── package.json
└── client/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── CreateRoom.js
    │   │   ├── JoinRoom.js
    │   │   └── GameRoom.js
    │   ├── App.js
    │   ├── index.js
    │   └── socket.js      # Socket.IO client instance
    └── package.json
```

## Future Improvements

- **Persistence:**  
  Integrate a database (e.g., MongoDB or PostgreSQL) to persist room and player data.

- **Security Enhancements:**  
  Add proper authentication and input validation.

- **User Interface Improvements:**  
  Enhance the UI/UX with better design and notifications.

- **Scalability:**  
  Use a message broker (e.g., Redis) for scaling real-time communication.

## License

This project is licensed under the MIT License.

---

Feel free to contribute, raise issues, or suggest enhancements!
