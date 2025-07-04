import express from 'express'
const app = express()
import bodyParser from 'body-parser'
import cors from 'cors'

import * as dotenv from 'dotenv'

dotenv.config()

import mongoose from 'mongoose'

import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)

const __dirname = dirname(__filename)


console.log('connecting to db...')

const connectToDataBase = () => {
  mongoose.connect(process.env.MLAB_URI)
    .then(() => {
      console.log("Connected To DB Sucessfully....")
    })
    .catch((err) => {
      console.log('throwing an error...')
      console.log(err)
    })
}

const Schema = mongoose.Schema;

const logEntrySchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }
})

const userSchema = new Schema({
  username: { type: String, requred: true, unique: true },
  log: [logEntrySchema]
  //log: { type: [String] }
})

const userDB = mongoose.model('userDB', userSchema)

app.use(cors())

connectToDataBase();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', (req, res) => {
  //res.end()
  //console.log('getting list of all users...')
  userDB.find({}).then(data => {


    res.end(JSON.stringify(data.map(d => ({ username: d.username, _id: d._id.toString() }))))
  }).catch(err => { throw err })
})

app.get('/api/users/:_id/logs', (req, res) => {
  //console.log('begin user search')
      console.log('check other params')

  const {params, query} = req

  userDB.findById(params._id).then((req, res) => {
    //console.log('user found')
    //console.log(req)

    //const currentUser = Object.assign({count: req.log.length}, JSON.parse(JSON.stringify(req)))

    const {username, _id, log} = req

    const newLog = log.map(entry => {
      const {description, duration, date} = entry

      const convertedDate = new Date(date)

      return {description, duration, date: convertedDate.toDateString()}
    })

    console.log(newLog)

    let filteredLog = newLog

    if(query.from){

      filteredLog = filteredLog.filter(entry => new Date(entry.date).getTime() > new Date(query.from).getTime())
    }

    if(query.to){
      filteredLog = filteredLog.filter(entry => new Date(entry.date).getTime() < new Date(query.from).getTime())
    }

    if(query.limit){
      filteredLog = filteredLog.slice(0, query.limit)
      console.log('size limit request detected')
    }

    const output = {username, count:log.length, _id: _id.toString(), log: filteredLog}



    //console.log(output)

    res.end(JSON.stringify(output))

  }).catch(() => {
    res.end(`user with id: ${req.params._id} not found`)
  })
})

app.post('/api/users', (req, res) => {

  const { username } = req.body
  if (username == "") {
    res.end("username is required")
  }
  else {
    userDB.findOne({ username: username }).then((queryResult) => {
      if (queryResult) {
        res.end("username is already taken")
      }
      else {
        userDB.create({ username: username }).then(queryResult => {
          //console.log(queryResult)
          res.end(JSON.stringify({ username: queryResult.username, _id: queryResult._id.toString() }))
        })
      }
    })
  }
});



app.post('/api/users/:_id/exercises', (req, res) => {
  console.log("req :", req.body)
  const { description, duration, date } = req.body

  if (!description) {
    res.end("description is required")
  }
  else if (!duration) {
    res.end("duration is required")
  }
  else {
    //console.log('look for id')
    console.log(req.params)

    /*const newExercise = new logEntrySchema({
      description: description,
      duration: duration,
      date: date ? Date.parse(date) : Date.now()
    })*/

    const newExercise = {
      description: description,
      duration: duration,
      date: date ? Date.parse(date) : Date.now()
    }


    userDB.findByIdAndUpdate(req.params._id, { $push: { log: newExercise } })
      .then((currentRecord) => {
        
        const {username, _id} = currentRecord
        const { date} = newExercise

        const convertedDate = new Date(date)

        const output = {username, description, duration: Number(duration), date: convertedDate.toDateString(), _id: _id.toString()}

        //console.log('checking output')
        //console.log(output)

        res.end(JSON.stringify(output))
      }).catch((err) => {
        //console.log('failed edit')
        //console.log(err)
        res.end(err)
      })

    console.log('edit attempt done')

  }
})

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
