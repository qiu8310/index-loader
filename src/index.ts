let myVar: StringOrNumber = 1
type StringOrNumber = string | number

export function example() {
  console.log(myVar)
  noop()
  return true
}

function noop() {}
