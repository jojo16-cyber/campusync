import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';

describe('MongoDB Database Connection Configuration', () => {
  let connectSpy: jest.SpyInstance;
  let disconnectSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  const originalDbName = process.env.MONGODB_DB_NAME;

  beforeEach(() => {
    delete process.env.MONGODB_DB_NAME;
    connectSpy = jest.spyOn(mongoose, 'connect').mockImplementation(async () => mongoose);
    disconnectSpy = jest.spyOn(mongoose, 'disconnect').mockImplementation(async () => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalDbName !== undefined) {
      process.env.MONGODB_DB_NAME = originalDbName;
    } else {
      delete process.env.MONGODB_DB_NAME;
    }
    connectSpy.mockRestore();
    disconnectSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('passes default dbName "placement_portal" to mongoose.connect when MONGODB_DB_NAME is not set', async () => {
    await connectDatabase();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        dbName: 'placement_portal',
        serverSelectionTimeoutMS: 5000,
      })
    );
  });

  it('passes custom dbName to mongoose.connect when MONGODB_DB_NAME is configured in environment', async () => {
    process.env.MONGODB_DB_NAME = 'custom_placement_portal_db';

    await connectDatabase();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        dbName: 'custom_placement_portal_db',
        serverSelectionTimeoutMS: 5000,
      })
    );
  });

  it('sanitizes credentials in connection logs and never prints passwords', async () => {
    await connectDatabase();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Database] MongoDB connected successfully')
    );

    const logCalls = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(logCalls).toContain('//***:***@');
  });

  it('disconnects cleanly when connection is active', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
    });

    await disconnectDatabase();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
