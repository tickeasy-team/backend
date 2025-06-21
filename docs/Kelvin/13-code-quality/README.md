# 第十三章：程式碼品質管理

## 章節概述
本章節詳細介紹 Tickeasy 專案的程式碼品質管理策略，包括 ESLint 配置、TypeScript 最佳實務、程式碼格式化、Git hooks 等工具和流程。

## 目錄
1. [ESLint 配置](./01-eslint-configuration.md)
2. [TypeScript 最佳實務](./02-typescript-best-practices.md)
3. [程式碼格式化](./03-code-formatting.md)
4. [Pre-commit Hooks](./04-pre-commit-hooks.md)
5. [程式碼審查指南](./05-code-review-guidelines.md)

## 核心工具
- **ESLint**: 程式碼檢查與風格統一
- **Prettier**: 程式碼格式化
- **Husky**: Git hooks 管理
- **lint-staged**: 預提交檢查
- **SonarQube**: 程式碼品質分析

## 學習目標
完成本章節後，您將能夠：
1. 配置完整的程式碼檢查規則
2. 建立統一的程式碼風格標準
3. 實作自動化程式碼品質檢查
4. 設定 Git hooks 防止低品質程式碼提交
5. 建立有效的程式碼審查流程

## 程式碼品質標準

### 程式碼品質金字塔
```
       Clean Code
      /          \
     /  Readable  \
    /   Testable   \
   /   Maintainable \
  /____Performance___\
```

### 品質指標
- **可讀性**: 清楚的變數命名、適當的註解
- **可測試性**: 低耦合、高內聚的設計
- **可維護性**: 模組化、遵循 SOLID 原則
- **效能**: 優化的演算法、合理的資源使用
- **安全性**: 輸入驗證、權限控制

## ESLint 配置

### 1. ESLint 設定檔案
```javascript
// eslint.config.js
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // TypeScript 規則
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-const': 'error',
      
      // 一般規則
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // 程式碼風格
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      
      // 函數規則
      'max-len': ['error', { code: 100, ignoreComments: true }],
      'max-params': ['error', 4],
      'complexity': ['warn', 10],
      'max-depth': ['error', 4],
      
      // 命名規則
      'camelcase': ['error', { properties: 'always' }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'class',
          format: ['PascalCase']
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I']
        },
        {
          selector: 'enum',
          format: ['PascalCase']
        }
      ]
    }
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'max-len': 'off'
    }
  }
];
```

### 2. 自定義 ESLint 規則
```javascript
// custom-rules/no-direct-db-query.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct database queries in controllers',
      category: 'Best Practices'
    },
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'AppDataSource' &&
          context.getFilename().includes('controllers')
        ) {
          context.report({
            node,
            message: 'Direct database queries should not be used in controllers. Use services instead.'
          });
        }
      }
    };
  }
};
```

## TypeScript 最佳實務

### 1. 型別定義標準
```typescript
// 1. 使用具體型別而非 any
// ❌ 不好的做法
function processData(data: any): any {
  return data.someProperty;
}

// ✅ 好的做法
interface UserData {
  id: string;
  name: string;
  email: string;
}

function processUserData(data: UserData): string {
  return data.name;
}

// 2. 使用聯合型別而非字串
// ❌ 不好的做法
function setStatus(status: string): void {
  // ...
}

// ✅ 好的做法
type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

function setOrderStatus(status: OrderStatus): void {
  // ...
}

// 3. 使用泛型提高重用性
// ❌ 不好的做法
interface UserResponse {
  status: string;
  data: User;
}

interface OrderResponse {
  status: string;
  data: Order;
}

// ✅ 好的做法
interface ApiResponse<T> {
  status: 'success' | 'failed';
  data: T;
  message?: string;
}

type UserResponse = ApiResponse<User>;
type OrderResponse = ApiResponse<Order>;
```

### 2. 錯誤處理模式
```typescript
// 使用 Result 模式處理錯誤
type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

class UserService {
  async createUser(userData: CreateUserDto): Promise<Result<User, string>> {
    try {
      // 驗證資料
      const validation = this.validateUserData(userData);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // 檢查重複 email
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: 'Email already exists' };
      }

      // 建立用戶
      const user = await this.userRepository.save(userData);
      return { success: true, data: user };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
```

## 程式碼格式化

### 1. Prettier 配置
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "none",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 2. EditorConfig 設定
```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,ts,json}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

## Git Hooks 設定

### 1. Husky 配置
```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,js}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{json,md}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

### 2. Pre-commit Hook
```bash
#!/bin/sh
# .husky/pre-commit

echo "🔍 Running pre-commit checks..."

# 執行 lint-staged
npx lint-staged

# 執行測試
echo "🧪 Running tests..."
npm run test:unit

# 檢查 TypeScript 編譯
echo "🔧 Checking TypeScript compilation..."
npm run build

echo "✅ Pre-commit checks passed!"
```

### 3. Commit Message 檢查
```bash
#!/bin/sh
# .husky/commit-msg

echo "🔍 Checking commit message format..."

# 檢查 commit message 格式
npx commitlint --edit $1

# 自定義檢查規則
commit_regex='^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "❌ Invalid commit message format!"
    echo "Format: type(scope): description"
    echo "Example: feat(auth): add google oauth login"
    exit 1
fi

echo "✅ Commit message format is valid!"
```

## 程式碼審查指南

