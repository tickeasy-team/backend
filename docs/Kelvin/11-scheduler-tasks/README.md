# 第十一章：排程任務系統

## 章節概述
本章節詳細介紹 Tickeasy 排程任務系統的設計與實作，包括自動化任務調度、訂單過期處理、郵件通知、資料清理等關鍵功能。

## 目錄
1. [Node Schedule 配置](./01-node-schedule.md)
2. [訂單過期處理](./02-order-expiration.md)
3. [郵件通知排程](./03-email-notifications.md)
4. [資料清理任務](./04-data-cleanup.md)
5. [系統健康監控](./05-health-monitoring.md)

## 核心技術
- **排程引擎**: node-schedule
- **任務隊列**: Redis + Bull Queue (可選)
- **郵件服務**: Nodemailer
- **監控系統**: 自定義健康檢查

## 學習目標
完成本章節後，您將能夠：
1. 設計可靠的任務排程系統
2. 實作訂單自動過期機制
3. 建立郵件通知系統
4. 開發系統維護任務
5. 監控排程任務執行狀態

## 排程任務架構

```typescript
interface ScheduledTask {
  id: string;                    // 任務 ID
  name: string;                  // 任務名稱
  description: string;           // 任務描述
  cronExpression: string;        // Cron 表達式
  isActive: boolean;             // 是否啟用
  lastRun?: Date;               // 最後執行時間
  nextRun?: Date;               // 下次執行時間
  executionCount: number;        // 執行次數
  failureCount: number;          // 失敗次數
  maxRetries: number;            // 最大重試次數
  timeout: number;               // 超時時間 (毫秒)
  createdAt: Date;
  updatedAt: Date;
}

interface TaskExecutionLog {
  id: string;                    // 日誌 ID
  taskId: string;                // 任務 ID
  startTime: Date;               // 開始時間
  endTime?: Date;                // 結束時間
  status: 'running' | 'completed' | 'failed' | 'timeout';
  result?: any;                  // 執行結果
  error?: string;                // 錯誤訊息
  executionTime?: number;        // 執行時間 (毫秒)
}
```

## 排程任務管理器

```typescript
import * as schedule from 'node-schedule';
import { EventEmitter } from 'events';

class TaskScheduler extends EventEmitter {
  private jobs = new Map<string, schedule.Job>();
  private tasks = new Map<string, ScheduledTask>();
  
  constructor() {
    super();
    this.initializeDefaultTasks();
  }
  
  // 註冊任務
  registerTask(task: ScheduledTask, handler: TaskHandler): void {
    this.tasks.set(task.id, task);
    
    if (task.isActive) {
      this.scheduleTask(task, handler);
    }
  }
  
  // 排程任務
  private scheduleTask(task: ScheduledTask, handler: TaskHandler): void {
    const job = schedule.scheduleJob(task.cronExpression, async () => {
      await this.executeTask(task, handler);
    });
    
    this.jobs.set(task.id, job);
    
    // 更新下次執行時間
    task.nextRun = job.nextInvocation();
    this.emit('taskScheduled', task);
  }
  
  // 執行任務
  private async executeTask(task: ScheduledTask, handler: TaskHandler): Promise<void> {
    const executionLog: TaskExecutionLog = {
      id: generateId(),
      taskId: task.id,
      startTime: new Date(),
      status: 'running'
    };
    
    this.emit('taskStarted', { task, executionLog });
    
    try {
      // 設定超時機制
      const result = await Promise.race([
        handler(task),
        this.createTimeoutPromise(task.timeout)
      ]);
      
      executionLog.endTime = new Date();
      executionLog.status = 'completed';
      executionLog.result = result;
      executionLog.executionTime = executionLog.endTime.getTime() - executionLog.startTime.getTime();
      
      // 更新任務統計
      task.lastRun = new Date();
      task.executionCount++;
      task.nextRun = this.jobs.get(task.id)?.nextInvocation();
      
      this.emit('taskCompleted', { task, executionLog });
      
    } catch (error) {
      executionLog.endTime = new Date();
      executionLog.status = error.message === 'Task timeout' ? 'timeout' : 'failed';
      executionLog.error = error.message;
      executionLog.executionTime = executionLog.endTime.getTime() - executionLog.startTime.getTime();
      
      task.failureCount++;
      
      this.emit('taskFailed', { task, executionLog, error });
      
      // 重試邏輯
      if (task.failureCount <= task.maxRetries) {
        setTimeout(() => {
          this.executeTask(task, handler);
        }, 5000 * task.failureCount); // 指數退避
      }
    }
    
    // 保存執行日誌
    await this.saveExecutionLog(executionLog);
  }
  
  // 建立超時 Promise
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), timeout);
    });
  }
}
```

