import {
  validateProductionSecurity,
  DEFAULT_DEV_JWT_SECRET,
} from '../config/env';

describe('Production Security & JWT Configuration Verification', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('validateProductionSecurity()', () => {
    it('aborts startup when NODE_ENV=production and JWT_SECRET equals known dev default', () => {
      expect(() => {
        validateProductionSecurity('production', DEFAULT_DEV_JWT_SECRET);
      }).toThrow(/Production environment requires a secure, non-default JWT_SECRET/i);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Fatal Security Error]')
      );
    });

    it('aborts startup when NODE_ENV=production and JWT_SECRET is undefined or empty', () => {
      expect(() => {
        validateProductionSecurity('production', undefined);
      }).toThrow(/Production environment requires a secure, non-default JWT_SECRET/i);

      expect(() => {
        validateProductionSecurity('production', '');
      }).toThrow(/Production environment requires a secure, non-default JWT_SECRET/i);

      expect(() => {
        validateProductionSecurity('production', '   ');
      }).toThrow(/Production environment requires a secure, non-default JWT_SECRET/i);
    });

    it('never prints the secret string itself to console or logs during validation failure', () => {
      const sensitiveSecretAttempt = 'some_weak_attempt';
      try {
        validateProductionSecurity('production', DEFAULT_DEV_JWT_SECRET);
      } catch {
        // Expected
      }

      // Ensure the secret value was not output anywhere in logs
      for (const call of consoleErrorSpy.mock.calls) {
        expect(call[0]).not.toContain(sensitiveSecretAttempt);
        expect(call[0]).not.toContain(DEFAULT_DEV_JWT_SECRET);
      }
      for (const call of consoleLogSpy.mock.calls) {
        expect(call[0]).not.toContain(DEFAULT_DEV_JWT_SECRET);
      }
    });

    it('permits startup when NODE_ENV=production and a valid, secure production secret is provided', () => {
      const strongProductionSecret = 'k9#mP$2vL@8xQ!zW5nE&1tY*7uJ~4bA^3cR';

      expect(() => {
        validateProductionSecurity('production', strongProductionSecret);
      }).not.toThrow();

      // Does not print the secret to logs
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      for (const call of consoleLogSpy.mock.calls) {
        expect(call[0]).not.toContain(strongProductionSecret);
      }
    });

    it('preserves normal development behavior when NODE_ENV=development with default secret', () => {
      expect(() => {
        validateProductionSecurity('development', DEFAULT_DEV_JWT_SECRET);
      }).not.toThrow();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('preserves normal test behavior when NODE_ENV=test with default secret', () => {
      expect(() => {
        validateProductionSecurity('test', DEFAULT_DEV_JWT_SECRET);
      }).not.toThrow();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
