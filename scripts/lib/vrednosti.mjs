/**
 * Admin API prima svaku metafield vrednost kao string. Kako se string
 * formira zavisi od tipa i to je najcesci izvor tihih gresaka pri seed-u:
 * pogresno kodirana vrednost prolazi bez userError-a i zavrsi kao prazno
 * polje u temi. Zato je mapiranje na jednom mestu i pod testom.
 */
const VALUTA = 'RSD';
const SKALA_OCENE = { scale_min: '1', scale_max: '5' };

export function kodirajVrednost(tip, vrednost) {
  switch (tip) {
    case 'single_line_text_field':
    case 'multi_line_text_field':
    case 'date':
      return String(vrednost);

    case 'number_integer':
    case 'number_decimal':
      return String(vrednost);

    case 'boolean':
      return vrednost ? 'true' : 'false';

    case 'list.single_line_text_field':
    case 'list.date':
    case 'list.metaobject_reference':
      return JSON.stringify(vrednost);

    case 'rating':
      return JSON.stringify({ value: String(vrednost), ...SKALA_OCENE });

    case 'money':
      return JSON.stringify({ amount: String(vrednost), currency_code: VALUTA });

    default:
      throw new Error(`Nepoznat tip metafielda: ${tip}`);
  }
}
