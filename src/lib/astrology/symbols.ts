// Browser-safe constants — NO swisseph import, safe to use in Client Components

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆',
  Pluto: '♇', 'True Node': '☊', Chiron: '⚷', Vertex: 'Vx',
  Asc: 'AC', MC: 'MC', 'South Node': '☋',
}

export const ZODIAC_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']

// Aspect grid: 10 core planets + Asc + MC (12 objects)
export const ASPECT_TABLE_OBJECTS = [
  'Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn',
  'Uranus','Neptune','Pluto','Asc','MC',
]
