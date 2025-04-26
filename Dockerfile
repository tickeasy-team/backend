FROM node:18-alpine 

WORKDIR /app

# 先複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝所有依賴 (包括 devDependencies 以便編譯)
# 移除 --ignore-scripts 允許 bcrypt 等原生插件的 postinstall 腳本運行
RUN npm install

# 安裝 TypeScript 並全局安裝 (注意：全局安裝不是最佳實踐，但遵循您之前的修改)
RUN npm install -g typescript

# 複製 tsconfig.json
COPY tsconfig.json ./

# 複製所有源代碼
COPY . .

# 使用全局安裝的 tsc 進行編譯
RUN tsc --skipLibCheck

# 暴露端口
EXPOSE 3000

# 在這裡設置運行時環境變數
ENV NODE_ENV=production
# ENV PORT=3000 # PORT 通常由 Render 自動設置或在 CMD 中處理，可以不寫死

# 啟動應用
CMD ["node", "dist/bin/server.js"]