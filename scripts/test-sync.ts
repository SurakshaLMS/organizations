import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync/sync.service';

async function testSync() {
  console.log('🚀 Initializing sync test...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);

  try {
    console.log('📊 Getting sync status before sync...');
    const statusBefore = await syncService.getSyncStatus();
    console.log('Status before sync:', JSON.stringify(statusBefore, null, 2));

    console.log('\n🔄 Starting manual sync...');
    await syncService.triggerSync();

    console.log('\n📊 Getting sync status after sync...');
    const statusAfter = await syncService.getSyncStatus();
    console.log('Status after sync:', JSON.stringify(statusAfter, null, 2));

    console.log('\n✅ Sync test completed successfully!');
  } catch (error) {
    console.error('❌ Sync test failed:', error);
  } finally {
    await app.close();
  }
}

testSync().catch(console.error);
