/* istanbul ignore file */
const assert = require('assert')

assert.isType = (type: any, thing: any, message: string) => {
  assert.strictEqual(typeof thing, type, message)
}

const types = [
  'String',
  'Function',
  'Boolean',
  'Number',
  'Float',
  'Buffer',
  'Object',
]
for (const type of types) {
  const fnName = `is${type}`
  assert[fnName] = assert.isType.bind(null, type.toLowerCase())
}

assert.isArray = (thing: any, message: string) => {
  assert(Array.isArray(thing), message)
}

assert.isNotArray = (thing: any, message: string) => {
  assert(!Array.isArray(thing), message)
}

assert.isDefined = (thing: any, message: string) => {
  assert.notStrictEqual(typeof thing, 'undefined', message)
}

assert.isObjectLiteral = (thing: any, message: string) => {
  assert.isDefined(thing, message)
  assert.isNotArray(thing, message)
  assert.isObject(thing, message)
}

assert.isUndefined = (thing: any, message: string) => {
  assert.strictEqual(typeof thing, 'undefined', message)
}

assert.onlyString = [4, {}, [], true, false, undefined]
assert.onlyNumber = ['string', {}, [], true, false, undefined]
assert.onlyObject = [4, 'string', [], true, false, undefined]
assert.onlyArray = [4, {}, 'string', true, false, undefined]
assert.onlyBool = [4, {}, [], 'string', undefined]
assert.onlyUndefined = [4, {}, [], true, false]

assert.errorSays = (fn: Function, arg: any, message: string) => {
  try {
    fn(arg)
    throw new Error('expected error')
  } catch (error) {
    assert.strictEqual(error.message, message)
  }
}
export { assert }