### 1. 審查清單
```markdown
## 程式碼審查清單

### 功能性
- [ ] 程式碼是否實作了所需的功能？
- [ ] 邊界條件是否被妥善處理？
- [ ] 錯誤處理是否完整？
- [ ] 測試覆蓋率是否足夠？

### 可讀性
- [ ] 變數和函數命名是否清楚？
- [ ] 註解是否必要且有用？
- [ ] 程式碼結構是否清晰？
- [ ] 是否遵循專案的命名慣例？

### 效能
- [ ] 是否有明顯的效能問題？
- [ ] 資料庫查詢是否最佳化？
- [ ] 是否有記憶體洩漏風險？

### 安全性
- [ ] 輸入驗證是否完整？
- [ ] 是否有 SQL 注入風險？
- [ ] 敏感資料是否被妥善保護？
- [ ] 權限控制是否正確？

### 維護性
- [ ] 程式碼是否遵循 SOLID 原則？
- [ ] 是否有重複的程式碼？
- [ ] 是否容易擴展和修改？
```

### 2. 審查流程
```typescript
// 程式碼審查流程自動化
class CodeReviewProcess {
  async createPullRequest(prData: PullRequestData): Promise<void> {
    // 1. 自動檢查
    await this.runAutomatedChecks(prData);
    
    // 2. 分配審查者
    const reviewers = await this.assignReviewers(prData);
    
    // 3. 建立審查任務
    await this.createReviewTasks(prData, reviewers);
    
    // 4. 發送通知
    await this.notifyReviewers(reviewers, prData);
  }
  
  private async runAutomatedChecks(prData: PullRequestData): Promise<void> {
    // 執行 ESLint
    const lintResults = await this.runLinter(prData.files);
    
    // 執行測試
    const testResults = await this.runTests(prData.branch);
    
    // 檢查測試覆蓋率
    const coverage = await this.checkCoverage(prData.branch);
    
    // 安全性掃描
    const securityScan = await this.runSecurityScan(prData.files);
    
    if (!this.allChecksPassed(lintResults, testResults, coverage, securityScan)) {
      throw new Error('Automated checks failed');
    }
  }
}
```

## 程式碼品質監控

### 1. SonarQube 整合
```yaml
# sonar-project.properties
sonar.projectKey=tickeasy-backend
sonar.projectName=Tickeasy Backend
sonar.projectVersion=1.0
sonar.sources=src
sonar.tests=src/__tests__
sonar.sourceEncoding=UTF-8
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=**/*.test.ts,**/node_modules/**
```

### 2. 品質閘門設定
```javascript
// quality-gate.js
const qualityGate = {
  coverage: {
    minimum: 80,
    threshold: 'error'
  },
  duplicatedLines: {
    maximum: 3,
    threshold: 'error'
  },
  maintainabilityRating: {
    maximum: 'A',
    threshold: 'error'
  },
  reliabilityRating: {
    maximum: 'A',
    threshold: 'error'
  },
  securityRating: {
    maximum: 'A',
    threshold: 'error'
  },
  codeSmells: {
    maximum: 10,
    threshold: 'warning'
  }
};
```

## 持續改進流程

### 1. 程式碼重構策略
```typescript
// 重構檢查清單
interface RefactoringChecklist {
  // 程式碼異味檢查
  longMethods: boolean;      // 方法過長
  largeClasses: boolean;     // 類別過大
  duplicatedCode: boolean;   // 重複程式碼
  deadCode: boolean;         // 死程式碼
  
  // 設計問題
  tightCoupling: boolean;    // 緊耦合
  lowCohesion: boolean;      // 低內聚
  violatesSRP: boolean;      // 違反單一責任原則
  
  // 效能問題
  inefficientQueries: boolean;  // 低效查詢
  memoryLeaks: boolean;         // 記憶體洩漏
  unnecessaryComputation: boolean; // 不必要的運算
}
```

### 2. 技術債務管理
```typescript
interface TechnicalDebt {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: number; // 小時
  impact: 'performance' | 'maintainability' | 'security' | 'scalability';
  createdAt: Date;
  resolvedAt?: Date;
  assignee?: string;
}

class TechnicalDebtTracker {
  async trackDebt(debt: TechnicalDebt): Promise<void> {
    await this.saveDebt(debt);
    await this.prioritizeDebts();
    await this.assignToSprint(debt);
  }
  
  async generateDebtReport(): Promise<DebtReport> {
    const debts = await this.getAllDebts();
    return {
      totalDebts: debts.length,
      totalEffort: debts.reduce((sum, debt) => sum + debt.estimatedEffort, 0),
      byseverity: this.groupBySeverity(debts),
      byImpact: this.groupByImpact(debts),
      trends: await this.calculateTrends()
    };
  }
}
```

## 核心特性
- ✅ 嚴格的 ESLint 規則配置
- ✅ TypeScript 最佳實務強制執行
- ✅ 自動化程式碼格式化
- ✅ Git hooks 品質檢查
- ✅ 結構化程式碼審查流程
- ✅ 持續品質監控
- ✅ 技術債務追蹤

## 最佳實務
1. **一致性**: 整個團隊遵循相同的編碼標準
2. **自動化**: 盡可能自動化品質檢查流程
3. **漸進式**: 逐步提高程式碼品質標準
4. **教育**: 定期分享最佳實務和重構技巧
5. **測量**: 追蹤和監控程式碼品質指標

## 相關檔案
- `eslint.config.js` - ESLint 配置
- `.prettierrc` - Prettier 配置
- `.husky/` - Git hooks 目錄
- `sonar-project.properties` - SonarQube 配置
- `tsconfig.json` - TypeScript 配置
- `.editorconfig` - 編輯器配置