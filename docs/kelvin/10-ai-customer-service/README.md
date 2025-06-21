# 第十章：AI 智能客服系統

## 章節概述
本章節詳細介紹 Tickeasy 系統的 AI 智能客服功能，包括 OpenAI API 整合、知識庫建構、語義搜尋實作，以及智能回覆生成機制。

## 目錄
1. [OpenAI API 整合](./01-openai-integration.md)
2. [知識庫系統設計](./02-knowledge-base.md)
3. [語義搜尋實作](./03-semantic-search.md)
4. [智能回覆生成](./04-smart-reply.md)
5. [對話管理系統](./05-conversation-management.md)

## 技術架構

```
AI 客服系統
├── OpenAI 服務層
│   ├── GPT-4 對話生成
│   ├── Embedding 向量化
│   └── 文本分析處理
├── 知識庫系統
│   ├── 向量資料庫
│   ├── 語義搜尋引擎
│   └── 知識內容管理
├── 對話管理
│   ├── 會話狀態追蹤
│   ├── 上下文管理
│   └── 多輪對話支援
└── 智能路由
    ├── 意圖識別
    ├── 實體抽取
    └── 回應生成
```

## 系統功能特點

### 1. 自然語言理解
- ✅ 用戶意圖識別
- ✅ 實體抽取與分析
- ✅ 情感分析
- ✅ 多輪對話理解

### 2. 知識庫檢索
- ✅ 向量相似度搜尋
- ✅ 混合搜尋策略
- ✅ 實時知識更新
- ✅ 多語言支援

### 3. 智能回覆生成
- ✅ 上下文感知回覆
- ✅ 個性化回應
- ✅ 多樣化回答模式
- ✅ 安全性過濾

## OpenAI 服務整合

### 服務類別設計
```typescript
// services/openaiService.ts
export class OpenAIService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });
  }
  
  /**
   * 生成文本嵌入向量
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('生成嵌入向量失敗:', error);
      throw new Error('嵌入向量生成失敗');
    }
  }
  
  /**
   * 智能回覆生成
   */
  async generateSmartReply(
    messages: ChatMessage[],
    context: string,
    userQuery: string
  ): Promise<string> {
    try {
      const systemPrompt = `
        你是 Tickeasy 票務系統的智能客服助手。
        請根據以下知識庫內容和對話歷史，為用戶提供準確、友善的回答。
        
        知識庫內容：
        ${context}
        
        回答準則：
        1. 回答要準確且有用
        2. 語氣要友善且專業
        3. 如果不確定答案，請誠實告知
        4. 引導用戶使用系統功能
        5. 使用繁體中文回答
      `;
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.isUser ? 'user' as const : 'assistant' as const,
            content: msg.content
          })),
          { role: 'user', content: userQuery }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      return completion.choices[0].message.content || '抱歉，我無法處理您的問題。';
    } catch (error) {
      console.error('生成智能回覆失敗:', error);
      throw new Error('智能回覆生成失敗');
    }
  }
}
```

## 知識庫系統設計

### 資料模型
```typescript
// models/support-knowledge-base.ts
@Entity('support_knowledge_base')
export class SupportKnowledgeBase extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  title: string;
  
  @Column('text')
  content: string;
  
  @Column()
  category: string;
  
  @Column('json')
  tags: string[];
  
  @Column('vector', { nullable: true })
  embedding: number[];
  
  @Column({ default: true })
  isActive: boolean;
  
  @Column({ default: 0 })
  priority: number;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 知識庫管理服務
```typescript
// services/knowledge-base-service.ts
export class KnowledgeBaseService {
  private openaiService: OpenAIService;
  
  constructor() {
    this.openaiService = new OpenAIService();
  }
  
  /**
   * 新增知識條目並生成嵌入向量
   */
  async addKnowledgeItem(data: CreateKnowledgeItemDto): Promise<SupportKnowledgeBase> {
    try {
      // 生成嵌入向量
      const embedding = await this.openaiService.generateEmbedding(
        `${data.title} ${data.content}`
      );
      
      const knowledgeItem = await SupportKnowledgeBase.create({
        ...data,
        embedding
      }).save();
      
      return knowledgeItem;
    } catch (error) {
      console.error('新增知識條目失敗:', error);
      throw new Error('新增知識條目失敗');
    }
  }
  
