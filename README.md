# html2json

A lightweight HTML-to-JSON parser written in JavaScript. It uses string scanning and does not use a DOM parser.

## Usage

```js
const result = html2json('<div class="box">Hello</div>');
console.log(JSON.stringify(result, null, 2));
```

The function returns a root object containing the parsed nodes:

```json
{
  "type": "root",
  "children": [
    {
      "type": "element",
      "tag": "div",
      "children": [
        {
          "type": "text",
          "content": "Hello"
        }
      ],
      "attributes": {
        "class": "box"
      }
    }
  ]
}
```

Text nodes use the `text` type. Element nodes contain a tag name, children, and an `attributes` object when attributes are present. Boolean attributes have an empty string value.

## Supported features

- Nested elements and text
- Quoted and unquoted attribute values
- Void elements and comments
- `script`, `style`, `textarea`, and `title` content as text
- Basic recovery from mismatched closing tags

## Limitations

This is a small parser, not a complete HTML5 parser. It does not implement all browser error-recovery rules or decode HTML entities. Some malformed or unusual HTML may produce a different tree than a browser.
