/**
 * MCP Service - Supabase MCP Server 包裝器
 * 用於在 Tickeasy 後端中與 MCP Server 通信
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export class MCPService extends EventEmitter {
  constructor() {
    super();
    this.mcpProcess = null;
    this.isConnected = false;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  /**
   * 啟動 MCP Server
   */
  async start() {
    if (this.mcpProcess) {
      console.log('🔄 MCP Server 已經在運行中');
      return;
    }

    console.log('🚀 啟動 Supabase MCP Server...');

    const env = {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN
    };

    if (!env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN === 'your_personal_access_token_here') {
      throw new Error('❌ 請設定有效的 SUPABASE_ACCESS_TOKEN');
    }

    this.mcpProcess = spawn('npx', [
      '-y',
      '@supabase/mcp-server-supabase@latest',
      '--read-only',
      `--project-ref=${process.env.SUPABASE_PROJECT_REF || 'cppeqosxwdgemmgbutnd'}`
    ], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.setupProcessHandlers();

    // 等待啟動完成
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP Server 啟動超時'));
      }, 30000); // 30秒超時

      this.once('connected', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      this.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * 設置進程處理器
   */
  setupProcessHandlers() {
    this.mcpProcess.stdout.on('data', (data) => {
      this.handleResponse(data.toString());
    });

    this.mcpProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString();
      console.error('🔴 MCP Error:', errorMsg);
      this.emit('error', new Error(errorMsg));
    });

    this.mcpProcess.on('close', (code) => {
      console.log(`🛑 MCP Server 已關閉，代碼: ${code}`);
      this.isConnected = false;
      this.mcpProcess = null;
      this.emit('disconnected');
    });

    this.mcpProcess.on('error', (error) => {
      console.error('❌ MCP Process Error:', error);
      this.emit('error', error);
    });

    // 發送初始化請求來確認連接
    setTimeout(() => {
      this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'Tickeasy Backend',
          version: '1.0.0'
        }
      }).then(() => {
        this.isConnected = true;
        console.log('✅ MCP Server 連接成功!');
        this.emit('connected');
      }).catch((error) => {
        console.error('❌ MCP 初始化失敗:', error);
        this.emit('error', error);
      });
    }, 2000);
  }

  /**
   * 處理來自 MCP Server 的回應
   */
  handleResponse(data) {
    const lines = data.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const response = JSON.parse(line);
        
        if (response.id && this.pendingRequests.has(response.id)) {
          const { resolve, reject } = this.pendingRequests.get(response.id);
          this.pendingRequests.delete(response.id);
          
          if (response.error) {
            reject(new Error(response.error.message || '未知的 MCP 錯誤'));
          } else {
            resolve(response.result || response);
          }
        }
      } catch (error) {
        console.warn('⚠️  無法解析 MCP 回應:', line);
      }
    }
  }

  /**
   * 發送請求到 MCP Server
   */
  async sendRequest(method, params = {}) {
    if (!this.mcpProcess) {
      throw new Error('MCP Server 未啟動');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      // 設定超時
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`請求超時: ${method}`));
        }
      }, 30000);

      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * 獲取可用工具列表
   */
  async getAvailableTools() {
    try {
      const result = await this.sendRequest('tools/list');
      return result.tools || [];
    } catch (error) {
      console.error('❌ 獲取工具列表失敗:', error);
      return [];
    }
  }

  /**
   * 執行 SQL 查詢
   */
  async executeSQL(query, params = []) {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'execute_sql',
        arguments: {
          query,
          params
        }
      });
      return result;
    } catch (error) {
      console.error('❌ SQL 查詢失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取表格結構
   */
  async getTableSchema(tableName) {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    try {
      return await this.executeSQL(query, [tableName]);
    } catch (error) {
      console.error(`❌ 獲取表格 ${tableName} 結構失敗:`, error);
      throw error;
    }
  }

  /**
   * 搜尋客服會話
   */
  async searchSupportSessions(filters = {}) {
    let query = `
      SELECT 
        ss.support_session_id,
        ss.session_type,
        ss.status,
        ss.priority,
        ss.created_at,
        u.name as user_name,
        COUNT(sm.support_message_id) as message_count
      FROM support_session ss
      LEFT JOIN "user" u ON ss.user_id = u.user_id
      LEFT JOIN support_message sm ON ss.support_session_id = sm.session_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND ss.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.sessionType) {
      paramCount++;
      query += ` AND ss.session_type = $${paramCount}`;
      params.push(filters.sessionType);
    }

    if (filters.fromDate) {
      paramCount++;
      query += ` AND ss.created_at >= $${paramCount}`;
      params.push(filters.fromDate);
    }

    query += `
      GROUP BY ss.support_session_id, u.name
      ORDER BY ss.created_at DESC
      LIMIT ${filters.limit || 50}
    `;

    try {
      return await this.executeSQL(query, params);
    } catch (error) {
      console.error('❌ 搜尋客服會話失敗:', error);
      throw error;
    }
  }

  /**
   * 搜尋 FAQ
   */
  async searchFAQ(keyword, categoryId = null) {
    let query = `
      SELECT 
        f.faq_id,
        f.question,
        f.answer,
        f.keywords,
        f.view_count,
        f.helpful_count,
        c.name as category_name
      FROM faq f
      LEFT JOIN faq_category c ON f.category_id = c.faq_category_id
      WHERE f.is_active = true
      AND (
        f.question ILIKE $1 
        OR f.answer ILIKE $1 
        OR $1 = ANY(f.keywords)
      )
    `;
    
    const params = [`%${keyword}%`];

    if (categoryId) {
      query += ` AND f.category_id = $2`;
      params.push(categoryId);
    }

    query += ` ORDER BY f.helpful_count DESC, f.view_count DESC LIMIT 10`;

    try {
      return await this.executeSQL(query, params);
    } catch (error) {
      console.error('❌ 搜尋 FAQ 失敗:', error);
      throw error;
    }
  }

  /**
   * 關閉 MCP Server
   */
  async stop() {
    if (this.mcpProcess) {
      console.log('🛑 關閉 MCP Server...');
      this.mcpProcess.kill();
      this.mcpProcess = null;
      this.isConnected = false;
    }
  }

  /**
   * 檢查連接狀態
   */
  isReady() {
    return this.isConnected && this.mcpProcess;
  }
}

// 創建單例實例
export const mcpService = new MCPService();

// 優雅關閉處理
process.on('SIGINT', async () => {
  console.log('🔄 正在關閉 MCP Service...');
  await mcpService.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 正在關閉 MCP Service...');
  await mcpService.stop();
  process.exit(0);
});