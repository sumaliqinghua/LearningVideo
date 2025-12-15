# 项目管理功能

## 功能概述

现在你可以将视频、字幕、笔记保存为一个完整的项目，并在以后重新加载。

## 浏览器支持

### ✅ 完全支持（推荐）
- **Chrome 86+**
- **Edge 86+**
- **Safari 15.2+**（macOS 和 iOS）

使用 File System Access API，可以直接将项目保存到文件夹。

### ⚠️ 降级支持
- **Firefox**
- **旧版本浏览器**

会自动使用 ZIP 下载模式。

---

## 使用方法

### 1. 保存项目（Save Project）

当你完成学习并记录了笔记后：

1. 点击页面右上角的 **"Save Project"** 按钮
2. 选择保存位置（一个文件夹）
3. 系统会自动创建以下文件结构：

```
your-video/
├── your-video.mp4              # 原视频（不会复制，需要手动放入）
├── your-video.srt              # 字幕文件
├── your-video.notes.json       # 笔记元数据
└── your-video.thumbnails/      # 缩略图文件夹
    ├── note_1702567890123.jpg
    ├── note_1702567890456.jpg
    └── note_1702567890789.jpg
```

**注意：** 
- 视频文件本身不会被复制（文件太大）
- 如果需要完整备份，请手动将视频文件复制到同一文件夹
- 保存时只会创建字幕、笔记和缩略图

---

### 2. 加载项目（Open Project）

要继续之前的学习：

1. 确保项目文件夹包含：
   - 视频文件（`.mp4`/`.webm`/`.mov`）
   - 笔记文件（`.notes.json`）
   - 缩略图文件夹（`.thumbnails/`）
   - （可选）字幕文件（`.srt`/`.vtt`）

2. 点击 **"Open Project"** 按钮
3. 选择项目文件夹
4. 所有内容会自动加载：
   - ✅ 视频
   - ✅ 字幕
   - ✅ 笔记
   - ✅ 缩略图

---

## 项目文件说明

### 1. 笔记文件（`.notes.json`）

```json
{
  "version": "1.0",
  "videoName": "react-tutorial.mp4",
  "videoDuration": 1234.5,
  "createdAt": "2025-12-14T15:25:55Z",
  "thumbnailsFolder": "react-tutorial.thumbnails",
  "notes": [
    {
      "id": "1702567890123",
      "timestamp": 45.6,
      "thumbnailPath": "note_1702567890123.jpg",
      "content": "**Key Point**: React hooks..."
    }
  ],
  "subtitles": [
    {
      "id": 0,
      "start": 0.0,
      "end": 5.5,
      "text": "Welcome to this tutorial..."
    }
  ]
}
```

### 2. 字幕文件（`.srt`）

标准 SRT 格式，可以用任何文本编辑器查看/编辑。

### 3. 缩略图

- 格式：JPEG
- 命名：`note_{笔记ID}.jpg`
- 可以用系统图片查看器查看

---

## 工作流程示例

### 场景一：学习新视频

1. **加载视频** → 点击播放器选择视频
2. **生成字幕** → 使用 "Recognize Subtitle" 或上传字幕
3. **记笔记** → 按 `M` 键捕获关键时刻
4. **保存项目** → 点击 "Save Project"
5. ✅ 完成！下次可以直接打开

### 场景二：继续学习

1. **打开项目** → 点击 "Open Project"，选择项目文件夹
2. **继续观看** → 所有进度、笔记、字幕自动恢复
3. **添加更多笔记**
4. **重新保存** → 覆盖之前的项目

### 场景三：备份和分享

1. **完整备份**：
   - 将整个项目文件夹复制到云盘/移动硬盘
   - 包含视频、字幕、笔记、缩略图

2. **分享笔记**：
   - 只分享 `.notes.json` 和 `.thumbnails/` 文件夹
   - 他人需要有相同的视频文件

---

## 高级功能

### 版本控制（Git）

项目文件夹可以用 Git 管理：

```bash
cd your-learning-videos/
git init
git add *.notes.json *.srt *.thumbnails/
git commit -m "Add notes for React tutorial"
```

**建议：**
- ✅ 添加 `.notes.json` 和 `.srt` 到 Git
- ✅ 添加 `.thumbnails/` 文件夹
- ❌ 不要添加视频文件（太大）

在 `.gitignore` 中添加：
```
*.mp4
*.webm
*.mov
```

### 批量管理

推荐的文件夹组织：

```
my-learning/
├── react-basics/
│   ├── video.mp4
│   ├── video.notes.json
│   └── video.thumbnails/
├── javascript-advanced/
│   ├── video.mp4
│   ├── video.notes.json
│   └── video.thumbnails/
└── python-tutorial/
    ├── video.mp4
    ├── video.notes.json
    └── video.thumbnails/
```

---

## 故障排除

### 问题：保存项目时提示权限错误

**解决方案：**
- 确保选择了有写入权限的文件夹
- 不要选择系统文件夹（如 `/System`、`/Applications`）

### 问题：加载项目时提示"Invalid project folder"

**解决方案：**
- 确保文件夹包含视频文件（`.mp4`/`.webm`/`.mov`）
- 确保文件夹包含笔记文件（`.notes.json`）

### 问题：缩略图无法显示

**解决方案：**
- 检查 `.thumbnails/` 文件夹是否存在
- 检查图片文件名是否与 `.notes.json` 中的 `thumbnailPath` 匹配

### 问题：Firefox 不支持

**解决方案：**
- 会自动使用 ZIP 下载模式
- 下载后需要手动解压
- 视频文件需要手动放入解压后的文件夹

---

## 技术细节

### Whisper 模型存储

**位置：** `~/.cache/huggingface/hub/`

- ✅ 模型是系统级缓存，跨所有项目共享
- ✅ 下载一次，永久使用
- ✅ 无需在项目中存储
- ✅ 服务器重启后无需重新下载

### 文件大小估算

| 内容 | 大小估算 |
|------|---------|
| 1小时视频（1080p） | ~500MB - 2GB |
| 字幕文件 | ~50KB - 200KB |
| 笔记元数据 | ~10KB - 50KB |
| 单个缩略图 | ~50KB - 200KB |
| 10个笔记项目 | ~1MB - 3MB |

**建议：**
- 视频文件较大，建议不要频繁复制
- 使用云盘同步时，可以只同步笔记和字幕
- 缩略图可以随笔记一起同步

---

## 快捷键

| 快捷键 | 功能 |
|-------|------|
| `M` | 捕获当前时刻（创建笔记） |
| `Space` | 播放/暂停 |

---

## 未来计划

- [ ] 支持多视频项目（播放列表）
- [ ] 自动同步到云端
- [ ] 笔记搜索功能
- [ ] 笔记导出为Markdown/PDF
- [ ] 标签和分类功能
