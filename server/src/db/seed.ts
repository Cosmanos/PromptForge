import db from './database'

const PREDEFINED_TAGS = [
  {
    name: 'Structured Output',
    hint: 'Format your response using clear headers, bullet points, or numbered lists for easy reading.',
    sort_order: 0,
  },
  {
    name: 'Be Critical',
    hint: 'Critically evaluate the subject. Point out weaknesses, risks, and counterarguments alongside strengths.',
    sort_order: 1,
  },
  {
    name: 'Beginner Friendly',
    hint: 'Explain as if the reader has no prior knowledge. Avoid jargon; define any technical terms used.',
    sort_order: 2,
  },
  {
    name: 'Use Examples',
    hint: 'Illustrate every key concept with a concrete, real-world example.',
    sort_order: 3,
  },
  {
    name: 'Step-by-Step',
    hint: 'Break your response into clear, numbered sequential steps.',
    sort_order: 4,
  },
  {
    name: 'Be Concise',
    hint: 'Keep the response as short as possible without sacrificing accuracy. No filler sentences.',
    sort_order: 5,
  },
  {
    name: 'Think Aloud',
    hint: 'Show your reasoning process explicitly before arriving at a conclusion.',
    sort_order: 6,
  },
  {
    name: 'Use Analogies',
    hint: 'Explain complex ideas using relatable analogies or comparisons to familiar concepts.',
    sort_order: 7,
  },
]

export function seedTags() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM tags').get() as { c: number }).c
  if (count > 0) return

  const insert = db.prepare(
    'INSERT INTO tags (name, hint, sort_order) VALUES (@name, @hint, @sort_order)'
  )
  const insertMany = db.transaction((tags: typeof PREDEFINED_TAGS) => {
    for (const tag of tags) insert.run(tag)
  })
  insertMany(PREDEFINED_TAGS)
  console.log('✅ Tags seeded')
}
