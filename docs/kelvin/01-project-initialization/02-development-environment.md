# 開發環境建置

## 概述
本文檔說明如何建立 Tickeasy 票務系統後端開發環境，確保所有開發者擁有一致的開發體驗。

## 環境需求

### 系統需求
- **作業系統**: Windows 10+, macOS 12+, Ubuntu 20.04+
- **記憶體**: 8GB RAM 以上（推薦 16GB）
- **硬碟空間**: 10GB 可用空間

### 必要軟體

#### 1. Node.js
```bash
# 推薦使用 Node Version Manager (NVM)
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18.17.0
nvm use 18.17.0

# Windows 使用 nvm-windows
# 下載並安裝：https://github.com/coreybutler/nvm-windows
nvm install 18.17.0
nvm use 18.17.0
```

#### 2. PostgreSQL
```bash
# macOS 使用 Homebrew
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# 下載並安裝：https://www.postgresql.org/download/
```

#### 3. Git
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git

# Windows
# 下載並安裝：https://git-scm.com/download/win
```

#### 4. Docker & Docker Compose
```bash
# macOS
brew install --cask docker

# Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Windows
# 下載並安裝 Docker Desktop：https://www.docker.com/products/docker-desktop
```

## 開發工具設定

### 1. IDE 配置 - Visual Studio Code

#### 必要擴充套件
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

#### VSCode 設定
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.eslint.fixAll": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.tabSize": 2,
  "files.eol": "\n"
}
```

### 2. 終端機設定

#### Zsh 配置 (推薦)
```bash
# 安裝 Oh My Zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# 推薦外掛
plugins=(git node npm yarn docker-compose)
```

#### 實用別名
```bash
# 加入到 ~/.zshrc 或 ~/.bashrc
alias ll='ls -la'
alias gs='git status'
alias gp='git push'
alias gl='git pull'
alias gc='git commit'
alias gco='git checkout'
alias nrs='npm run start'
alias nrd='npm run dev'
alias nrt='npm run test'
```

## 專案環境設定

### 1. 環境變數設定
```bash
# 複製環境變數範本
cp .env.example .env

# 編輯環境變數
nano .env
```

### 2. 資料庫連線測試
```bash
# 使用 psql 測試連線
psql -h localhost -p 5432 -U postgres -d tickeasy

# 或使用 Node.js 腳本測試
npm run db:test
```

### 3. Redis 設定 (用於快取)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis

# Docker 方式
docker run -d -p 6379:6379 --name redis redis:alpine
```

## 專案啟動流程

### 1. 克隆專案
```bash
git clone https://github.com/your-org/tickeasy-backend.git
cd tickeasy-backend
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 資料庫初始化
```bash
# 運行遷移
npm run migration:run

# 填入種子資料
npm run seed:run
```

### 4. 啟動開發伺服器
```bash
npm run dev
```

### 5. 驗證安裝
```bash
# 檢查 API 健康狀態
curl http://localhost:3000/health

# 運行測試
npm test
```

## 除錯工具

### 1. 日誌查看
```bash
# 查看應用程式日誌
npm run logs

# 查看資料庫日誌
docker logs postgres-container
```

### 2. 資料庫管理工具
- **pgAdmin 4**: PostgreSQL 圖形化管理工具
- **DBeaver**: 通用資料庫管理工具
- **TablePlus**: macOS/Windows 資料庫客戶端

### 3. API 測試工具
- **Postman**: API 測試與文檔工具
- **Insomnia**: 輕量級 REST 客戶端
- **Thunder Client**: VSCode 擴充套件

## 效能監控

### 1. 本地監控
```bash
# 安裝監控工具
npm install -g pm2
npm install -g clinic

# 使用 PM2 監控
pm2 start ecosystem.config.js
pm2 monit
```

### 2. 記憶體分析
```bash
# 使用 Node.js 內建工具
node --inspect app.js

# 使用 Clinic.js
clinic doctor -- node app.js
```

## 常見問題解決

### 1. 端口衝突
```bash
# 查找占用端口的進程
lsof -i :3000
kill -9 <PID>
```

### 2. 權限問題
```bash
# macOS/Linux 修復 npm 權限
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### 3. 依賴衝突
```bash
# 清除快取並重新安裝
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 團隊開發規範

### 1. Git 工作流程
- 使用 Git Flow 分支策略
- 功能分支命名：`feature/ticket-123-description`
- 提交訊息格式：`type(scope): description`

### 2. 程式碼審查
- 所有變更必須通過 Pull Request
- 至少需要一位團隊成員審查
- 自動化測試必須通過

### 3. 文檔維護
- API 變更須更新文檔
- 重要功能需撰寫使用說明
- 定期更新 README 和 CHANGELOG

## 下一步
完成開發環境設定後，請參考：
- [專案初始化](./03-project-initialization.md)
- [依賴管理](./04-dependency-management.md) 