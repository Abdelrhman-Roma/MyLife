export interface ApiResponse<T> {
  data: T
  error: string | null
  loading: boolean
}

export interface Timestamp {
  toDate(): Date
  seconds: number
  nanoseconds: number
}

export interface PageMetadata {
  title: string
  description: string
  path: string
}
