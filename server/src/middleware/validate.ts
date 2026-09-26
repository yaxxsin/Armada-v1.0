import { z } from 'zod';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Data tidak valid.',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.validated = result.data;
    next();
  };
}

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, 'Password minimal 12 karakter'),
  name: z.string().optional(),
  inviteCode: z.string().optional(),
  bootstrapToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const num = z.preprocess(emptyToNull, z.coerce.number().int().nonnegative().nullable());
const dateStr = z.preprocess(emptyToNull, z.string().date().nullable());

export const photoDataUrl = z
  .string()
  .max(500_000, 'Ukuran foto kendaraan terlalu besar')
  .refine((value) => value.startsWith('data:image/'), 'Foto kendaraan harus berupa gambar');

export const vehicleSchema = z.object({
  merk: z.string().min(1, 'Merk wajib diisi'),
  plat: z.string().min(1, 'Plat nomor wajib diisi'),
  tahun: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  lokasi: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  pic: z.preprocess(emptyToNull, z.string().max(120, 'PIC maksimal 120 karakter').nullable()).optional(),
  pajakTahunanBerlaku: dateStr.optional(),
  pajak5TahunanBerlaku: dateStr.optional(),
  keurBerlaku: dateStr.optional(),
  intervalKm: num.optional(),
  intervalBulan: num.optional(),
  kmSekarang: num.optional(),
  catatan: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  foto: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  photos: z.preprocess(emptyToNull, z.array(photoDataUrl).max(4, 'Maksimal 4 foto kendaraan').nullable()).optional(),
});

export const historySchema = z.object({
  tanggal: z.string().date(),
  km: num.optional(),
  jenis: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  biaya: num.optional(),
  bengkel: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  struk: z.preprocess(
    emptyToNull,
    z.string().max(500_000, 'Foto struk terlalu besar').nullable().optional().refine(
      (value) => value === null || value === undefined || value.startsWith('data:image/'),
      'Struk harus berupa file gambar.'
    )
  ),
});
