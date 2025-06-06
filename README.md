# Legacy Web App Scraper

This project reverse-engineers a legacy web application with no public API using Puppeteer and TypeScript. It automates login, fetches the list of users, and retrieves the currently authenticated user, saving the data to a formatted JSON file.

## 📂 Features

- Logs in to [challenge.sunvoy.com](https://challenge.sunvoy.com) using Puppeteer
- Reuses saved authentication cookies between runs
- Calls internal APIs to fetch:
  - List of users (`/api/users`)
  - Logged-in user info (`/settings`)
- Saves output as `users.json` with exactly 10 users
- Written in TypeScript
- Minimal dependencies

## 🛠 Tech Stack

- Node.js (v20.19.0)
- TypeScript
- Puppeteer

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ArjunNarzary/web-scraping.git
cd web-scraping
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the scripe

```bash
npm run start
```

## ✅ Expected Output

- It will contain:
  - 9 users from /api/users
  - 1 user from /api/users/me
