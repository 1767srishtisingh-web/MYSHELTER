'use strict';

function stripJsComments(code) {
  let output = '';
  let i = 0;
  const len = code.length;

  if (code.startsWith('#!')) {
    const end = code.indexOf('\n');
    if (end === -1) return code;
    output += code.slice(0, end + 1);
    i = end + 1;
  }

  let lastToken = '';

  function isRegexAllowed(prevToken) {
    if (!prevToken) return true;
    const punctuation = '(=[{(,:;?!&|+-*^%~<>*/';
    if (punctuation.includes(prevToken.slice(-1))) return true;
    const keywords = ['return', 'typeof', 'instanceof', 'case', 'delete', 'throw', 'void', 'await', 'yield', 'else', 'do', 'in', 'of'];
    return keywords.includes(prevToken);
  }

  while (i < len) {
    const char = code[i];
    const next = code[i + 1];

    if (char === '/' && next === '/') {
      while (i < len && code[i] !== '\n') {
        i++;
      }
      if (i < len && code[i] === '\n') {
        output += '\n';
        i++;
      }
      continue;
    }

    if (char === '/' && next === '*') {
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') output += '\n';
        i++;
      }
      if (i < len) i += 2;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      const quote = char;
      output += quote;
      i++;
      while (i < len) {
        const c = code[i];
        output += c;
        if (c === '\\') {
          if (i + 1 < len) {
            output += code[i + 1];
            i += 2;
            continue;
          }
        } else if (c === quote) {
          i++;
          break;
        }
        i++;
      }
      lastToken = 'string';
      continue;
    }

    if (char === '/' && isRegexAllowed(lastToken)) {
      output += char;
      i++;
      let inCharClass = false;
      while (i < len) {
        const c = code[i];
        output += c;
        if (c === '\\') {
          if (i + 1 < len) {
            output += code[i + 1];
            i += 2;
            continue;
          }
        } else if (c === '[') {
          inCharClass = true;
        } else if (c === ']' && inCharClass) {
          inCharClass = false;
        } else if (c === '/' && !inCharClass) {
          i++;
          while (i < len && /[a-z]/i.test(code[i])) {
            output += code[i];
            i++;
          }
          break;
        }
        i++;
      }
      lastToken = 'regex';
      continue;
    }

    output += char;
    if (!/\s/.test(char)) {
      if (/[a-zA-Z0-9_$]/.test(char)) {
        if (lastToken === 'ident' || lastToken === 'string' || lastToken === 'regex') {
          lastToken += char;
        } else {
          lastToken = char;
        }
      } else {
        lastToken = char;
      }
    }
    i++;
  }

  return output;
}

function stripCssComments(css) {
  let output = '';
  let i = 0;
  const len = css.length;

  while (i < len) {
    const char = css[i];
    const next = css[i + 1];

    if (char === '/' && next === '*') {
      i += 2;
      while (i < len && !(css[i] === '*' && css[i + 1] === '/')) {
        if (css[i] === '\n') output += '\n';
        i++;
      }
      if (i < len) i += 2;
      continue;
    }

    if (char === '\'' || char === '"') {
      const quote = char;
      output += quote;
      i++;
      while (i < len) {
        const c = css[i];
        output += c;
        if (c === '\\') {
          if (i + 1 < len) {
            output += css[i + 1];
            i += 2;
            continue;
          }
        } else if (c === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    output += char;
    i++;
  }

  return output;
}

function stripHtmlComments(html) {
  return html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
}

module.exports = {
  stripJsComments,
  stripCssComments,
  stripHtmlComments
};