## 預定義排程任務

### 1. 訂單過期處理任務
```typescript
class OrderExpirationTask {
  // 每分鐘檢查過期訂單
  static readonly CRON_EXPRESSION = '0 * * * * *'; // 每分鐘執行
  
  static async execute(): Promise<void> {
    const expiredOrders = await Order.find({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: LessThan(new Date())
      },
      relations: ['tickets']
    });
    
    for (const order of expiredOrders) {
      await AppDataSource.transaction(async manager => {
        // 1. 更新訂單狀態為過期
        await manager.update(Order, order.id, {
          status: OrderStatus.EXPIRED
        });
        
        // 2. 釋放票券庫存
        for (const ticket of order.tickets) {
          await manager.update(Ticket, ticket.id, {
            status: TicketStatus.AVAILABLE,
            orderId: null
          });
          
          // 更新票種可用數量
          await manager.increment(
            TicketType, 
            { id: ticket.ticketTypeId }, 
            'availableQuantity', 
            1
          );
        }
        
        // 3. 發送過期通知郵件
        await emailService.sendOrderExpiredNotification(order);
      });
    }
    
    logger.info(`Processed ${expiredOrders.length} expired orders`);
  }
}

// 註冊任務
taskScheduler.registerTask({
  id: 'order-expiration',
  name: '訂單過期處理',
  description: '自動處理過期的待付款訂單',
  cronExpression: OrderExpirationTask.CRON_EXPRESSION,
  isActive: true,
  executionCount: 0,
  failureCount: 0,
  maxRetries: 3,
  timeout: 30000, // 30秒
  createdAt: new Date(),
  updatedAt: new Date()
}, OrderExpirationTask.execute);
```

### 2. 郵件通知排程任務
```typescript
class EmailNotificationTask {
  // 每天早上 9 點發送
  static readonly CRON_EXPRESSION = '0 0 9 * * *';
  
  static async execute(): Promise<void> {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    // 找出明日即將開演的演唱會
    const upcomingSessions = await ConcertSession.find({
      where: {
        startTime: Between(today, tomorrow),
        status: SessionStatus.SCHEDULED
      },
      relations: ['concert', 'tickets', 'tickets.order', 'tickets.order.user']
    });
    
    // 批量發送提醒郵件
    for (const session of upcomingSessions) {
      const userTickets = new Map<string, Ticket[]>();
      
      // 按用戶分組票券
      for (const ticket of session.tickets) {
        if (ticket.order?.user) {
          const userId = ticket.order.user.id;
          if (!userTickets.has(userId)) {
            userTickets.set(userId, []);
          }
          userTickets.get(userId)!.push(ticket);
        }
      }
      
      // 發送個人化提醒郵件
      for (const [userId, tickets] of userTickets) {
        await emailService.sendConcertReminderEmail({
          user: tickets[0].order!.user,
          session,
          tickets
        });
      }
    }
    
    logger.info(`Sent reminders for ${upcomingSessions.length} upcoming concerts`);
  }
}
```

### 3. 資料清理任務
```typescript
class DataCleanupTask {
  // 每週日凌晨 2 點執行
  static readonly CRON_EXPRESSION = '0 0 2 * * 0';
  
  static async execute(): Promise<void> {
    const cleanupResults = {
      expiredSessions: 0,
      oldLogs: 0,
      unusedFiles: 0
    };
    
    // 1. 清理過期的客服會話
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const { affected: expiredSessions } = await SupportSession.delete({
      status: 'closed',
      updatedAt: LessThan(threeDaysAgo)
    });
    cleanupResults.expiredSessions = expiredSessions || 0;
    
    // 2. 清理舊的執行日誌 (保留 30 天)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { affected: oldLogs } = await TaskExecutionLog.delete({
      startTime: LessThan(thirtyDaysAgo)
    });
    cleanupResults.oldLogs = oldLogs || 0;
    
    // 3. 清理未使用的上傳檔案
    const unusedFiles = await this.cleanupUnusedFiles();
    cleanupResults.unusedFiles = unusedFiles;
    
    // 4. 優化資料庫
    await AppDataSource.query('VACUUM ANALYZE');
    
    logger.info('Data cleanup completed', cleanupResults);
    return cleanupResults;
  }
  
  private static async cleanupUnusedFiles(): Promise<number> {
    // 找出未被引用的檔案
    const referencedFiles = new Set<string>();
    
    // 收集所有被引用的檔案
    const users = await User.find({ select: ['avatar'] });
    users.forEach(user => {
      if (user.avatar) referencedFiles.add(user.avatar);
    });
    
    const concerts = await Concert.find({ select: ['posterImage'] });
    concerts.forEach(concert => {
      if (concert.posterImage) referencedFiles.add(concert.posterImage);
    });
    
    // 實作檔案清理邏輯...
    return 0; // 返回清理的檔案數量
  }
}
```

