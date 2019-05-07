describe('error', () => {
  test('key no in map', () => {
    expect(() => {
      throw new Error('x')
    }).toThrow()
  })
})
