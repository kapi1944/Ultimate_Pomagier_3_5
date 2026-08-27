type UstawieniaPrzygotowaniaEksportu = {
  przygotuj?: () => void | Promise<void>
  wykonaj: () => void | Promise<void>
  zakoncz?: () => void
}

export async function wykonajEksportPoPrzygotowaniu({ przygotuj, wykonaj, zakoncz }: UstawieniaPrzygotowaniaEksportu) {
  try {
    await przygotuj?.()
    await wykonaj()
  } finally {
    zakoncz?.()
  }
}
