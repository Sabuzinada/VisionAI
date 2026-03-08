# VisionAI - Real-Time AI Object Detection

A real-time AI-powered object detection system built with React, TensorFlow.js, and OpenAI GPT-4o Vision. Detects objects via webcam or uploaded images with hand gesture recognition.

## Features

- **Fast Detection (COCO-SSD):** Real-time object detection with bounding boxes for 80 common object types
- **AI Vision Scan (GPT-4o):** Comprehensive detection of thousands of objects including glasses, guitars, game controllers, instruments, and more
- **Hand Gesture Recognition:** Detects thumbs up, peace sign, OK sign, rock on, shaka, and 20+ gestures with emoji display
- **Scene Analysis:** AI-generated scene descriptions
- **Detection History:** Saves detections locally in your browser (localStorage)
- **Dark Neon Theme:** Futuristic dark UI with cyan neon accents

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Vite
- **Detection:** TensorFlow.js + COCO-SSD (client-side), OpenAI GPT-4o Vision (server-side)
- **Deployment:** Vercel (serverless functions for API)
- **Storage:** localStorage (no database required)

## Prerequisites

- Node.js 18+ installed
- An OpenAI API key with GPT-4o access ([get one here](https://platform.openai.com/api-keys))

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/visionai.git
cd visionai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** The AI Vision Scan feature requires the Vercel serverless functions. For local development, you can use the Vercel CLI:
>
> ```bash
> npm i -g vercel
> vercel dev
> ```

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - VisionAI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/visionai.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `visionai` repository
4. In the **Environment Variables** section, add:
   - `OPENAI_API_KEY` = your OpenAI API key
5. Click **Deploy**

That's it! Your VisionAI app will be live at `https://your-project.vercel.app`

## Project Structure

```
visionai/
├── api/                    # Vercel serverless functions
│   ├── vision.ts           # GPT-4o Vision object detection endpoint
│   └── describe.ts         # Scene description endpoint
├── src/
│   ├── components/
│   │   └── Navbar.tsx      # Navigation bar
│   ├── hooks/
│   │   └── useLocalStorage.ts  # Detection history (localStorage)
│   ├── pages/
│   │   ├── Home.tsx        # Landing page
│   │   ├── Detect.tsx      # Live webcam detection
│   │   ├── UploadAnalysis.tsx  # Image upload detection
│   │   └── History.tsx     # Detection history
│   ├── App.tsx             # Routes
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles + theme
├── vercel.json             # Vercel configuration
├── vite.config.ts          # Vite configuration
├── .env.example            # Environment variables template
└── package.json
```

## How It Works

1. **Fast Detection:** Uses TensorFlow.js COCO-SSD model running entirely in the browser. Detects 80 common objects in real-time with bounding boxes.

2. **AI Vision Scan:** Captures the current frame/image and sends it to the `/api/vision` serverless function, which calls OpenAI's GPT-4o Vision API to identify thousands of objects and hand gestures.

3. **History:** Detection results are saved to localStorage (max 50 records). No server or database required.

## API Costs

The AI Vision Scan uses OpenAI's GPT-4o Vision API. Typical costs:
- Each scan: ~$0.01-0.03 depending on image size
- Fast Detection (COCO-SSD) is completely free (runs in browser)

## License

MIT