  /**
   * 向量相似度搜尋
   */
  async searchSimilarKnowledge(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<SupportKnowledgeBase[]> {
    try {
      // 生成查詢向量
      const queryEmbedding = await this.openaiService.generateEmbedding(query);
      
      // 使用餘弦相似度搜尋
      const results = await AppDataSource
        .createQueryBuilder(SupportKnowledgeBase, 'kb')
        .select([
          'kb.*',
          '1 - (kb.embedding <=> :queryVector) as similarity'
        ])
        .where('kb.isActive = true')
        .andWhere('1 - (kb.embedding <=> :queryVector) > :threshold')
        .orderBy('similarity', 'DESC')
        .limit(limit)
        .setParameters({
          queryVector: JSON.stringify(queryEmbedding),
          threshold
        })
        .getRawMany();
      
      return results;
    } catch (error) {
      console.error('知識庫搜尋失敗:', error);
      throw new Error('知識庫搜尋失敗');
    }
  }
}
```

## 語義搜尋引擎

### 搜尋策略
```typescript
// services/semantic-search-service.ts
export class SemanticSearchService {
  private knowledgeBaseService: KnowledgeBaseService;
  
  constructor() {
    this.knowledgeBaseService = new KnowledgeBaseService();
  }
  
  /**
   * 混合搜尋策略
   */
  async hybridSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      vectorWeight = 0.7,
      keywordWeight = 0.3,
      limit = 10,
      category
    } = options;
    
    try {
      // 1. 向量搜尋
      const vectorResults = await this.knowledgeBaseService
        .searchSimilarKnowledge(query, limit);
      
      // 2. 關鍵字搜尋
      const keywordResults = await this.keywordSearch(query, limit, category);
      
      // 3. 合併和重新排序
      const hybridResults = this.combineResults(
        vectorResults,
        keywordResults,
        vectorWeight,
        keywordWeight
      );
      
      return hybridResults.slice(0, limit);
    } catch (error) {
      console.error('混合搜尋失敗:', error);
      throw new Error('搜尋失敗');
    }
  }
  
  /**
   * 關鍵字搜尋
   */
  private async keywordSearch(
    query: string,
    limit: number,
    category?: string
  ): Promise<SupportKnowledgeBase[]> {
    const queryBuilder = AppDataSource
      .createQueryBuilder(SupportKnowledgeBase, 'kb')
      .where('kb.isActive = true')
      .andWhere(
        new Brackets(qb => {
          qb.where('kb.title ILIKE :query', { query: `%${query}%` })
            .orWhere('kb.content ILIKE :query', { query: `%${query}%` })
            .orWhere('kb.tags::text ILIKE :query', { query: `%${query}%` });
        })
      );
    
    if (category) {
      queryBuilder.andWhere('kb.category = :category', { category });
    }
    
    return await queryBuilder
      .orderBy('kb.priority', 'DESC')
      .addOrderBy('kb.updatedAt', 'DESC')
      .limit(limit)
      .getMany();
  }
}
```

## 智能回覆系統

### 對話管理
```typescript
// services/smart-reply-service.ts
export class SmartReplyService {
  private openaiService: OpenAIService;
  private semanticSearchService: SemanticSearchService;
  
  constructor() {
    this.openaiService = new OpenAIService();
    this.semanticSearchService = new SemanticSearchService();
  }
  
  /**
   * 生成智能回覆
   */
  async generateReply(
    sessionId: string,
    userMessage: string,
    userId?: string
  ): Promise<SmartReplyResult> {
    try {
      // 1. 獲取對話歷史
      const conversationHistory = await this.getConversationHistory(sessionId);
      
      // 2. 搜尋相關知識
      const relevantKnowledge = await this.semanticSearchService
        .hybridSearch(userMessage);
      
      // 3. 構建上下文
      const context = this.buildContext(relevantKnowledge);
      
      // 4. 生成回覆
      const reply = await this.openaiService.generateSmartReply(
        conversationHistory,
        context,
        userMessage
      );
      
      // 5. 儲存對話記錄
      await this.saveConversation(sessionId, userMessage, reply, userId);
      
      return {
        reply,
        confidence: this.calculateConfidence(relevantKnowledge),
        suggestedActions: this.extractSuggestedActions(reply),
        relatedTopics: this.getRelatedTopics(relevantKnowledge)
      };
    } catch (error) {
      console.error('生成智能回覆失敗:', error);
      throw new Error('智能回覆生成失敗');
    }
  }
  
