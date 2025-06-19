/**
 * 執行資料庫 migration 腳本
 * 創建客服和知識庫所需的表格
 */

import { supabaseService } from './services/supabase-service.js';
import fs from 'fs';
import path from 'path';

async function runMigrations(): Promise<void> {
  console.log('🚀 開始執行資料庫 Migration...');
  
  try {
    // 1. 檢查 Supabase 連接
    console.log('🔗 檢查資料庫連接...');
    const client = supabaseService.getClient();
    
    // 測試基本連接
    const { data: testData, error: testError } = await client
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ 資料庫連接失敗:', testError.message);
      process.exit(1);
    }
    
    console.log('✅ 資料庫連接正常');

    // 2. 讀取 migration 文件
    const migrationPath = path.join(process.cwd(), 'migrations', '002-create-customer-service-tables-v2.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration 文件不存在:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 已讀取 Migration 文件');

    // 3. 執行 Migration
    console.log('🔨 開始執行 Migration...');
    console.log('⚠️  這可能需要幾分鐘時間...');
    
    const { data, error } = await client.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration 執行失敗:', error.message);
      
      // 嘗試分段執行
      console.log('🔄 嘗試分段執行 SQL...');
      const sqlStatements = migrationSQL
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0 && !statement.startsWith('--'));
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const [index, statement] of sqlStatements.entries()) {
        try {
          console.log(`📝 執行語句 ${index + 1}/${sqlStatements.length}`);
          
          const { error: stmtError } = await client.rpc('exec_sql', {
            sql: statement + ';'
          });
          
          if (stmtError) {
            console.warn(`⚠️  語句 ${index + 1} 失敗:`, stmtError.message);
            errorCount++;
          } else {
            successCount++;
          }
          
          // 避免過快執行
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (err: any) {
          console.warn(`⚠️  語句 ${index + 1} 異常:`, err.message);
          errorCount++;
        }
      }
      
      console.log(`📊 分段執行結果: 成功 ${successCount}, 失敗 ${errorCount}`);
      
      if (successCount === 0) {
        console.error('❌ 所有 SQL 語句都執行失敗');
        process.exit(1);
      }
    } else {
      console.log('✅ Migration 執行成功');
    }

    // 4. 驗證表格是否創建成功
    console.log('🔍 驗證表格創建...');
    
    const tablesToCheck = [
      'supportKnowledgeBase',
      'faqCategory', 
      'faq',
      'supportSession',
      'supportMessage'
    ];
    
    let createdTables = 0;
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await client
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (!error) {
          console.log(`✅ 表格 ${tableName} 創建成功`);
          createdTables++;
        } else {
          console.log(`❌ 表格 ${tableName} 不存在`);
        }
      } catch (err) {
        console.log(`❌ 表格 ${tableName} 檢查失敗`);
      }
    }

    // 5. 總結
    console.log('\\n' + '='.repeat(50));
    console.log('📊 Migration 執行結果');
    console.log('='.repeat(50));
    console.log(`✅ 成功創建表格: ${createdTables}/${tablesToCheck.length}`);
    
    if (createdTables >= 3) {
      console.log('🎉 Migration 執行完成！');
      console.log('✨ 現在可以執行知識庫初始化了');
      console.log('🚀 執行: npm run init:safe-kb');
    } else {
      console.log('⚠️  部分表格可能創建失敗');
      console.log('💡 建議手動檢查資料庫或聯繫管理員');
    }
    
    console.log('='.repeat(50));

  } catch (error: any) {
    console.error('💥 Migration 過程發生錯誤:', error);
    console.error('🔧 建議檢查:');
    console.error('   1. Supabase 權限設定');
    console.error('   2. 資料庫連接配置');
    console.error('   3. SQL 語法是否正確');
    process.exit(1);
  }
}

// 執行 Migration
async function run(): Promise<void> {
  console.log('📋 資料庫 Migration 工具');
  console.log('- 創建客服系統相關表格');
  console.log('- 包含知識庫、FAQ、會話等功能');
  console.log('- 適用於 Supabase PostgreSQL\\n');
  
  await runMigrations();
}

run().catch(console.error);
