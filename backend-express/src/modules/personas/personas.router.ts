import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import { asyncHandler } from '@/shared/async-handler.js'
import { AppError } from '@/shared/errors.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { personasController } from './personas.controller.js'
import { CreatePersonaSchema, UpdatePersonaSchema, ParseResumeSchema } from './personas.schema.js'

const MAX_PDF_BYTES = 5 * 1024 * 1024

// In-memory only — the PDF is parsed to text and discarded; nothing is stored.
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new AppError('VALIDATION_ERROR', 'Only PDF files are accepted'))
  },
})

// Multer reports upload problems (e.g. the size cap) as MulterError, which the
// error middleware would surface as a 500. Translate it to AppError so clients
// get the standard VALIDATION_ERROR envelope; our fileFilter AppError and a
// clean pass (err === undefined) flow through `next` untouched.
const pdfUpload: RequestHandler = (req, res, next) => {
  uploadPdf.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'PDF must be 5 MB or smaller' : `Upload failed: ${err.message}`
      next(new AppError('VALIDATION_ERROR', message, err))
      return
    }
    next(err)
  })
}

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(personasController.list))
router.post('/', validate(CreatePersonaSchema), asyncHandler(personasController.create))
router.post('/parse-resume', pdfUpload, validate(ParseResumeSchema), asyncHandler(personasController.parseResume))
router.get('/:id', asyncHandler(personasController.get))
router.patch('/:id', validate(UpdatePersonaSchema), asyncHandler(personasController.update))
router.delete('/:id', asyncHandler(personasController.remove))

export { router as personasRouter }
