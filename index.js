// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

var path              = require("path")
var urix              = require("urix")
var sourceMap         = require("source-map")
var SourceNode        = sourceMap.SourceNode
var SourceMapConsumer = sourceMap.SourceMapConsumer

function concat(files, options) {
  options = options || {}

  var concatenated = new SourceNode()

  files.forEach(function(file, index) {
    if (options.delimiter && index !== 0) {
      concatenated.add(options.delimiter)
    }

    var node
    if (file.map) {
      node = SourceNode.fromStringWithSourceMap(
        file.content,
        new SourceMapConsumer(file.map),
        urix(path.relative(
          path.dirname( options.mapPath || "." ),
          path.dirname( file.sourcesRelativeTo || "." )
        ))
      )
    } else {
      node = new SourceNode(null, null, null, file.content)
    }

    if (options.process) {
      options.process(node, file, index)
    }

    concatenated.add(node)
  })

  return concatenated
}

module.exports = concat
