import { ParsedTranscriptData } from './types';

export const SEMAPHORE_IDENTITY_HEADER = 'x-semaphore-identity';
type Stack =
  | {
      type: 'object';
      symbol: string;
      range: [number, number];
      id: number;
    }
  | {
      type: 'array';
      symbol: string;
      range: [number, number];
      data: string;
      id: number;
    }
  | {
      type: 'object_key';
      symbol: string;
      range: [number, number];
      data: string;
      path: string;
      id: number;
      objectId: number;
    }
  | {
      type: 'object_value';
      symbol: string;
      range: [number, number];
      data: string;
      id: number;
      keyId: number;
      objectId: number;
    }
  | {
      type: 'object_value_string';
      symbol: string;
      range: [number, number];
      data: string;
      path: string;
      id: number;
      objectId: number;
      valueId: number;
    }
  | {
      type: 'object_value_number';
      symbol: string;
      range: [number, number];
      data: string;
      path: string;
      id: number;
      objectId: number;
      valueId: number;
    };

type Commitment = {
  name?: string;
  path?: string;
  start: number;
  end: number;
};

export function processJSON(str: string): Commitment[] {
  const json = JSON.parse(str);
  expect(typeof json === 'object', 'json string must be an object');

  const stack: Stack[] = [];
  const values: Stack[] = [];
  const keys: string[] = [];
  let nonce = 0,
    keyId = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    let last = stack[stack.length - 1];

    if (last?.type === 'object_key') {
      if (char === '"') {
        last.range[1] = i;
        const key = stack.pop();
        expect(key!.type === 'object_key');
        if (key?.type === 'object_key') {
          keys.push(key.data);
          key.path = keys.join('.');
          values.push(key);
          keyId = last.id;
        }
      } else {
        last.data = last.data + char;
      }
      continue;
    }

    if (last?.type === 'object_value_string') {
      if (char === '"') {
        last.range[1] = i;
        values.push(stack.pop()!);
        const objectValue = stack.pop();
        expect(
          objectValue?.type === 'object_value',
          'expect stack to be object_value',
        );
        objectValue!.range[1] = i;
        values.push(objectValue!);
        keys.pop();
      } else {
        last.data = last.data + char;
      }
      continue;
    }

    if (last?.type === 'array') {
      if (char === ']') {
        last.range[1] = i;
        values.push(stack.pop()!);
      } else if (char === '[') {
        stack.push({
          symbol: '[',
          type: 'array',
          id: nonce++,
          range: [i, -1],
          data: '',
        });
      } else {
        last.data = last.data + char;
      }
      continue;
    }

    if (last?.type === 'object_value_number') {
      if (char === ',' || char === '}') {
        last.range[1] = i - 1;
        values.push(stack.pop()!);
        const objectValue = stack.pop();
        expect(
          objectValue?.type === 'object_value',
          'expect stack to be object_value',
        );
        objectValue!.range[1] = i - 1;
        values.push(objectValue!);
        last = stack[stack.length - 1];
      } else {
        last.data = last.data + char;
        continue;
      }
    }

    if (last?.type === 'object_value') {
      if (char === '}') {
        last.range[1] = i - 1;
        values.push(stack.pop()!);
        const object = stack.pop();
        expect(object?.type === 'object_value', 'expect stack to be object');
        object!.range[1] = i;
        values.push(object!);
        keys.pop();
      } else if (char === ',') {
        last.range[1] = i - 1;
        values.push(stack.pop()!);
        keys.pop();
      } else if (char === '{') {
        stack.push({
          symbol: '{',
          type: 'object',
          id: nonce++,
          range: [i, -1],
        });
      } else if (char === '[') {
        stack.push({
          symbol: '[',
          type: 'array',
          id: nonce++,
          range: [i, -1],
          data: '',
        });
      } else if (char === '"') {
        stack.push({
          symbol: '"',
          type: 'object_value_string',
          objectId: last.objectId,
          valueId: last.id,
          id: nonce++,
          data: '',
          range: [i, -1],
          path: '',
        });
      } else if (/^\d$/.test(char)) {
        stack.push({
          symbol: '"',
          type: 'object_value_number',
          objectId: last.objectId,
          valueId: last.id,
          id: nonce++,
          data: '',
          range: [i, -1],
          path: '',
        });
      }
      continue;
    }

    if (last?.type === 'object') {
      switch (char) {
        case '}':
          last.range[1] = i;
          values.push(stack.pop()!);
          continue;
        case '"':
          stack.push({
            symbol: '"',
            type: 'object_key',
            objectId: last.id,
            id: nonce++,
            data: '',
            range: [i, -1],
            path: '',
          });
          continue;
        case ':':
          stack.push({
            symbol: ':',
            type: 'object_value',
            objectId: last.id,
            keyId: keyId,
            id: nonce++,
            range: [i, -1],
            data: '',
          });
          continue;
        default:
          continue;
      }
    }

    switch (char) {
      case '{':
        stack.push({
          symbol: '{',
          type: 'object',
          id: nonce++,
          range: [i, -1],
        });
        break;
      case '[':
        stack.push({
          symbol: '[',
          type: 'array',
          id: nonce++,
          range: [i, -1],
          data: '',
        });
        break;
    }
  }

  expect(!stack.length, 'invalid stack length');

  const commitments: {
    [key: string]: Commitment;
  } = {};

  for (const value of values) {
    if (value.type === 'object_key') {
      commitments[value.id] = {
        ...(commitments[value.id] || {}),
        path: value.path,
        start: value.range[0],
      };
    } else if (value.type === 'object_value') {
      commitments[value.keyId] = {
        ...(commitments[value.keyId] || {}),
        end: value.range[1] + 1,
      };
    } else if (value.type === 'object') {
      commitments[value.id] = {
        start: value.range[0],
        end: value.range[1] + 1,
      };
    } else if (value.type === 'array') {
      commitments[value.id] = {
        start: value.range[0],
        end: value.range[1] + 1,
      };
    }
  }

  return Object.values(commitments).map(({ path, start, end }) => ({
    path,
    start,
    end,
  }));
}