  /**
   * 意圖識別
   */
  async identifyIntent(message: string): Promise<IntentResult> {
    const intents = [
      { name: 'ticket_inquiry', keywords: ['票', '購票', '票價', '座位'] },
      { name: 'concert_info', keywords: ['演唱會', '表演', '時間', '地點'] },
      { name: 'order_status', keywords: ['訂單', '購買', '付款', '確認'] },
      { name: 'refund_request', keywords: ['退票', '退款', '取消', '退費'] },
      { name: 'technical_support', keywords: ['無法', '錯誤', '問題', '故障'] }
    ];
    
    const scores = intents.map(intent => {
      const score = intent.keywords.reduce((acc, keyword) => {
        return acc + (message.includes(keyword) ? 1 : 0);
      }, 0) / intent.keywords.length;
      
      return { intent: intent.name, score };
    });
    
    const topIntent = scores.reduce((max, current) => 
      current.score > max.score ? current : max
    );
    
    return {
      intent: topIntent.intent,
      confidence: topIntent.score,
      entities: await this.extractEntities(message)
    };
  }
}
```

## 對話會話管理

### 會話狀態追蹤
```typescript
// models/support-session.ts
@Entity('support_sessions')
export class SupportSession extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @ManyToOne(() => User, { nullable: true })
  user: User;
  
  @Column({ nullable: true })
  userId: string;
  
  @Column('json')
  context: any;
  
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE
  })
  status: SessionStatus;
  
  @Column({ nullable: true })
  assignedAgent: string;
  
  @OneToMany(() => SupportMessage, message => message.session)
  messages: SupportMessage[];
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}

export enum SessionStatus {
  ACTIVE = 'active',
  WAITING = 'waiting',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}
```

## API 端點設計

### 智能客服 API
```typescript
// routes/smart-reply.ts
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;
    const userId = req.user?.userId;
    
    const smartReplyService = new SmartReplyService();
    const result = await smartReplyService.generateReply(
      sessionId,
      message,
      userId
    );
    
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/:sessionId/history', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const messages = await SupportMessage.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });
    
    res.json({
      status: 'success',
      data: messages.reverse()
    });
  } catch (error) {
    next(error);
  }
});
```

## 效能優化策略

### 1. 向量快取
```typescript
// 向量快取管理
class VectorCache {
  private cache = new Map<string, number[]>();
  private readonly maxSize = 1000;
  
  get(text: string): number[] | undefined {
    return this.cache.get(text);
  }
  
  set(text: string, vector: number[]): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(text, vector);
  }
}
```

### 2. 回應快取
```typescript
// 智能回覆快取
class ReplyCache {
  private redis: Redis;
  private readonly TTL = 3600; // 1小時
  
  async get(key: string): Promise<string | null> {
    return await this.redis.get(`reply:${key}`);
  }
  
  async set(key: string, reply: string): Promise<void> {
    await this.redis.setex(`reply:${key}`, this.TTL, reply);
  }
}
```

## 監控與分析

### 1. 對話品質監控
- 用戶滿意度評分
- 回覆準確性統計
- 回應時間監控
- 未解決問題追蹤

### 2. 知識庫優化
- 搜尋命中率分析
- 知識內容更新頻率
- 用戶反饋收集
- 自動化內容建議

### 3. 系統效能監控
- API 回應時間
- OpenAI API 使用量
- 資料庫查詢效能
- 錯誤率統計

## 最佳實務總結

### 1. 提示工程
- ✅ 清晰的系統角色定義
- ✅ 具體的回答準則
- ✅ 上下文感知提示
- ✅ 安全性過濾機制

### 2. 知識管理
- ✅ 結構化知識組織
- ✅ 定期知識更新
- ✅ 多層級分類系統
- ✅ 版本控制管理

### 3. 對話體驗
- ✅ 自然流暢的對話
- ✅ 個性化回應
- ✅ 多輪對話支援
- ✅ 優雅的錯誤處理

### 4. 技術架構
- ✅ 可擴展的微服務設計
- ✅ 高效的向量搜尋
- ✅ 智能快取策略
- ✅ 全面的監控體系 