import { prisma } from '../src/lib/prisma'

/** User  →  Post  →  Photo
 *                →  (Tag → PostTag) 
 * await prisma.post.create({
  data: {
    title: 'Sunset over Hanoi',
    slug: 'sunset-over-hanoi',
    content: { type: 'doc', content: [] },     // Tiptap-shaped JSON
    author: { connect: { id: user.id } },       // link to an EXISTING user
    photos: {
      create: [                                  // CREATE new photos, nested
        { key: 'photos/abc.jpg', position: 0 },
        { key: 'photos/def.jpg', position: 1 },
      ],
    },
  },
});
*/

async function main() {
  // 0. wipe in FK-safe order so the seed is re-runnable
  await prisma.post.deleteMany() // cascades photos + clears the _PostToTag join rows
  await prisma.tag.deleteMany()
  await prisma.user.deleteMany()

  // 1. Tags (no dependencies — create first)
  const travel = await prisma.tag.create({ data: { name: 'travel' } })
  const street = await prisma.tag.create({ data: { name: 'street' } })
  const portrait = await prisma.tag.create({ data: { name: 'portrait' } })

  const quan = await prisma.user.create({
    data: {
      username: 'quan',
      name: 'Quan Nguyen',
      email: 'contact@pholio.dev',
      password: 'password',
      bio: "I'm a photographer and developer."
    }
  })

  const han = await prisma.user.create({
    data: {
      username: 'han',
      name: 'Han Nguyen',
      email: 'han@pholio.dev',
      password: 'placeholder',
      bio: "I'm a wife of a photographer and developer."
    }
  })

  // 3. Posts + nested photos + tags
  await prisma.post.create({
    data: {
      title: 'Sunset over the Saigon River',
      slug: 'sunset-saigon-river',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Golden hour on the river.' }]
          }
        ]
      },
      published: true,
      author: { connect: { id: quan.id } },
      photos: {
        create: [
          {
            key: 'seed/saigon-river-1.jpg',
            caption: 'Boats at dusk',
            position: 0
          },
          {
            key: 'seed/saigon-river-2.jpg',
            caption: 'Reflections on the water',
            position: 1
          }
        ]
      },
      tags: { connect: { id: travel.id } }
    }
  })

  await prisma.post.create({
    data: {
      title: 'District 1 at Night',
      slug: 'district-1-night',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'The city never sleeps.' }]
          }
        ]
      },
      published: true,
      author: { connect: { id: quan.id } },
      photos: {
        create: [{ key: 'seed/district1-night-1.jpg', position: 0 }]
      },
      tags: { connect: { id: street.id } }
    }
  })

  await prisma.post.create({
    data: {
      title: 'Draft: Ben Thanh at Dawn',
      slug: 'ben-thanh-dawn-draft',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Work in progress.' }]
          }
        ]
      },
      published: false,
      author: { connect: { id: quan.id } },
      photos: {
        create: [{ key: 'seed/ben-thanh-1.jpg', position: 0 }]
      }
    }
  })

  await prisma.post.create({
    data: {
      title: 'Portraits from Ben Thanh Market',
      slug: 'portraits-ben-thanh-market',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Faces of the market.' }]
          }
        ]
      },
      published: true,
      author: { connect: { id: han.id } },
      photos: {
        create: [
          { key: 'seed/portrait-1.jpg', position: 0 },
          { key: 'seed/portrait-2.jpg', position: 1 },
          { key: 'seed/portrait-3.jpg', position: 2 }
        ]
      },
      tags: { connect: { id: portrait.id } }
    }
  })

  const [userCount, postCount, photoCount, tagCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.photo.count(),
    prisma.tag.count()
  ])

  console.log(
    `Seeded: ${userCount} users, ${postCount} posts, ${photoCount} photos, ${tagCount} tags`
  )
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
