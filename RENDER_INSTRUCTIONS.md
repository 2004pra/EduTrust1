# Deploying EduTrust Credential Hub

This project is a **Decentralized Application (DApp)**. It has a unique architecture compared to traditional web apps:

1.  **Frontend (React/Vite):** This is the user interface. It is hosted on **Render**.
2.  **Backend (Smart Contracts):** This is the logic (Database + API). It is hosted on the **Monad Blockchain**.

## Why this is a "Whole Project" Deployment
Even though everything is in one folder, you are deploying to two different "worlds".

*   ✅ **Backend:** Your contracts are already deployed to Monad Testnet (see `DEPLOYMENT.md`).
*   🚀 **Frontend:** We are now deploying this to Render.

## How Render Works with this Repo
Render will use the `render.yaml` file (or your manual "Static Site" settings) to:
1.  **Run** `npm run build` (This creates the website files in `dist/`).
2.  **Publish** the `dist/` folder to the web.

You do **NOT** need a separate Node.js backend server on Render. The website talks directly to the Blockchain from the user's browser.

## Final Steps to Deploy
1.  **Git Push** your latest changes (I have already updated the code to connect to your deployed contracts).
2.  Go to Render Dashboard.
3.  Click **New +** -> **Blueprint** -> Select your repo.
    *   It will automatically detect the configuration.
    *   Click "Apply".
4.  OR: **New +** -> **Static Site** -> Select your repo.
    *   Build Command: `npm run build`
    *   Publish Directory: `dist`

Your app will be live and fully functional!
