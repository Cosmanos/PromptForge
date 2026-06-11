import sql from './database'

// `hint` is the applies-when text (what Analyze matches against);
// `rewrite_instructions` is what Rewrite weaves into the prompt.
const PREDEFINED_TAGS = [
  {
    name: 'Structured Output',
    hint: 'The expected response is long or list-like and would be easier to read with explicit structure.',
    rewrite_instructions:
      'Format your response using clear headers, bullet points, or numbered lists for easy reading.',
    sort_order: 0,
  },
  {
    name: 'Be Critical',
    hint: 'The prompt asks for an evaluation, review, or recommendation where weaknesses and risks matter.',
    rewrite_instructions:
      'Critically evaluate the subject. Point out weaknesses, risks, and counterarguments alongside strengths.',
    sort_order: 1,
  },
  {
    name: 'Beginner Friendly',
    hint: 'The audience may lack background knowledge, or the topic is technical enough to need plain language.',
    rewrite_instructions:
      'Explain as if the reader has no prior knowledge. Avoid jargon; define any technical terms used.',
    sort_order: 2,
  },
  {
    name: 'Use Examples',
    hint: 'The prompt explains concepts or instructions that become clearer with concrete illustrations.',
    rewrite_instructions: 'Illustrate every key concept with a concrete, real-world example.',
    sort_order: 3,
  },
  {
    name: 'Step-by-Step',
    hint: 'The prompt asks how to do something, or describes a process or procedure.',
    rewrite_instructions: 'Break your response into clear, numbered sequential steps.',
    sort_order: 4,
  },
  {
    name: 'Be Concise',
    hint: 'The output is likely to run long, or the reader only needs the essentials.',
    rewrite_instructions:
      'Keep the response as short as possible without sacrificing accuracy. No filler sentences.',
    sort_order: 5,
  },
  {
    name: 'Think Aloud',
    hint: 'The task involves reasoning, analysis, or judgment where seeing the logic matters.',
    rewrite_instructions: 'Show your reasoning process explicitly before arriving at a conclusion.',
    sort_order: 6,
  },
  {
    name: 'Use Analogies',
    hint: 'The topic is abstract or unfamiliar and benefits from comparison to everyday ideas.',
    rewrite_instructions:
      'Explain complex ideas using relatable analogies or comparisons to familiar concepts.',
    sort_order: 7,
  },
]

// Pairs that pull a rewrite in opposite directions (warn-only, bidirectional).
const COUNTER_PAIRS: [string, string][] = [
  ['Be Concise', 'Think Aloud'],
  ['Be Concise', 'Use Examples'],
]

// Seeds the admin template (default_tags). Per-user `tags` are created by
// copying this template at provisioning time, never seeded directly.
export async function seedDefaultTags(): Promise<void> {
  const [{ c }] = await sql<[{ c: string }]>`SELECT COUNT(*) as c FROM default_tags`
  if (Number(c) > 0) return

  await sql`
    INSERT INTO default_tags ${sql(PREDEFINED_TAGS, 'name', 'hint', 'rewrite_instructions', 'sort_order')}
  `
  for (const [a, b] of COUNTER_PAIRS) {
    await sql`
      INSERT INTO default_tag_counter_tags (tag_id, counter_tag_id)
      SELECT LEAST(ta.id, tb.id), GREATEST(ta.id, tb.id)
      FROM default_tags ta, default_tags tb
      WHERE ta.name = ${a} AND tb.name = ${b}
      ON CONFLICT DO NOTHING
    `
  }
  console.log('✅ Default tags seeded')
}
