import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: ['UX/UI Design', 'Branding', 'Website', 'Social Media', 'Logo & Branding'],
      },
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'sections',
      title: 'Content Sections',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'textBlock',
          title: 'Text Block',
          fields: [
            {
              name: 'content',
              title: 'Content',
              type: 'array',
              of: [{type: 'block'}],
            },
          ],
        },
        {
          type: 'object',
          name: 'imageBlock',
          title: 'Image',
          fields: [
            {name: 'image', title: 'Image', type: 'image', options: {hotspot: true}},
            {name: 'caption', title: 'Caption', type: 'string'},
          ],
        },
        {
          type: 'object',
          name: 'videoBlock',
          title: 'Video',
          fields: [
            {name: 'url', title: 'Video URL', type: 'url'},
            {name: 'caption', title: 'Caption', type: 'string'},
          ],
        },
      ],
    }),
  ],
})
