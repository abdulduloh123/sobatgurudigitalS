export type Role = 'admin' | 'cs' | 'pending'

export interface Sample {
  id: string
  file_name: string
  mime_type: string
  drive_path: string | null
  jenjang: string | null
  kelas: string | null
  mapel: string | null
  versi_buku: string | null
  jenis_dokumen: string | null
  topik: string | null
  kata_kunci: string[]
  paket_produk: string | null
  boleh_dikirim: boolean
  is_missing: boolean
}
