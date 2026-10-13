import type { Modifier } from '@dnd-kit/core';

const restrictToGrid: Modifier = ({ transform, draggingNodeRect, containerNodeRect }) => {
  if (!draggingNodeRect || !containerNodeRect) return transform;
  return {
    ...transform,
    x: Math.max(
      containerNodeRect.left - draggingNodeRect.left,
      Math.min(transform.x, containerNodeRect.right - draggingNodeRect.right)
    ),
    y: Math.max(
      containerNodeRect.top - draggingNodeRect.top,
      Math.min(transform.y, containerNodeRect.bottom - draggingNodeRect.bottom)
    )
  };
};

export const dragModifiers = [restrictToGrid];
