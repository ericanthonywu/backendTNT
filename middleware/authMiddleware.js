const jwt = require('jsonwebtoken')

exports.authMiddleware = (req, res, next) => {
    const {token, role} = req.body
    if (!token) return res.status(400).json()
    jwt.verify(token, process.env.JWTTOKEN, (err, data) => {
        if (err) {
            res.status(419).json(err)
            if (req.files) {
                for (let i = 0; i < req.files.length; i++) {
                    fs.unlinkSync(path.join(__dirname, `../uploads/${req.dest}/${req.files[i].filename}`))
                }
            } else if (req.file) {
                fs.unlinkSync(path.join(__dirname, `../uploads/${req.dest}/${req.file.filename}`))
            }
            return;
        }

        // if (data.role !== role){
        //     return res.status(403).json()
        // }

        // TODO: ADD SECURITY ROLE IN JWT

        res.userData = data;
        next()
    })
}
