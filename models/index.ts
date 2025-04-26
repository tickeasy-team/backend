import 'reflect-metadata';

/**
 * 模型索引文件
 * 用於集中導入/導出所有模型
 */

// 導入所有模型
export * from './user';
export * from './organization';
export * from './location-tag';
export * from './music-tag';
export * from './venue';
export * from './concert';
export * from './concert-session';
export * from './ticket-type';
export * from './order';
export * from './ticket';
export * from './payment';

console.log('模型已初始化'); 