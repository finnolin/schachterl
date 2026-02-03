// logger.svelte.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	none: 4
};

interface LoggerConfig {
	globalLevel: LogLevel;
	scopeLevels: Map<string, LogLevel>;
	scopeColors: Map<string, string>;
}

// Define the return type for scoped loggers
interface ScopedLogger {
	debug: (...args: any[]) => void;
	info: (...args: any[]) => void;
	warn: (...args: any[]) => void;
	error: (...args: any[]) => void;
	setLevel: (level: LogLevel) => void;
	removeLevel: () => void;
}

interface ScopeConfig {
	name: string;
	color?: string;
}

class Logger {
	private config: LoggerConfig = {
		globalLevel: 'info',
		scopeLevels: new Map(),
		scopeColors: new Map()
	};

	/**
	 * Set the global log level for all scopes
	 */
	setLevel(level: LogLevel) {
		this.config.globalLevel = level;
	}

	/**
	 * Set the log level for a specific scope
	 */
	setScopeLevel(scope: string, level: LogLevel) {
		this.config.scopeLevels.set(scope, level);
		//console.log(this.config);
	}

	/**
	 * Remove scope-specific level (falls back to global)
	 */
	removeScopeLevel(scope: string) {
		this.config.scopeLevels.delete(scope);
	}

	/**
	 * Get the effective log level for a scope
	 */
	private getEffectiveLevel(scope?: string): LogLevel {
		if (scope && this.config.scopeLevels.has(scope)) {
			return this.config.scopeLevels.get(scope)!;
		}
		return this.config.globalLevel;
	}

	/**
	 * Check if a log should be output based on level
	 */
	private shouldLog(messageLevel: LogLevel, scope?: string): boolean {
		const effectiveLevel = this.getEffectiveLevel(scope);
		return LOG_LEVELS[messageLevel] >= LOG_LEVELS[effectiveLevel];
	}

	/**
	 * Get color style for log level
	 */
	private getLogStyle(level: LogLevel): string {
		const styles = {
			debug: 'color: #6B7280; font-weight: bold', // Gray
			info: 'color: #3B82F6; font-weight: bold', // Blue
			warn: 'color: #F59E0B; font-weight: bold', // Orange
			error: 'color: #EF4444; font-weight: bold', // Red
			none: 'color: #000000; font-weight: bold' // Black
		};
		return styles[level];
	}

	/**
	 * Core logging method
	 */
	private logInternal(level: LogLevel, scope: string | undefined, ...args: any[]) {
		if (!this.shouldLog(level, scope)) return;

		const levelPrefix = `(${level.charAt(0)})`;
		const levelStyle = this.getLogStyle(level);

		if (scope) {
			const scopePrefix = `${scope}:`;
			const scopeColor = this.config.scopeColors.get(scope) || '#9CA3AF'; // Default gray
			const scopeStyle = `color: ${scopeColor}; font-weight: bold`;

			console.log(
				`%c${levelPrefix}%c %c${scopePrefix}`,
				levelStyle,
				'color: inherit; font-weight: normal',
				scopeStyle,
				...args
			);
		} else {
			console.log(`%c${levelPrefix}%c`, levelStyle, 'color: inherit; font-weight: normal', ...args);
		}
	}

	/**
	 * Create a scoped logger instance
	 */
	scope(scopeName: string, color?: string): ScopedLogger {
		if (color) {
			this.config.scopeColors.set(scopeName, color);
		}

		return {
			debug: (...args: any[]) => this.logInternal('debug', scopeName, ...args),
			info: (...args: any[]) => this.logInternal('info', scopeName, ...args),
			warn: (...args: any[]) => this.logInternal('warn', scopeName, ...args),
			error: (...args: any[]) => this.logInternal('error', scopeName, ...args),
			setLevel: (level: LogLevel) => this.setScopeLevel(scopeName, level),
			removeLevel: () => this.removeScopeLevel(scopeName)
		};
	}

	/**
	 * Global logging methods (no scope)
	 */
	debug(...args: any[]) {
		this.logInternal('debug', undefined, ...args);
	}

	info(...args: any[]) {
		this.logInternal('info', undefined, ...args);
	}

	warn(...args: any[]) {
		this.logInternal('warn', undefined, ...args);
	}

	error(...args: any[]) {
		this.logInternal('error', undefined, ...args);
	}

	/**
	 * Get current configuration (reactive)
	 */
	getConfig() {
		return {
			globalLevel: this.config.globalLevel,
			scopeLevels: new Map(this.config.scopeLevels)
		};
	}

	/**
	 * Get all configured scopes
	 */
	getScopes(): string[] {
		return Array.from(this.config.scopeLevels.keys());
	}
}

// Define the callable logger type - extends Logger and is callable
interface CallableLogger extends Logger {
	(...args: any[]): void;
	migrator: ScopedLogger;
	db: ScopedLogger;
	app: ScopedLogger;
	hooks: ScopedLogger;
	auth: ScopedLogger;
	store: ScopedLogger;
}

// Create a callable logger by using a Proxy
function createCallableLogger(): CallableLogger {
	const instance = new Logger();

	const callable = new Proxy(instance, {
		apply(_target, _thisArg, args) {
			return instance.info(...args);
		},
		get(target, prop) {
			return (target as any)[prop];
		}
	}) as CallableLogger;

	return callable;
}

// Export singleton instance
export const log = createCallableLogger();
log.setLevel('debug');

// Attach scoped loggers to the main instance with custom colors
log.migrator = log.scope('migrator', '#10B981'); // Green
log.migrator.setLevel('debug');
log.db = log.scope('db', '#8B5CF6');
log.db.setLevel('debug');
log.app = log.scope('app', '#cf2d5b');
log.app.setLevel('debug');
log.hooks = log.scope('hooks', '#cf2d5b');
log.hooks.setLevel('debug');
log.auth = log.scope('auth', '#ff9900');
log.auth.setLevel('debug');
log.store = log.scope('store', '#db72bf');
log.store.setLevel('debug');

export default log;
