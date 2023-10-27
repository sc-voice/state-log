#!/usr/bin/env node
import { TestUrl } from '../node.js';

let testUrl = new TestUrl().parseArgs(process.argv.slice(2));
if (testUrl) {
  await testUrl.monitor();
}
