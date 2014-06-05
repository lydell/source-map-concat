// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

var path                 = require("path")
var sourceMap            = require("source-map")
var SourceNode           = sourceMap.SourceNode
var SourceMapConsumer    = sourceMap.SourceMapConsumer
var SourceMapGenerator   = sourceMap.SourceMapGenerator
var createDummySourceMap = require("source-map-dummy")
var expect               = require("chai").expect

var concat = require("../")


describe("concat", function() {

  it("is a function", function() {
    expect(concat).to.be.a("function")
  })


  it("returns a SourceNode", function() {
    expect(concat([])).to.be.an.instanceof(SourceNode)
  })


  it("simply concatenates", function() {
    var concatenated = concat([
      {code: "a"},
      {code: "b"},
      {code: "c"}
    ]).toString()
    expect(concatenated).to.equal("abc")
  })


  it("respects the original newlines", function() {
    var concatenated = concat([
      {code: "a\na"},
      {code: "b\rb"},
      {code: "c\r\nc"}
    ]).toString()
    expect(concatenated).to.equal("a\nab\rbc\r\nc")
  })


  it("adds delimiter", function() {
    var concatenated = concat([
      {code: "a"},
      {code: "b"},
      {code: "c"}
    ], {
      delimiter: "|"
    }).toString()
    expect(concatenated).to.equal("a|b|c")
  })


  it("allows a processing function", function() {
    var concatenated = concat([
      {code: "a", foo: "A"},
      {code: "b", foo: "B"},
      {code: "c", foo: "C"}
    ], {
      process: function(node, file, index) {
        node.prepend(index + file.foo)
      }
    }).toString()
    expect(concatenated).to.equal("0Aa1Bb2Cc")
  })


  it("creates correct source mappings", function() {
    // Of course concatenating JavaScript and CSS won’t work in reality, but whatever.
    var expectedCode = [
      "/* Banner */",
      "void (function(){var foo=function(){",
      "  return 0",
      "}}());",
      "void (function(){between}());",
      "void (function(){#foo[attr='value']{",
      "  margin: 0",
      "}}());// Footer"
    ].join("\n")

    // See the above expected code to see the offset of the generated positions.
    var mappings = []

    var js =
      ["var", " ", "foo", "=",   "function", "(",    ")",    "{",
       "\n  ", "return", " ", "0",
       "\n", "}"                                                    ]
    mappings = mappings.concat(
      [[1,0],      [1,4], [1,7], [1,8],      [1,16], [1,17], [1,18],
               [2,2],         [2,9],
             [3,0]                                                  ]
      .map(function(pair) {
        var line   = pair[0]
        var column = pair[1]
        return {
          original:  pair,
          generated: [line + 1, (line === 1 ? column + 17 : column)],
          source: "foo.js"
        }
      })
    )

    mappings.push({
      original:  [],
      generated: [4,1]
    })

    var css =
      ["#foo", "[",   "attr", "=",   "'value'", "]",    "{",
       "\n  ", "margin", ":", " ", "0",
       "\n", "}"                                                     ]
    mappings = mappings.concat(
      [[1,0],  [1,4], [1,5],  [1,9], [1,10],    [1,17], [1,18],
               [2,2],    [2,8],    [2,10],
             [3,0]                                                   ]
      .map(function(pair) {
        var line   = pair[0]
        var column = pair[1]
        return {
          original:  pair,
          generated: [line + 5, (line === 1 ? column + 17 : column)],
          source: "foo.css"
        }
      })
    )

    mappings.push({
      original:  [],
      generated: [8,1]
    })

    var node = concat([
      { code: js.join(""),  map: createDummySourceMap(js,  {source: "foo.js"})  },
      { code: "between" },
      { code: css.join(""), map: createDummySourceMap(css, {source: "foo.css"}) }
    ], {
      delimiter: "\n",
      process: function(node) {
        node.prepend("void (function(){")
        node.add("}());")
      }
    })

    node.prepend("/* Banner */\n")
    node.add("// Footer")

    var result = node.toStringWithSourceMap()
    var code = result.code
    var map  = new SourceMapConsumer(result.map.toJSON())

    expect(code).to.equal(expectedCode)

    var index = 0
    map.eachMapping(function(mapping) {
      var expectedMapping = mappings[index]

      expect(mapping.originalLine).to.equal(expectedMapping.original[0])
      expect(mapping.originalColumn).to.equal(expectedMapping.original[1])
      expect(mapping.generatedLine).to.equal(expectedMapping.generated[0])
      expect(mapping.generatedColumn).to.equal(expectedMapping.generated[1])
      expect(mapping.source).to.equal(expectedMapping.source)

      index++
    })
  })


  it("rewrites relative paths", function() {
    // /
    //   bar.js
    //   bar.js.map
    //   app/
    //     js/
    //       foo.js
    //       foo.js.map
    //       concatenated1.js
    //       concatenated1.js.map
    //       out/
    //         concatenated2.js
    //         concatenated2.js.map
    //     public/
    //       concatenated3.js
    //       concatenated3.js.map

    var foo = new SourceNode(1, 0, "foo.js", "foo();").toStringWithSourceMap()
    var bar = new SourceNode(1, 0, "/bar.js", "bar();").toStringWithSourceMap()

    // Should work on Windows too.
    var sep = function(aPath) {
      return aPath.replace(/\//g, path.sep)
    }

    var concatenated1 = concat([
      { code: foo.code, map: foo.map.toJSON() },
      { code: bar.code, map: bar.map.toJSON() }
    ], {
      mapPath: "concatenated1.js.map"
    }).toStringWithSourceMap()

    expect(concatenated1.map.toJSON().sources).to.eql([
      "foo.js",
      "/bar.js"
    ])

    var concatenated2 = concat([
      { code: foo.code, map: foo.map.toJSON() },
      { code: bar.code, map: bar.map.toJSON() }
    ], {
      mapPath: sep("out/concatenated2.js.map")
    }).toStringWithSourceMap()

    expect(concatenated2.map.toJSON().sources).to.eql([
      "../foo.js",
      "/bar.js"
    ])

    var concatenated2Alt = concat([
      { code: foo.code, map: foo.map.toJSON(), sourcesRelativeTo: sep("../foo.js.map") },
      { code: bar.code, map: bar.map.toJSON() }
    ]).toStringWithSourceMap()

    expect(concatenated2Alt.map.toJSON().sources).to.eql([
      "../foo.js",
      "/bar.js"
    ])

    var concatenated3 = concat([
      { code: foo.code, map: foo.map.toJSON(), sourcesRelativeTo: sep("js/foo.js.map") },
      { code: bar.code, map: bar.map.toJSON() }
    ], {
      mapPath: sep("public/concatenated3.js.map")
    }).toStringWithSourceMap()

    expect(concatenated3.map.toJSON().sources).to.eql([
      "../js/foo.js",
      "/bar.js"
    ])

  })


  it("allows the map to be an object, a string or anything with `.toJSON()`", function() {

    var generator = new SourceMapGenerator()

    generator.addMapping({
      generated: {
        line: 1,
        column: 1
      },
      original: {
        line: 2,
        column: 2
      },
      source: "foo"
    })

    var generateMap = function(map) {
      return concat([{ code: "bar", map: map }]).toStringWithSourceMap().map.toString()
    }

    var mapFromObject = generateMap(generator.toJSON())
    var mapFromString = generateMap(generator.toString())
    var mapFromToJSON = generateMap({ toJSON: function() { return generator.toJSON() } })
    var mapFromSourceMapGenerator = generateMap(generator)

    expect(mapFromObject).to.equal(mapFromString)
    expect(mapFromString).to.equal(mapFromToJSON)
    expect(mapFromToJSON).to.equal(mapFromSourceMapGenerator)
    expect(mapFromSourceMapGenerator).to.equal(mapFromObject)

  })

})
