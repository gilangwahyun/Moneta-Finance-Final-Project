/**
 * 12-sync-conflicts.spec.ts
 *
 * Automated tests for Sync Engine Conflict Resolution & Hard Delete operations.
 * Verifies that when resolving conflicts (replacing local clientIds with server UUIDs),
 * hard delete operations remove orphaned local records without enqueueing phantom DELETE
 * actions into the sync_queue.
 */

import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const testEmail = `sync_conflicts_${timestamp}_${randomStr}@moneta.app`;
const testUsername = `sync_conflicts_${timestamp}_${randomStr}`;
const testPassword = 'SecurePassword123!';

test.describe.serial('3.1 Sync Conflict Resolution & Phantom Delete Queue Prevention', () => {
  test.setTimeout(120000); // 2 minutes

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);

    // Register initial user to initialize local DB and session
    await page.goto('http://localhost:3000/register');
    await page.fill('#email', testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', testPassword);
    await page.fill('#confirm-password', testPassword);
    await page.click('button[type="submit"]:has-text("Buat Akun")');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 120000 });
    await page.waitForTimeout(2000);
  });

  test('Hard Delete Budget during conflict resolution removes DB record without creating phantom delete queue item', async () => {
    await page.goto('http://localhost:3000/');
    const result = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('moneta-finance');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // 1. Simulate local budget created offline with temporary clientId
      const testBudget = {
        clientId: 'conflict-budget-id-1',
        id: null,
        categoryId: 'cat-test-1',
        period: '2026-07',
        amount: 1500000,
        spentAmount: 0,
        syncStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('budgets', 'readwrite');
        tx.objectStore('budgets').put(testBudget);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // 2. Perform hard delete (as executed by sync-manager during conflict resolution)
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('budgets', 'readwrite');
        tx.objectStore('budgets').delete('conflict-budget-id-1');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // 3. Verify record is gone from budgets store
      const budgetExists = await new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction('budgets', 'readonly');
        const req = tx.objectStore('budgets').get('conflict-budget-id-1');
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => reject(req.error);
      });

      // 4. Verify sync_queue does NOT contain a 'delete' action for this clientId
      const queueEntries = await new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const req = tx.objectStore('sync_queue').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const phantomDelete = queueEntries.find((e: any) => e.action === 'delete' && e.entityId === 'conflict-budget-id-1');

      return {
        budgetExists,
        hasPhantomDelete: !!phantomDelete,
      };
    });

    expect(result.budgetExists).toBe(false);
    expect(result.hasPhantomDelete).toBe(false);
  });

  test('Hard Delete Target during conflict resolution removes DB record without creating phantom delete queue item', async () => {
    await page.goto('http://localhost:3000/');
    const result = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('moneta-finance');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const testTarget = {
        clientId: 'conflict-target-id-1',
        id: null,
        title: 'Dana Darurat',
        targetAmount: 10000000,
        currentAmount: 1000000,
        periodType: 'MONTHLY',
        syncStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('financial_targets', 'readwrite');
        tx.objectStore('financial_targets').put(testTarget);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('financial_targets', 'readwrite');
        tx.objectStore('financial_targets').delete('conflict-target-id-1');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      const targetExists = await new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction('financial_targets', 'readonly');
        const req = tx.objectStore('financial_targets').get('conflict-target-id-1');
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => reject(req.error);
      });

      const queueEntries = await new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const req = tx.objectStore('sync_queue').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const phantomDelete = queueEntries.find((e: any) => e.action === 'delete' && e.entityId === 'conflict-target-id-1');

      return {
        targetExists,
        hasPhantomDelete: !!phantomDelete,
      };
    });

    expect(result.targetExists).toBe(false);
    expect(result.hasPhantomDelete).toBe(false);
  });

  test('Hard Delete Wallet & Category during conflict resolution prevent phantom queue pollution', async () => {
    await page.goto('http://localhost:3000/');
    const result = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('moneta-finance');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // Insert temporary wallet and category
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['wallets', 'categories'], 'readwrite');
        tx.objectStore('wallets').put({
          clientId: 'conflict-wallet-1',
          name: 'Temp Wallet',
          type: 'CASH',
          initialBalance: 0,
          syncStatus: 'PENDING',
        });
        tx.objectStore('categories').put({
          clientId: 'conflict-cat-1',
          name: 'Temp Cat',
          type: 'EXPENSE',
          syncStatus: 'PENDING',
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Execute Hard Deletes
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['wallets', 'categories'], 'readwrite');
        tx.objectStore('wallets').delete('conflict-wallet-1');
        tx.objectStore('categories').delete('conflict-cat-1');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      const queueEntries = await new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const req = tx.objectStore('sync_queue').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const phantomWallet = queueEntries.find((e: any) => e.action === 'delete' && e.entityId === 'conflict-wallet-1');
      const phantomCat = queueEntries.find((e: any) => e.action === 'delete' && e.entityId === 'conflict-cat-1');

      return {
        hasPhantomWallet: !!phantomWallet,
        hasPhantomCat: !!phantomCat,
      };
    });

    expect(result.hasPhantomWallet).toBe(false);
    expect(result.hasPhantomCat).toBe(false);
  });
});
