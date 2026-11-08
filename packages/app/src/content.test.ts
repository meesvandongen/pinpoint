import { mediaUrl } from './content.ts'

describe('mediaUrl', () => {
  it('resolves files against the content root', () => {
    expect(mediaUrl('media/chimney.jpg', '/content')).toBe('/content/media/chimney.jpg')
    expect(mediaUrl('/media/a.mp3', '/content/')).toBe('/content/media/a.mp3')
  })
  it('leaves full URLs alone', () => {
    expect(mediaUrl('https://example.org/a.jpg', '/content')).toBe('https://example.org/a.jpg')
    expect(mediaUrl('//cdn.example.org/a.jpg', '/content')).toBe('//cdn.example.org/a.jpg')
    expect(mediaUrl('data:image/png;base64,AAAA', '/content')).toBe('data:image/png;base64,AAAA')
  })
})
