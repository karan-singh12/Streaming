// Performance monitoring utilities

export class PerformanceMonitor {
  private static startTimes: Map<string, number> = new Map();

  static start(label: string): void {
    this.startTimes.set(label, Date.now());
  }

  static end(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      console.warn(`Performance monitor: No start time found for label "${label}"`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(label);
    return duration;
  }

  static measure<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
    this.start(label);
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = this.end(label);
        console.log(`⏱️  ${label}: ${duration}ms`);
      });
    } else {
      const duration = this.end(label);
      console.log(`⏱️  ${label}: ${duration}ms`);
      return result;
    }
  }

  static log(label: string, duration: number): void {
    const emoji = duration < 100 ? '⚡' : duration < 500 ? '✅' : duration < 1000 ? '⚠️' : '🐌';
    console.log(`${emoji} ${label}: ${duration}ms`);
  }
}

// Memory usage monitoring
export const logMemoryUsage = (label: string = 'Memory Usage'): void => {
  const usage = process.memoryUsage();
  const formatBytes = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  console.log(`📊 ${label}:`);
  console.log(`   RSS: ${formatBytes(usage.rss)}`);
  console.log(`   Heap Used: ${formatBytes(usage.heapUsed)}`);
  console.log(`   Heap Total: ${formatBytes(usage.heapTotal)}`);
  console.log(`   External: ${formatBytes(usage.external)}`);
};

// CPU usage monitoring (basic)
export const logCpuUsage = (): void => {
  const startUsage = process.cpuUsage();
  
  setTimeout(() => {
    const currentUsage = process.cpuUsage(startUsage);
    const userTime = currentUsage.user / 1000000; // Convert to seconds
    const systemTime = currentUsage.system / 1000000; // Convert to seconds
    
    console.log(`🖥️  CPU Usage (1s):`);
    console.log(`   User: ${userTime.toFixed(2)}s`);
    console.log(`   System: ${systemTime.toFixed(2)}s`);
    console.log(`   Total: ${(userTime + systemTime).toFixed(2)}s`);
  }, 1000);
};
