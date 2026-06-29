import type { Tag } from '../types/models';
import { cn } from '../lib/utils';

interface TagChipProps {
  tag: Tag;
  className?: string;
  size?: 'sm' | 'xs';
}

export function tagChipStyle(color: string) {
  return {
    backgroundColor: `${color}22`,
    color,
    borderColor: `${color}55`,
  } as const;
}

export function TagChip({ tag, className, size = 'sm' }: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[120px] items-center truncate rounded border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-1 py-px text-[9px]',
        className
      )}
      style={tagChipStyle(tag.color)}
      title={tag.name}
    >
      {tag.name}
    </span>
  );
}

export function TagDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full', className)}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
