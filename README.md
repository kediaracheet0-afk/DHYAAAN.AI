# DHYAAN.AI - Immersive Sadhana Productivity

Ancient Indian wisdom meets modern productivity. DHYAAN.AI is a focused environment for your deep work, featuring a wise AI guide, Focus Guruji.

## 🚀 Deployment Instructions

### 1. Download the Code
- In AI Studio, go to the **Settings** menu (top right).
- Select **Export to ZIP** or **Export to GitHub**.

### 2. Push to GitHub
If you exported as a ZIP:
1. Initialize a new git repository: `git init`
2. Add all files: `git add .`
3. Commit: `git commit -m "Initial commit of DHYAAN.AI"`
4. Create a new repository on GitHub.
5. Link and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/dhyaan-ai.git
   git branch -M main
   git push -u origin main
   ```

### 3. Deploy to Netlify
1. Log in to [Netlify](https://www.netlify.com/).
2. Click **Add new site** > **Import an existing project**.
3. Select **GitHub** and choose your `dhyaan-ai` repository.
4. Configure the build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy site**.

### 🛠️ Environment Variables
For the AI Chatbot to work, you must set your Gemini API Key in Netlify:
1. Go to **Site configuration** > **Environment variables**.
2. Add a variable:
   - Key: `VITE_GEMINI_API_KEY`
   - Value: `YOUR_GEMINI_API_KEY`
3. Trigger a new deploy.

*Note: The app is configured with a Client-Side Fallback. When deployed to Netlify, it will automatically use `localStorage` to persist your tasks and sessions since the SQLite backend is only for local/server environments.*

## 🧘 Features
- **Dhyaan Timer**: Pomodoro-style focus sessions with ancient terminology.
- **Focus Guruji**: AI Sage trained on Indian Epics (Mahabharata, Ramayana) to guide your productivity.
- **Sankalpa Management**: Track your intentions and earn Karma Points.
- **Immersive Soundscapes**: Ambient audio for deep meditation and work.
- **Distraction Shield**: Visual reminders to stay focused on your Sadhana.

Namaste!
