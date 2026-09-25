function convertHtml2JsonAndSet() {
  const htmlTextAreaValue = document.getElementById("html").value;
  const jsonObj = html2json(htmlTextAreaValue);
  const jsonArea = document.getElementById("json");
  jsonArea.textContent = JSON.stringify(jsonObj, null, 2);
}

/* 
  Update this function to convert html into json object.
  You can rewrite it completely, just be sure it accepts htmlText as string and outputs json object.
*/
function html2json(htmlText) {
  const root = { type: "root", children: [] };
  const stack = [root];
  const VOID_TAGS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  // tags whose contents should be treated as plain text rather than nested HTML nodes
  const RAW_TEXT_TAGS = new Set(["script", "style", "textarea", "title"]);
  let index = 0;

  while (index < htmlText.length) {
    let startTagIndex = htmlText.indexOf("<", index);

    // if there are no more tags, consume all the remaining text
    if (startTagIndex === -1) {
      const text = htmlText.slice(index);
      if (text.trim() !== "") {
        stack[stack.length - 1].children.push({
          type: "text",
          content: decodeEntities(text),
        });
      }
      break;
    }

    // preserve the plain text between tags
    if (startTagIndex > index) {
      const text = htmlText.slice(index, startTagIndex);
      if (text.trim() !== "") {
        stack[stack.length - 1].children.push({
          type: "text",
          content: decodeEntities(text),
        });
      }
    }

    // check for a comment
    if (htmlText.startsWith("<!--", startTagIndex)) {
      const commentEndIndex = htmlText.indexOf("-->", startTagIndex + 4);

      if (commentEndIndex === -1) {
        break;
      }

      index = commentEndIndex + 3;
      continue;
    }

    let endTagIndex = -1;
    let inDoubleQuote = false;
    let inSingleQuote = false;

    // find the tag’s closing >, ignoring any > characters inside quotes in attributes
    for (let i = startTagIndex + 1; i < htmlText.length; i++) {
      const char = htmlText[i];
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === ">" && !inDoubleQuote && !inSingleQuote) {
        endTagIndex = i;
        break;
      }
    }

    // if the file ends before the closing angle bracket is reached
    if (endTagIndex === -1) {
      const text = htmlText.slice(startTagIndex);
      if (text.trim() !== "") {
        stack[stack.length - 1].children.push({
          type: "text",
          content: decodeEntities(text),
        });
      }
      break;
    }

    let tagContent = htmlText.slice(startTagIndex + 1, endTagIndex);
    tagContent = tagContent.trim();

    index = endTagIndex + 1;

    // ignore the doctype declaration
    if (tagContent.toLowerCase().startsWith("!doctype")) {
      continue;
    }

    // handling closing tags (e.g. </div>)
    if (tagContent.startsWith("/")) {
      const closingTagName = tagContent.slice(1).trim().toLowerCase();

      let i;

      for (i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === closingTagName) {
          stack.length = i;
          break;
        }
      }
    } else {
      // handling opening tags
      let isSelfClosing = tagContent.endsWith("/");
      if (isSelfClosing) {
        tagContent = tagContent.slice(0, -1).trim();
      }

      let spaceIndex = tagContent.search(/\s/);
      let tagName =
        spaceIndex === -1 ? tagContent : tagContent.slice(0, spaceIndex);
      tagName = tagName.toLowerCase();

      const attributes = {};

      if (spaceIndex !== -1) {
        const attrString = tagContent.slice(spaceIndex).trim(); // so the parser does not treat the tag as an attribute
        const attrRegex =
          // regular expression for parsing HTML5 attributes
          /(?:^|\s)([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

        for (const match of attrString.matchAll(attrRegex)) {
          const name = match[1].toLowerCase();
          const value = match[2] ?? match[3] ?? match[4] ?? "";
          if (!Object.hasOwn(attributes, name)) {
            attributes[name] = decodeEntities(value);
          }
        }
      }

      const newNode = {
        type: "element",
        tag: tagName,
        children: [],
      };
      if (Object.keys(attributes).length > 0) {
        newNode.attributes = attributes;
      }

      stack[stack.length - 1].children.push(newNode);

      // handling special elements (script, style, textarea, title)
      if (RAW_TEXT_TAGS.has(tagName)) {
        const lowerHtml = htmlText.toLowerCase();
        const closingPrefix = `</${tagName}`;
        let closingStart = lowerHtml.indexOf(closingPrefix, index);

        while (
          closingStart !== -1 &&
          !/[>\s\/]/.test(htmlText[closingStart + closingPrefix.length] ?? ">")
        ) {
          closingStart = lowerHtml.indexOf(
            closingPrefix,
            closingStart + closingPrefix.length,
          );
        }

        // if the file ends inside a special tag
        if (closingStart === -1) {
          const text = htmlText.slice(index);
          if (text !== "") {
            // the textarea and title tags require entity decoding, while script and style do not
            const finalContent =
              tagName === "textarea" || tagName === "title"
                ? decodeEntities(text)
                : text;
            newNode.children.push({
              type: "text",
              content: finalContent,
            });
          }
          break;
        }

        // closing a special tag normally
        const text = htmlText.slice(index, closingStart);

        if (text !== "") {
          const finalContent =
            tagName === "textarea" || tagName === "title"
              ? decodeEntities(text)
              : text;
          newNode.children.push({
            type: "text",
            content: finalContent,
          });
        }

        const closingEnd = htmlText.indexOf(">", closingStart);
        if (closingEnd === -1) {
          break;
        }

        index = closingEnd + 1;
        continue;
      }

      // add the tag to the stack if it is not a void element (such as <img> or <br>)
      if (!VOID_TAGS.has(tagName)) {
        stack.push(newNode);
      }
    }
  }
  return root;
}

// character decoder for text
function decodeEntities(text) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: "\u00A0",
    copy: "©",
  };

  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] !== "#") {
      return named[code.toLowerCase()] ?? match;
    }

    const isHex = code[1].toLowerCase() === "x";
    const number = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);

    if (!Number.isInteger(number) || number < 0 || number > 0x10ffff) {
      return match;
    }

    return String.fromCodePoint(number);
  });
}

function showExample1() {
  const htmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport">
    <title>Sample HTML</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>
    <main>
        <section id="home">
            <h2>Home Section</h2>
            <p>This is the home section of the webpage.</p>
        </section>
        <section id="about">
            <h2>About Section</h2>
            <p>This is the about section of the webpage.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Website</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>
`;

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").textContent = JSON.stringify(
    html2json(htmlExample),
    null,
    2,
  );
}

function showExample2() {
  const htmlExample = `<div>
<p>Hello world!</p>
  <button>Click me!</button>
  <textarea>Some very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long string.</textarea>
</div>
`;

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").textContent = JSON.stringify(
    html2json(htmlExample),
    null,
    2,
  );
}
