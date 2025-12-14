<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1GsuxEhHHlJIMTDRCkfQjU_2xr6QPU3Vr

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Set your Qiniu Cloud API key in `.env.local`:
     ```
     QINIU_API_KEY=your_qiniu_api_key_here
     ```
   - (Optional) Customize other settings:
     ```
     QINIU_API_BASE_URL=https://api.qnaigc.com/v1
     QINIU_TEXT_MODEL=deepseek-v3
     ```

3. Run the app:
   ```bash
   npm run dev
   ```

## API Configuration

This app uses **Qiniu Cloud AI API** (七牛云 AI API) through an OpenAI-compatible interface.

### Environment Variables

- `QINIU_API_KEY` - Your Qiniu Cloud API key (required)
- `QINIU_API_BASE_URL` - API endpoint (default: `https://api.qnaigc.com/v1`)
- `QINIU_TEXT_MODEL` - Model to use for audio analysis (default: `deepseek-v3`)

### Legacy Support

For backward compatibility, the app also supports:
- `GEMINI_API_KEY` - Will be used if `QINIU_API_KEY` is not set
- `API_KEY` - Will be used as final fallback
