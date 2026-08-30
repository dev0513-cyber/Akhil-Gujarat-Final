import { vi } from 'vitest';

export const createMockBuilder = (resolvedValue: unknown) => {
  type ChainMock = ReturnType<typeof vi.fn>;
  const builder: Record<string, ChainMock> & {
    then: (resolve: (val: unknown) => void) => void;
  } = {} as Record<string, ChainMock> & {
    then: (resolve: (val: unknown) => void) => void;
  };
  const methods = ['select', 'eq', 'neq', 'not', 'or', 'order', 'range', 'single', 'maybeSingle', 'insert', 'update', 'delete', 'in', 'limit', 'gte', 'lt'];
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (val: unknown) => void) => resolve(resolvedValue);
  return builder;
};
