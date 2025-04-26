# Git Flow

## Git Flow 設計方案

### 1. 分支策略

**主要分支**：
- `main`：生產環境代碼，穩定版本
- `develop`：開發環境代碼，最新功能整合

**輔助分支**：
- `feature/*`：新功能開發 (如 `feature/user-auth`)
- `bugfix/*`：修復開發中的 bug
- `hotfix/*`：修復生產環境緊急問題
- `release/*`：準備特定版本發布

### 2. 工作流程

1. 從 `develop` 建立功能分支：
   ```
   git checkout develop
   git pull
   git checkout -b feature/新功能名稱
   ```

2. 完成功能後合併回 `develop`：
   ```
   git checkout develop
   git pull
   git merge --no-ff feature/新功能名稱
   git push origin develop
   ```

3. 發布版本：
   ```
   git checkout develop
   git pull
   git checkout -b release/1.0.0
   # 進行最後修改和測試
   git checkout main
   git merge --no-ff release/1.0.0
   git tag -a v1.0.0 -m "版本1.0.0"
   git push --tags
   git checkout develop
   git merge --no-ff release/1.0.0
   ```

4. 處理生產環境緊急問題：
   ```
   git checkout main
   git pull
   git checkout -b hotfix/問題描述
   # 修復問題
   git checkout main
   git merge --no-ff hotfix/問題描述
   git tag -a v1.0.1 -m "修復版本1.0.1"
   git checkout develop
   git merge --no-ff hotfix/問題描述
   ```

### 3. 實踐練習步驟

1. 初始化專案：
   ```
   git checkout -b develop main
   git push -u origin develop
   ```

2. 模擬多人協作：
   ```
   # 開發者A
   git checkout develop
   git checkout -b feature/登入功能
   # 修改代碼
   git add .
   git commit -m "實現用戶登入功能"
   
   # 開發者B
   git checkout develop
   git checkout -b feature/註冊功能
   # 修改代碼
   git add .
   git commit -m "實現用戶註冊功能"
   ```

3. 合併功能並處理衝突：
   ```
   # 開發者A
   git checkout develop
   git pull
   git merge --no-ff feature/登入功能
   # 解決衝突如有
   git push origin develop
   
   # 開發者B
   git checkout develop
   git pull # 獲取A的更改
   git merge --no-ff feature/註冊功能
   # 解決衝突如有
   git push origin develop
   ```

4. 模擬版本發布：
   ```
   git checkout develop
   git checkout -b release/1.0.0
   # 最終調整
   git checkout main
   git merge --no-ff release/1.0.0
   git tag -a v1.0.0 -m "第一個正式版本"
   git push origin main --tags
   git checkout develop
   git merge --no-ff release/1.0.0
   git push origin develop
   ```

5. 使用 PR (Pull Request) 模式練習：
   - 在 GitHub/GitLab 上建立 PR
   - 指定代碼審核者
   - 通過評論討論代碼
   - 合併或拒絕 PR

建議使用 `.github/workflows` 添加 CI/CD 配置，自動執行測試和部署流程。
