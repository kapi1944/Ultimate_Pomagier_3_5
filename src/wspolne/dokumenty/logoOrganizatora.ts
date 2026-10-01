export function pobierzLogoOrganizatora(organizator: 'SEMPER' | 'IIST') {
  return organizator === 'IIST' ? '/logo-iist.png' : '/logo-semper-program.png'
}
