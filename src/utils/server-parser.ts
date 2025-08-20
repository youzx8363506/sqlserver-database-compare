/**
 * 解析服务器地址和端口
 * 支持以下格式：
 * - localhost (默认端口1433)
 * - 192.168.1.100 (默认端口1433)
 * - 192.168.1.100:1435 (冒号分隔的端口)
 * - 219.147.24.90,26923 (逗号分隔的端口)
 * - SERVER\INSTANCE (命名实例，默认端口1433)
 */
export interface ParsedServer {
  server: string;
  port: number;
  hasExplicitPort: boolean;
}

export function parseServerAddress(serverInput: string): ParsedServer {
  if (!serverInput || typeof serverInput !== 'string') {
    throw new Error('服务器地址不能为空');
  }

  const trimmedServer = serverInput.trim();
  
  // 检查是否包含逗号（如：219.147.24.90,26923）
  // 对于逗号分隔的格式，保持原始字符串不变，让mssql库自己处理
  if (trimmedServer.includes(',')) {
    const parts = trimmedServer.split(',');
    if (parts.length === 2 && parts[0] && parts[1]) {
      const portStr = parts[1].trim();
      const port = parseInt(portStr, 10);
      
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`无效的端口号: ${portStr}`);
      }
      
      return {
        server: trimmedServer,  // 保持完整的"server,port"格式
        port: -1,  // 特殊标记，表示不需要单独指定端口
        hasExplicitPort: true
      };
    }
  }
  
  // 检查是否包含冒号分隔的端口（如：192.168.1.100:1435）
  if (trimmedServer.includes(':')) {
    const parts = trimmedServer.split(':');
    if (parts.length === 2 && parts[0] && parts[1]) {
      const server = parts[0].trim();
      const portStr = parts[1].trim();
      const port = parseInt(portStr, 10);
      
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`无效的端口号: ${portStr}`);
      }
      
      return {
        server,
        port,
        hasExplicitPort: true
      };
    }
  }
  
  // 没有明确端口号，使用默认端口1433
  return {
    server: trimmedServer,
    port: 1433,
    hasExplicitPort: false
  };
}

/**
 * 格式化服务器地址用于显示
 * @param server 服务器地址
 * @param port 端口号
 * @param hasExplicitPort 是否有明确的端口号
 * @returns 格式化后的地址字符串
 */
export function formatServerAddress(server: string, port: number, hasExplicitPort: boolean): string {
  if (hasExplicitPort && port !== 1433) {
    // 如果原来使用逗号分隔且不是默认端口，保持逗号格式
    return `${server},${port}`;
  } else if (hasExplicitPort) {
    // 如果有明确端口但是默认端口，可能使用冒号格式
    return `${server}:${port}`;
  } else {
    // 没有明确端口，只返回服务器地址
    return server;
  }
}