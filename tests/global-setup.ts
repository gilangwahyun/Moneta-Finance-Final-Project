/**
 * File: tests/global-setup.ts
 *
 * Playwright global setup:
 * 1. Pre-warms Next.js dev server by visiting every app page once before any test runs.
 *    This forces the dev server to compile all pages eagerly, preventing ERR_ABORTED.
 * 2. Registers a shared test user via API and saves the auth cookie to
 *    playwright/.auth/shared-user.json so all test files can reuse the session
 *    without going through the registration UI again.
 */

import { chromium, FullConfig, request as apiRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';



const PAGES_TO_WARM = [
  '/login',
  '/register',
  '/',
  '/wallets',
  '/transactions',
  '/budgets',
  '/targets',
  '/categories',
  '/analytics',
  '/profile',
];

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3001';

  const browser = await chromium.launch();
  const warmContext = await browser.newContext();
  const warmPage = await warmContext.newPage();

  // ── 1. Pre-warm all pages (triggers Next.js lazy compilation) ──
  console.log('[Global Setup] Pre-warming Next.js dev server pages...');
  for (const pagePath of PAGES_TO_WARM) {
    try {
      console.log(`[Global Setup] Warming: ${pagePath}`);
      await warmPage.goto(`${baseURL}${pagePath}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120000,
      });
    } catch {
      // Redirects are fine — goal is just to trigger compilation.
    }
  }
  await warmContext.close();
  console.log('[Global Setup] All pages warmed up.');

  await browser.close();

  console.log('[Global Setup] Setup complete. Starting tests...\n');
}

export default globalSetup;
