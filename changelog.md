### Version 0.2.0 (Unreleased) ###

- Allow passing a source map as a string and anything with a `.toJSON()` method
  (such as a `SourceMapGenerator`) as well as an object.
- Rename `file.content` to `file.code`, to be consistent with
  `SourceNode.toStringWithSourceMap()` and rework (`css.stringify`). After all,
  in reality the content is going to be code, so we might just as well call it
  that. “code” is also shorter than “content”. (Backwards-incompatible change.)


### Version 0.1.0 (2014-03-22) ###

- Initial release.
