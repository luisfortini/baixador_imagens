const collator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

export function naturalCompare(left, right) {
  return collator.compare(String(left || ''), String(right || ''));
}
