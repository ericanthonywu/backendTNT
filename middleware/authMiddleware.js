const jwt = require('jsonwebtoken')

exports.authMiddleware = (req, res, next) => {
    if (!req.body.token) return res.status(419).json()
    jwt.verify(req.body.token, process.env.JWTTOKEN, (err, data) => {
        if (err) {
            if (req.files) {
                for (let i = 0; i < req.files.length; i++) {
                    fs.unlinkSync(path.join(__dirname, `../uploads/${req.dest}/${req.files[i].filename}`))
                }
            } else if (req.file) {
                fs.unlinkSync(path.join(__dirname, `../uploads/${req.dest}/${req.file.filename}`))
            }
            return res.status(419).json(err);
        }
        res.userData = data;
        next()
    })
}
