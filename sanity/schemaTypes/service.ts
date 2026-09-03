import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'service',
  title: 'Service',
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
      name: 'headline',
      title: 'Headline',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'heroVideo',
      title: 'Hero Video URL',
      type: 'url',
    }),
    defineField({
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'title', title: 'Feature Title', type: 'string'},
            {name: 'description', title: 'Description', type: 'text', rows: 2},
          ],
        },
      ],
    }),
    defineField({
      name: 'sections',
      title: 'Additional Sections',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'textBlock',
          title: 'Text Block',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
        {
          type: 'object',
          name: 'imageBlock',
          title: 'Image',
          fields: [
            {name: 'image', type: 'image', options: {hotspot: true}},
            {name: 'caption', type: 'string'},
          ],
        },
        {
          type: 'object',
          name: 'videoBlock',
          title: 'Video',
          fields: [
            {name: 'url', type: 'url'},
            {name: 'caption', type: 'string'},
          ],
        },
      ],
    }),
  ],
})
