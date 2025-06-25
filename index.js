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

const exerciseSchema = new Schema({
  username: {type: String, requred: true, unique: true},
  id: {type: String, required: true, unique: true},
  log: [{description: {type: String, required: true},
         duration: {type: Number, required: true},
         date: {type: Date}}]
})

const userExercise = mongoose.model('userExercise', exerciseSchema)

app.use(cors())

connectToDataBase();

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/exercise/log', (req, res)=>{
  let qId, qLim, qFrom, qTo;
  if("userId" in req.query){
    if("limit" in req.query){
      qLim = Number.parseInt(req.query.limit)
    }
    if("from" in req.query){
      qFrom = Date.parse(req.query.from)
    }
    if("to" in req.query){
      qTo = Date.parse(req.query.to)
    }
    res.json(req.query)
  }
  else res.end("userId is required") 
})

app.post('/api/exercise/new-user', (req, res) => {
  if(req.body.username==""){
    res.end("username is required")
  }
  else{
    userExercise.findOne({username: req.body.username})
                .then(()=>{
                    console.log(`creating account for ${req.body.username}`)
                    userExercise.count({})
                      .then(count => {
                          let newUser = new userExercise({username: req.body.username, id: (count+1).toString(36)})
                          console.log(newUser)
                          res.json(newUser)
                          newUser.save()
                    })
                },
                     (err, obj)=>{
                    console.log('incoming error')
                    console.error(err)
                    res.end("username is already taken")
                })
  }
});

app.post('/api/exercise/add', (req, res) => {
  if(req.body.userId==""){
    res.end("id is required")
  }
  else if(req.body.description==""){
    res.end("description is required")
  }
  else if(req.body.duration==""){
    res.end("duration is required")
  }
  else{
    userExercise.findOneAndUpdate({username: req.body.userId},
      {"$push": {"log": {description: req.body.description,
                        duration: req.body.duration,
                        date: req.body.date}
               }
      })
      .then(user => {
        if(!user){
          res.end(`no user with the id of ${req.body.userId} exists`)
        }
        else{
          res.json(req.body)
        }
      })    
  }
});



// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
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
