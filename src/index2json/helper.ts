export function warn(msg: string) {
  console.log('\x1b[33m [index-loader] ' + msg + '\x1b[0m')
}

export function cache<T>(map: { [key: string]: T }, key: string, callback: () => T): T {
  // 不能这样写，一定要存到 map 中，有可能其它程序需要读取
  // if (disable) return callback()
  if (!map.hasOwnProperty(key)) {
    map[key] = callback()
  }
  return map[key]
}
