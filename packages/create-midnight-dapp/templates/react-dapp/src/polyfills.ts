import { Buffer } from 'buffer';
import process from 'process';

globalThis.Buffer = Buffer;
globalThis.process = process;
globalThis.global = globalThis;

if (!process.env) {
  process.env = {};
}
