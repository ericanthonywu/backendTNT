const multer = require('multer')
const path = require('path')

exports.uploadPet = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            req.dest = "pet";
            cb(null, path.join(__dirname, `../uploads/${req.dest}`))
        },
        filename: (req, file, cb) => {
            cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname.trim())
        }
    }),
    limits: {
        fileSize: 1024 * 1024 * 5
    },
});

exports.uploadChat = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            req.dest = "chat";
            cb(null, path.join(__dirname, `../uploads/${req.dest}`))
        },
        filename: (req, file, cb) => {
            cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname.trim())
        }
    }),
    limits: {
        fileSize: 1024 * 1024 * 5
    },
});

exports.uploadVet = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            req.dest = "vet";
            cb(null, path.join(__dirname, `../uploads/${req.dest}`))
        },
        filename: (req, file, cb) => {
            cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname.trim() + ".jpg")
        }
    }),
    limits: {
        fileSize: 1024 * 1024 * 5
    },
});
