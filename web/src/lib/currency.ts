const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NON_DIGIT_REGEX = /\D/g;

export function formatBrlCurrency(value: number) {
  return formatter.format(Number.isFinite(value) ? value : 0);
}

function getDigitSequence(input: string | null | undefined) {
  return String(input || '').replace(NON_DIGIT_REGEX, '');
}

function formatIntegerReais(digits: string) {
  const normalized = digits.replace(/^0+(?=\d)/, '');

  if (!normalized) {
    return '';
  }

  return formatBrlCurrency(Number(normalized));
}

export function parseLooseBrlCurrency(input: string | null | undefined) {
  const source = String(input || '').trim();

  if (!source) {
    return null;
  }

  const sanitized = source.replace(/[^\d,]/g, '');
  if (!sanitized) {
    return null;
  }

  if (sanitized.includes(',')) {
    const [rawInteger, rawDecimal = ''] = sanitized.split(',');
    const integerDigits = rawInteger.replace(/\D/g, '') || '0';
    const decimalDigits = rawDecimal.replace(/\D/g, '').slice(0, 2).padEnd(2, '0');

    return Number(`${integerDigits}.${decimalDigits}`);
  }

  const integerDigits = sanitized.replace(/\D/g, '');
  if (!integerDigits) {
    return null;
  }

  return Number(integerDigits);
}

export function formatCurrencyInput(input: string, previousValue = '') {
  const source = String(input || '');
  if (!source.trim()) {
    return '';
  }

  const currentDigits = getDigitSequence(source);
  if (!currentDigits) {
    return '';
  }

  const previousDigits = getDigitSequence(previousValue);
  if (previousDigits) {
    const previousIntegerDigits = previousDigits.slice(0, -2);

    if (currentDigits.startsWith(previousDigits) && currentDigits.length > previousDigits.length) {
      const appendedDigits = currentDigits.slice(previousDigits.length);
      return formatIntegerReais(`${previousIntegerDigits}${appendedDigits}`);
    }

    if (
      previousDigits.startsWith(currentDigits) &&
      currentDigits.length === previousDigits.length - 1
    ) {
      return formatIntegerReais(previousIntegerDigits.slice(0, -1));
    }
  }

  if (/[,.]|R\$/i.test(source)) {
    const amount = parseLooseBrlCurrency(source);
    return amount === null ? '' : formatBrlCurrency(amount);
  }

  return formatIntegerReais(currentDigits);
}

export function normalizeApiPrice(price: string | null | undefined) {
  const amount = parseLooseBrlCurrency(price);
  return amount === null ? '' : formatBrlCurrency(amount);
}
