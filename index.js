var through = require('through')

module.exports = function BlkDatStream() {
  var buffers = []
  var buffer = new Buffer(0)
  var len = 0
  var needed = 0

  return through(function write(data) {
    len += data.length
    buffers.push(data)

    // do we have a header? and do we have enough data?
    if (needed !== 0 && len < needed) return

    // merge buffers
    buffer = Buffer.concat([buffer].concat(buffers), len)
    buffers = []

    var offset = 0
    var remaining = len

    // do we [still] have enough data?
    while (remaining >= needed) {
      // do we need to parse a magic header?
      if (needed === 0) {
        // do we have enough for a magic header?
        if (remaining < 8) break

        // read the magic header (magic number, block length)
        var magicInt = buffer.readUInt32LE(offset)
        var blockLength = buffer.readUInt32LE(offset + 4)

        if (magicInt !== 0xd9b4bef9) {
          throw new Error('Unexpected data')
        }

        // now, block length is what is needed
        needed = blockLength
        remaining -= 8
        offset += 8

        // and loop
        continue
      }

      // read the block
      var block = buffer.slice(offset, offset + needed)
      offset += needed
      remaining -= needed
      needed = 0

      // update cursor information
      buffer = buffer.slice(offset)
      len = buffer.length
      offset = 0

      // process block
      this.queue(block)
    }

    // reset buffer
    buffer = buffer.slice(offset)
    len = buffer.length
  })
}
