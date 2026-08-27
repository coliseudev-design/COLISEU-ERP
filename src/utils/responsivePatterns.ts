/** Padrões de classes Tailwind padronizados para responsividade
 *  
 *  Breakpoints Tailwind padrão:
 *  - Base (< 640px): Phones — TUDO single column
 *  - sm (≥ 640px): Tablets portrait — 2 colunas
 *  - md (≥ 768px): Tablets landscape — 3 colunas
 *  - lg (≥ 1024px): Desktops — 4 colunas
 *  - xl (≥ 1280px): Widescreen — 5 colunas
 */
export const RP = {
  // Grids — MOBILE FIRST: base = 1 col, sm = 2 cols, md = 3...
  gridKPI5:   'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4',
  gridKPI4:   'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
  gridKPI3:   'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4',
  gridCards:  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',
  gridHalf:   'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4',
  gridThird:  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',

  // Padding — progressivo
  padPage:   'p-3 sm:p-4 md:p-5 lg:p-6',
  padCard:   'p-3 sm:p-4 md:p-5',

  // Text — legível em mobile
  textLabel:  'text-[11px] sm:text-xs font-medium text-text-secondary uppercase tracking-wide',
  textValue:  'text-lg sm:text-xl md:text-2xl font-semibold text-text-primary',
  textTitle:  'text-sm sm:text-base md:text-lg font-bold',

  // Filtros
  filterWrap: 'flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap',
  filterItem: 'w-full sm:w-auto',

  // Gráficos — alturas mínimas responsivas
  chartH:     'min-h-[220px] sm:min-h-[280px] lg:min-h-[320px]',
  chartHSm:   'min-h-[180px] sm:min-h-[240px] lg:min-h-[280px]',
} as const