export function processTranscript(transcript: string): ParsedTranscriptData {
  // const commitments: Commitment[] = [];
  const returnVal: ParsedTranscriptData = {
    all: {
      start: 0,
      end: transcript.length,
    },
    info: {
      start: 0,
      end: transcript.indexOf('\n') + 1,
    },
    headers: {},
    lineBreaks: [],
  };

  let text = '',
    ptr = -1,
    lineIndex = 0,
    isBody = false;

  for (let i = 0; i < transcript.length; i++) {
    const char = transcript.charAt(i);

    if (char === '\r') {
      _processEOL(text, i, lineIndex++);
      returnVal.lineBreaks.push({
        start: i,
        end: i + 1,
      });
      continue;
    }

    if (char === '\n') {
      text = '';
      ptr = -1;
      returnVal.lineBreaks.push({
        start: i,
        end: i + 1,
      });
      continue;
    }

    if (ptr === -1) {
      ptr = i;
    }

    text = text + char;
  }

  _processEOL(text, transcript.length - 1, lineIndex++);

  return returnVal;

  function _processEOL(txt: string, index: number, lineIndex: number) {
    try {
      if (!txt) return;
      if (!isNaN(Number(txt))) {
        isBody = true;
        return;
      }

      const json = JSON.parse(txt);

      returnVal.body = {
        start: ptr,
        end: index,
      };

      if (typeof json === 'object') {
        const jsonCommits = processJSON(txt);
        jsonCommits.forEach((commit) => {
          if (commit.path) {
            returnVal.json = returnVal.json || {};
            returnVal.json[commit.path] = {
              start: commit.start + ptr,
              end: commit.end + ptr,
            };
          }
        });
      }
    } catch (e) {
      const [name, value] = txt.split(': ');
      if (lineIndex === 0) {
        returnVal.info = {
          start: ptr,
          end: index,
        };
      } else if (!isBody && value) {
        returnVal.headers = returnVal.headers || {};
        returnVal.headers[name.toLowerCase()] = {
          start: ptr,
          end: index,
        };
      } else if (isBody) {
        returnVal.body = {
          // value: txt,
          start: ptr,
          end: index,
        };
      }
    }
  }
}

export function expect(cond: any, msg = 'invalid expression') {
  if (!cond) throw new Error(msg);
}

export function stringToBuffer(str: string): number[] {
  return Buffer.from(str).toJSON().data;
}

export function arrayToHex(uintArr: Uint8Array): string {
  return Buffer.from(uintArr).toString('hex');
}

export function headerToMap(headers: {
  [name: string]: string;
}): Map<string, number[]> {
  const headerMap: Map<string, number[]> = new Map();
  Object.entries(headers).forEach(([key, value]) => {
    headerMap.set(key, stringToBuffer(value));
  });
  return headerMap;
}
