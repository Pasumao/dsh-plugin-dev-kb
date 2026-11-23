// 测试夹具：把 { "路径": Buffer } 打成最小合法 asar，供 selfcheck / smoke 验证 kb-version 的 app.asar 解析。
// asar 布局：[0-3]=size pickle [4-7]=header 总长 [8-11]=header pickle 载荷 [12-15]=JSON 长度
//          [16..]=文件树 JSON（叶子记 size/offset） 数据区起始于 8 + header 总长。

/**
 * @param {Record<string, Buffer>} files 相对 asar 根的路径 → 文件内容（目录按路径自动创建）
 * @returns {Buffer} 合成 asar 的完整字节
 */
export function packAsar(files) {
  const dir = () => ({ files: {} })
  const tree = dir()
  const blobs = []
  let offset = 0
  for (const [file, data] of Object.entries(files)) {
    const segments = file.split('/')
    let node = tree
    for (const segment of segments.slice(0, -1)) {
      node.files[segment] ??= dir()
      node = node.files[segment]
    }
    node.files[segments[segments.length - 1]] = { size: data.length, offset: String(offset) }
    blobs.push(data)
    offset += data.length
  }
  const json = Buffer.from(JSON.stringify(tree))
  const pad = (4 - (json.length % 4)) % 4
  const headerLen = 8 + json.length + pad // headerPickle 总长 = 4(前缀) + 4(jsonLen) + 载荷
  const head = Buffer.alloc(16)
  head.writeUInt32LE(4, 0)
  head.writeUInt32LE(headerLen, 4)
  head.writeUInt32LE(4 + json.length + pad, 8)
  head.writeUInt32LE(json.length, 12)
  return Buffer.concat([head, json, Buffer.alloc(pad), ...blobs])
}
