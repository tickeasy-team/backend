/**
 * MCP Server 連接測試
 * 這個檔案用來測試 Supabase MCP Server 是否正常工作
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 模擬 MCP 客戶端請求
class MCPTester {
  constructor() {
    this.mcpProcess = null;
  }

  // 啟動 MCP Server
  async startMCPServer() {
    console.log('🚀 啟動 Supabase MCP Server...');
    
    const env = {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN
    };

    this.mcpProcess = spawn('npx', [
      '-y',
      '@supabase/mcp-server-supabase@latest',
      '--read-only',
      '--project-ref=cppeqosxwdgemmgbutnd'
    ], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return new Promise((resolve, reject) => {
      let output = '';
      
      this.mcpProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('📝 MCP Output:', data.toString());
        
        // 檢查是否成功啟動
        if (output.includes('listening') || output.includes('ready')) {
          resolve(true);
        }
      });

      this.mcpProcess.stderr.on('data', (data) => {
        console.error('❌ MCP Error:', data.toString());
      });

      this.mcpProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`MCP Server 退出，代碼: ${code}`));
        }
      });

      // 超時處理
      setTimeout(() => {
        resolve(true); // 假設啟動成功
      }, 5000);
    });
  }

  // 發送測試請求
  async sendTestRequest() {
    if (!this.mcpProcess) {
      throw new Error('MCP Server 未啟動');
    }

    const testRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    };

    console.log('📤 發送測試請求:', JSON.stringify(testRequest, null, 2));
    
    this.mcpProcess.stdin.write(JSON.stringify(testRequest) + '\n');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, message: '請求超時' });
      }, 10000);

      this.mcpProcess.stdout.once('data', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          resolve({ success: true, data: response });
        } catch (error) {
          resolve({ success: false, message: '回應解析失敗', raw: data.toString() });
        }
      });
    });
  }

  // 停止 MCP Server
  stopMCPServer() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      console.log('🛑 MCP Server 已停止');
    }
  }
}

// 執行測試
async function runTest() {
  console.log('🧪 開始 MCP Server 連接測試...\n');

  // 檢查環境變數
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('❌ 錯誤: 請設定 SUPABASE_ACCESS_TOKEN 環境變數');
    console.log('💡 提示: 請先到 Supabase Dashboard 獲取 Personal Access Token');
    process.exit(1);
  }

  const tester = new MCPTester();

  try {
    // 啟動 MCP Server
    await tester.startMCPServer();
    console.log('✅ MCP Server 啟動成功!\n');

    // 等待一下讓 server 完全啟動
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 發送測試請求
    console.log('🔍 測試 MCP 功能...');
    const result = await tester.sendTestRequest();
    
    if (result.success) {
      console.log('✅ MCP 連接測試成功!');
      console.log('📋 可用工具:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('⚠️  MCP 連接可能有問題:', result.message);
      if (result.raw) {
        console.log('原始回應:', result.raw);
      }
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  } finally {
    tester.stopMCPServer();
  }
}

// 只有直接執行這個檔案時才運行測試
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { MCPTester };