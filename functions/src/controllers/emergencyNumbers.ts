import * as functions from 'firebase-functions'
import EmergencyNumbersModel from './../models/EmergencyNumbersModel'
const admin = require('firebase-admin')
const bodyParser = require('body-parser')
const uuidv4 = require('uuid/v4')
const db = admin.firestore()
const emergencyNumbersCollectionRef = db.collection('emergencyNumbers')

// CREATE EMERGENCY NUMBER
exports.create = (req, res) => {
  const emergencyNumberData: EmergencyNumbersModel = req.body
  const uid: string = uuidv4().replace(/-/g,'')

  emergencyNumbersCollectionRef.doc(uid)
  .set({
    'id': uid,
    'contact': emergencyNumberData.contact,
    'subtext': emergencyNumberData.subtext,
    'phoneNumberOne': emergencyNumberData.phoneNumberOne,
    'phoneNumberTwo': emergencyNumberData.phoneNumberTwo,
    'phoneNumberThree': emergencyNumberData.phoneNumberThree
  })
  .then(_ => {

    emergencyNumbersCollectionRef.doc(uid)
      .get()
      .then(createdEmergencyNumber => {
        res.status(201).send(createdEmergencyNumber.data())
      })
      .catch(err => {
        res.status(400).send(err.stack)
      })
  })
  .catch(err => {
    res.status(400).send(err.stack)
  })

}

// READ EMERGENCY NUMBERS
exports.read = (_req, res) => {

  if (!'emergencyNumbers') {
    res.status(404).send(res.message = `Collection ${emergencyNumbersCollectionRef} does not exist; status code: 404`)
  }

  emergencyNumbersCollectionRef
    .get()
    .then(async incomingEmergencyNumberData => {

      const emergencyNumbersList: Array<EmergencyNumbersModel> = []

      await incomingEmergencyNumberData.forEach(emergencyNumberObject => {
        const emergencyNumber: EmergencyNumbersModel = emergencyNumberObject.data()
        emergencyNumbersList.push(emergencyNumber)
      })

      return emergencyNumbersList
    })
    .then(finalEmergencyNumbersList => {
      res.status(200).send(finalEmergencyNumbersList)
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })

}

// READ INDIVIDUAL EMERGENCY NUMBER
exports.readIndividualEmergencyNumber = (req, res) => {
  const uid: string = req.params.uid
  if (!uid) throw new Error('Id is blank')

  emergencyNumbersCollectionRef.doc(uid)
    .get()
    .then(emergencyNumber => {
      res.status(200).send(emergencyNumber.data())
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })
}

// UPDATE EMERGENCY NUMBER
exports.update = (req, res) => {
  const uid: string = req.params.uid
  const emergencyNumberData: EmergencyNumbersModel = req.body

  if (!uid) throw new Error('Id is blank')

  //entered user data from front end
  const newEmergencyNumbersModel: EmergencyNumbersModel = {
    id: uid,
    contact: emergencyNumberData.contact,
    subtext: emergencyNumberData.subtext,
    phoneNumberOne: emergencyNumberData.phoneNumberOne,
    phoneNumberTwo: emergencyNumberData.phoneNumberTwo,
    phoneNumberThree: emergencyNumberData.phoneNumberThree
  }

  if (!uid) throw new Error('Id is blank')


  const serverValidation = emergencyNumbersCollectionRef.doc(uid)
    .get()
    .then(databaseObject => {
      const dbObject = databaseObject.data()
      const validationObject: EmergencyNumbersModel = {
        id: uid,
        contact: dbObject.contact,
        subtext: dbObject.subtext,
        phoneNumberOne: dbObject.phoneNumberOne,
        phoneNumberTwo: dbObject.phoneNumberTwo,
        phoneNumberThree: dbObject.phoneNumberThree
      }

      return validationObject
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })

  Promise.resolve(serverValidation)
    .then(validationObject => {
      newEmergencyNumbersModel.contact !== validationObject.contact &&
      newEmergencyNumbersModel.contact !== '' ?
        validationObject.contact = newEmergencyNumbersModel.contact :
        validationObject.contact

      return validationObject
    })
    .then(validationObject => {
      newEmergencyNumbersModel.subtext !== validationObject.subtext &&
      newEmergencyNumbersModel.subtext !== '' ?
        validationObject.subtext = newEmergencyNumbersModel.subtext :
        validationObject.subtext

      return validationObject
    })
    .then(validationObject => {
      newEmergencyNumbersModel.phoneNumberOne !== validationObject.phoneNumberOne &&
      newEmergencyNumbersModel.phoneNumberOne.number !== '' ?
        validationObject.phoneNumberOne = newEmergencyNumbersModel.phoneNumberOne :
        validationObject.phoneNumberOne

      return validationObject
    })
    .then(validationObject => {
      newEmergencyNumbersModel.phoneNumberTwo !== validationObject.phoneNumberTwo &&
      newEmergencyNumbersModel.phoneNumberTwo.number !== '' ?
        validationObject.phoneNumberTwo = newEmergencyNumbersModel.phoneNumberTwo :
        validationObject.phoneNumberTwo


      return validationObject
    })
    .then(validationObject => {
      newEmergencyNumbersModel.phoneNumberThree !== validationObject.phoneNumberThree &&
      newEmergencyNumbersModel.phoneNumberThree.number !== ''  ?
        validationObject.phoneNumberThree = newEmergencyNumbersModel.phoneNumberThree :
        validationObject.phoneNumberThree

      return validationObject
    })
    .then(finalEmergencyNumbersPayload => {
      emergencyNumbersCollectionRef.doc(uid)
        .update(finalEmergencyNumbersPayload)
    })
    .then(_ => {
      emergencyNumbersCollectionRef.doc(uid)
        .get()
        .then(updatedEmergencyNumber => {
          res.status(200).send(updatedEmergencyNumber.data())
        })
        .catch(err => {
          res.status(400).send(err.stack)
        })
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })
}

// ARCHIVE EMERGENCY NUMBER
exports.archive = (req, res) => {
  const uid: string = req.params.uid
  if (!uid) throw new Error('Id is blank')

  emergencyNumbersCollectionRef.doc(uid)
    .get()
    .then(databaseObject => {
      const archiveEmergencyNumber: EmergencyNumbersModel = databaseObject.data()

      db.collection('archivedEmergencyNumbers').doc(uid)
        .set({archiveEmergencyNumber})

      emergencyNumbersCollectionRef.doc(uid)
        .delete()

      res.status(200).send(`emergency number for ${archiveEmergencyNumber.contact} has been archived`)
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })
}

// DELETE EMERGENCY NUMBER
exports.delete = (req, res) => {
  const uid: string = req.params.uid
  if (!uid) throw new Error('Id is blank')

  emergencyNumbersCollectionRef.doc(uid)
    .get()
    .then(deleteEmergencyNumberData => {
      const deleteEmergencyNumber: EmergencyNumbersModel = deleteEmergencyNumberData.data()

      emergencyNumbersCollectionRef.doc(uid)
        .delete()

      res.status(200).send(`emergency number for ${deleteEmergencyNumberData.contact} has been archived`)
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })
}
