type TagFiltersProps = {
  tags: string[]
  selectedTag: string
  onTagChange: (tag: string) => void
}

export default function TagFilters({
  tags,
  selectedTag,
  onTagChange
}: TagFiltersProps) {
  console.log(tags)
  return (
    <div className='flex flex-wrap gap-2'>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTagChange(tag)}
          className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
            tag === selectedTag
              ? 'border-zinc-950 bg-zinc-950 text-white shadow-sm'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-teal-600 hover:text-teal-700'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