### 4. 系統健康檢查任務
```typescript
class HealthCheckTask {
  // 每 5 分鐘檢查一次
  static readonly CRON_EXPRESSION = '0 */5 * * * *';
  
  static async execute(): Promise<void> {
    const healthStatus = {
      database: false,
      redis: false,
      storage: false,
      openai: false,
      timestamp: new Date()
    };
    
    try {
      // 檢查資料庫連接
      await AppDataSource.query('SELECT 1');
      healthStatus.database = true;
    } catch (error) {
      logger.error('Database health check failed', error);
    }
    
    try {
      // 檢查 Redis 連接
      await redisClient.ping();
      healthStatus.redis = true;
    } catch (error) {
      logger.error('Redis health check failed', error);
    }
    
    try {
      // 檢查 Supabase Storage
      await supabaseStorage.getBucket('tickeasy-files');
      healthStatus.storage = true;
    } catch (error) {
      logger.error('Storage health check failed', error);
    }
    
    try {
      // 檢查 OpenAI API
      await openai.models.list();
      healthStatus.openai = true;
    } catch (error) {
      logger.error('OpenAI health check failed', error);
    }
    
    // 保存健康狀態
    await HealthCheck.save(healthStatus);
    
    // 如果有重要服務異常，發送告警
    const criticalServices = ['database', 'redis'];
    const failedCritical = criticalServices.filter(service => !healthStatus[service]);
    
    if (failedCritical.length > 0) {
      await alertService.sendCriticalAlert({
        services: failedCritical,
        timestamp: healthStatus.timestamp
      });
    }
  }
}
```

## 任務監控與管理

### 1. 任務狀態 API
```typescript
// 取得所有任務狀態
router.get('/tasks', authenticateToken, requireRole(['admin']), async (req, res) => {
  const tasks = Array.from(taskScheduler.getTasks().values());
  res.json({
    status: 'success',
    data: { tasks }
  });
});

// 手動執行任務
router.post('/tasks/:taskId/execute', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { taskId } = req.params;
  
  try {
    await taskScheduler.executeTaskManually(taskId);
    res.json({
      status: 'success',
      message: 'Task executed successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'failed',
      message: error.message
    });
  }
});

// 啟用/停用任務
router.put('/tasks/:taskId/toggle', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { taskId } = req.params;
  const { isActive } = req.body;
  
  try {
    await taskScheduler.toggleTask(taskId, isActive);
    res.json({
      status: 'success',
      message: `Task ${isActive ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    res.status(500).json({
      status: 'failed',
      message: error.message
    });
  }
});
```

## 核心特性
- ✅ Cron 表達式靈活排程
- ✅ 任務超時與重試機制
- ✅ 執行日誌與監控
- ✅ 手動任務執行
- ✅ 任務啟用/停用控制
- ✅ 系統健康監控
- ✅ 自動故障恢復

## 最佳實務
1. **錯誤處理**: 完善的異常捕獲與重試機制
2. **日誌記錄**: 詳細的執行日誌供問題排查
3. **性能監控**: 追蹤任務執行時間與頻率
4. **資源管理**: 避免任務間資源競爭
5. **配置管理**: 支援動態任務配置調整

## 相關檔案
- `scheduler/index.ts` - 排程器主檔案
- `scheduler/tasks/` - 任務定義目錄
- `models/TaskExecutionLog.ts` - 執行日誌實體
- `services/emailService.ts` - 郵件服務
- `services/alertService.ts` - 告警服務
