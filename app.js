const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyparser = require('body-parser');
const io = require('socket.io')()
require('dotenv').config({path: ".env"});
const {user: User, vet: Vet} = require('./model')

const app = express();

app.io = io

io.on('connection', connection => {
    const {id, client} = connection.handshake.query
    if (id && client) {
        if (client === "user") {
            User.findByIdAndUpdate(id, {
                socketId: connection.id
            }).catch(console.log)
        } else {
            Vet.findByIdAndUpdate(id, {
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
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))


const userRouter = require('./routes/user');
const vetRouter = require('./routes/vet')

app.use('/user', userRouter);
app.use('/vet', vetRouter);

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

// mongoose.connection.close()
module.exports = app;
