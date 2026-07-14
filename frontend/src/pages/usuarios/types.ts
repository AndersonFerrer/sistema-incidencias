export type PaginationCursor = {
  offset: number
  limit: number
  hasMore: boolean
}

export type FilterState = {
  texto: string
  rol: string
  activo: boolean | null
}

export type DialogMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; userId: string }
  | { kind: "password"; userId: string }