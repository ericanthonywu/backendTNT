const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyparser = require('body-parser');
const jwt = require('jsonwebtoken');
const io = require('socket.io')()

require('dotenv').config({path: ".env"});

const {user: User, vet: Vet, clinic: Clinic} = require('./model')

const app = express();

app.io = io

io.on('connection', connection => {
    const {id, client} = connection.handshake.query
    if (id && client) {
        switch (client) {
            case "user":
                User.findByIdAndUpdate(id, {
                    socketId: connection.id
                }).catch(console.log)
                break;
            case "vet":
                Vet.findByIdAndUpdate(id, {
                    socketId: connection.id
                }).catch(console.log)
                break;
            case "clinic":
                Clinic.findByIdAndUpdate(id, {
                    socketId: connection.id
                }).catch(console.log)
        }
    }
})

app.use((req, res, next) => { //global socket
    req.io = io
    next()
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const userRouter = require('./routes/user');
const vetRouter = require('./routes/vet')
const clinicRouter = require('./routes/clinic')
const adminRouter = require('./routes/admin')

//handle token route
app.use('/checkValidToken', (req, res) => {
    const {token} = req.body
    if (!token) return res.status(400).json()
    jwt.verify(token, process.env.JWTTOKEN, (err, data) => {
        if (err) {
            res.status(419).json(err)
            if (req.files) {
                for (let i = 0; i < req.files.length; i++) {
                    fs.unlinkSync(path.join(__dirname, `uploads/${req.dest}/${req.files[i].filename}`))
                }
            } else if (req.file) {
                fs.unlinkSync(path.join(__dirname, `uploads/${req.dest}/${req.file.filename}`))
            }
            return;
        }

        return res.status(200).json({
            role: data.role
        })
    })
});

app.use('/user', userRouter);
app.use('/vet', vetRouter);
app.use('/admin', adminRouter);
app.use('/clinic', clinicRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;
