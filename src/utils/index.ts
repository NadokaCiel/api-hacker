interface SanitizeOptions {
  removeFunctions?: boolean;
  handleCircular?: boolean;
  removeSymbols?: boolean;
}

export function sanitizeObject(obj, options: SanitizeOptions = {}) {
  const {
    removeFunctions = true,
    handleCircular = true,
    removeSymbols = false
  } = options;
  const seen = new WeakMap(); // 用于检测循环引用

  function _sanitize(value) {
    // 处理基本类型
    if (value === null || typeof value !== 'object') {
      return value;
    }

    // 处理循环引用
    if (handleCircular) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.set(value, true);
    }

    // 处理特殊对象类型
    if (value instanceof Date) {
      return new Date(value);
    }
    if (value instanceof RegExp) {
      return new RegExp(value);
    }
    if (removeFunctions && typeof value === 'function') {
      return undefined; // 移除函数
    }

    // 处理数组和普通对象
    const sanitized = Array.isArray(value) ? [] : {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        sanitized[key] = _sanitize(value[key]);
      }
    }

    // 处理Symbol类型的属性键（可选）
    if (removeSymbols && typeof Symbol === 'function') {
      const symbolKeys = Object.getOwnPropertySymbols(value);
      for (const symKey of symbolKeys) {
        sanitized[symKey] = undefined; // 移除Symbol属性
      }
    }

    return sanitized;
  }

  return _sanitize(obj);
}