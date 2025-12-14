# API Migration Guide - Google AI to Qiniu Cloud

## 迁移说明 (Migration Notes)

本项目已从 Google Generative AI API 迁移到七牛云 AI API。

This project has been migrated from Google Generative AI API to Qiniu Cloud AI API.

## 主要变更 (Key Changes)

### 1. 依赖包更新 (Dependency Updates)

**之前 (Before):**
```json
"@google/genai": "^1.33.0"
```

**现在 (Now):**
```json
"openai": "^6.10.0"
```

### 2. 环境变量 (Environment Variables)

**之前 (Before):**
```bash
GEMINI_API_KEY=your_gemini_api_key
API_KEY=your_api_key
```

**现在 (Now):**
```bash
QINIU_API_KEY=your_qiniu_api_key          # 主要密钥
QINIU_API_BASE_URL=https://api.qnaigc.com/v1  # 可选
QINIU_TEXT_MODEL=deepseek-v3               # 可选
```

**向后兼容 (Backward Compatibility):**
系统会按以下顺序查找 API 密钥：
1. `QINIU_API_KEY`
2. `GEMINI_API_KEY`
3. `API_KEY`

### 3. API 接口变更 (API Interface Changes)

**之前 (Before):**
```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: { parts: [...] }
});
```

**现在 (Now):**
```typescript
import OpenAI from "openai";

const ai = new OpenAI({
  apiKey,
  baseURL: "https://api.qnaigc.com/v1",
  dangerouslyAllowBrowser: true
});
const response = await ai.chat.completions.create({
  model: "deepseek-v3",
  messages: [...]
});
```

### 4. 音频分析功能 (Audio Analysis)

**格式变更 (Format Changes):**

之前使用 Google 的 `inlineData` 格式：
```typescript
{
  inlineData: {
    mimeType: 'audio/wav',
    data: base64Audio
  }
}
```

现在使用 OpenAI 兼容的 `input_audio` 格式：
```typescript
{
  type: "input_audio",
  input_audio: {
    data: base64Audio,
    format: "wav"
  }
}
```

## 迁移步骤 (Migration Steps)

如果你正在从旧版本升级：

1. **更新依赖包:**
   ```bash
   npm install
   ```

2. **创建新的环境配置文件:**
   ```bash
   cp .env.example .env.local
   ```

3. **配置七牛云 API 密钥:**
   编辑 `.env.local` 文件，添加你的七牛云 API 密钥：
   ```bash
   QINIU_API_KEY=your_qiniu_api_key_here
   ```

4. **（可选）自定义模型:**
   如果需要使用不同的模型，可以设置：
   ```bash
   QINIU_TEXT_MODEL=your_preferred_model
   ```

5. **重启开发服务器:**
   ```bash
   npm run dev
   ```

## 功能对比 (Feature Comparison)

| 功能 | Google AI API | Qiniu Cloud API |
|------|---------------|-----------------|
| 音频分析 | ✅ 支持 | ✅ 支持 |
| Base64 输入 | ✅ 支持 | ✅ 支持 |
| 自定义提示词 | ✅ 支持 | ✅ 支持 |
| 流式输出 | ✅ 支持 | ✅ 支持 |
| 浏览器环境 | ✅ 支持 | ✅ 支持 |

## 注意事项 (Notes)

1. **API 密钥安全性**: 请确保不要将 `.env.local` 文件提交到版本控制系统
2. **模型选择**: 默认使用 `deepseek-v3` 模型，如需更换请查看七牛云文档
3. **成本控制**: 不同模型的定价可能不同，请注意控制使用成本
4. **浏览器支持**: 代码中使用了 `dangerouslyAllowBrowser: true`，仅用于开发环境

## 参考文档 (Documentation)

- 七牛云 AI API 文档: https://developer.qiniu.com/
- OpenAI API 兼容文档: https://platform.openai.com/docs/api-reference
- 项目 README: [README.md](./README.md)

## 技术支持 (Support)

如遇到问题，请参考：
1. 检查 API 密钥是否正确配置
2. 查看浏览器控制台的错误信息
3. 确认网络连接正常
4. 验证七牛云账户状态和额度
