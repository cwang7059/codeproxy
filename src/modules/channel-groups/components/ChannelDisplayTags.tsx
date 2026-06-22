export function ChannelDisplayTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <span aria-hidden="true" className="flex shrink-0 flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
        >
          {tag}
        </span>
      ))}
    </span>
  );
}
