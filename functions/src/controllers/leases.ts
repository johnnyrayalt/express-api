import * as functions from 'firebase-functions'
import LeaseModel from './../models/leaseModel'
import TenantModel from './../models/tenantsModel'
import PropertiesModel from './../models/propertiesModel'
const admin = require('firebase-admin')
const bodyParser = require('body-parser')
const uuidv4 = require('uuid/v4')
const db = admin.firestore()
const leasesCollectionRef = db.collection('leases')

// CREATE LEASE
exports.create = (req, res) => {
  const incomingData: LeaseModel = req.body
  const uid: string = uuidv4().replace(/-/g,'')
  const dateCreatedTimeStamp: string = new Date().toString()

  leasesCollectionRef.doc(uid)
    .set({
      'id': uid,
      'propertyId': incomingData.propertyId,
      'unit': incomingData.unit,
      'numberOfResidenceInUnit': incomingData.numberOfResidenceInUnit,
      'tenantIds': incomingData.tenantIds,
      'dateStart': incomingData.dateStart,
      'dateEnd': incomingData.dateEnd,
      'dateCreated': dateCreatedTimeStamp,
      'dateUpdated': dateCreatedTimeStamp
  })
  .then(_ => {

    leasesCollectionRef.doc(uid)
      .get()
      .then(createdLease => {
        res.status(201).send(createdLease.data())
      })
      .catch(err => {
        res.status(400).send(err.stack)
      })

  })
  .catch(err => {
    res.status(400).send(err.stack)
  })
}

// READ LEASES
exports.read = (_req, res) => {
  if (!'leases') {
    res.status(404).send(res.message = `Collection ${leasesCollectionRef} does not exist; status code: 404`)
  }

  leasesCollectionRef
    .get()
    .then(async incomingLeaseObject => {

      const leasesList: Array<LeaseModel> = []

      await incomingLeaseObject.forEach(leaseObject => {
        const lease: LeaseModel = leaseObject.data()
        lease.tenants = []
        leasesList.push(lease)
      })

      return leasesList
    })
    .then((leasesList: Array<LeaseModel>) => {
      async function getTenantInfo() {

        for (const lease of leasesList) {

          const tempTenantsArray: Array<string> = []

          lease.tenantIds.forEach(id => {
            tempTenantsArray.push(

              db.collection('tenants').doc(id)
              .get()
              .then(incomingTenantObjects => {
                const tenantObject = incomingTenantObjects.data()
                return tenantObject.firstName + ' ' + tenantObject.lastName
              })
              .catch(err => {
                res.status(400).send(err.stack)
              }))

          })

          await Promise.all(tempTenantsArray)
            .then(resolvedTenantsArray => {
              lease.tenants = resolvedTenantsArray
            })
            .catch(err => {
              res.status(400).send(err.stack)
            })

        }

        return leasesList
      }

      return getTenantInfo()
    })
    .then((leasesList: Array<LeaseModel>) => {
      async function getPropertyInfo() {

        for (const lease of leasesList) {

          const tempPropertyArray: Array<PropertiesModel> = []

          tempPropertyArray.push(

            db.collection('properties').doc(lease.propertyId)
              .get()
              .then(incomingPropertyObject => {
                return lease.property = incomingPropertyObject.data()
              })
              .catch(err => {
                res.status(400).send(err.stack)
              })

          )

          await Promise.all(tempPropertyArray)
            .then(resolvedPropertyArray => {
              lease.property = resolvedPropertyArray.pop()

              return lease
            })
            .catch(err => {
              res.status(400).send(err.stack)
            })
        }

        return leasesList
      }

      return getPropertyInfo()
    })
    .then((leasesList: Array<LeaseModel>) => {

      interface NewLeaseModel {
        id: string,
        tenants: Array<string>,
        unit: string,
        property: PropertiesModel,
        dateStart: string,
        dateEnd: string
      }

      async function cleanUp() {
        const newLeasesArray: Array<NewLeaseModel> = []

        for (const lease of leasesList)  {

          const newLease: NewLeaseModel = {
            id: lease.id,
            tenants: lease.tenants,
            unit: lease.unit,
            property: lease.property,
            dateStart: lease.dateStart,
            dateEnd: lease.dateEnd
          }

          newLeasesArray.push(newLease)
        }

        const leasesArray = await Promise.all(newLeasesArray)
          .then(resolvedLeasesArray => {
            return resolvedLeasesArray
          })
          .catch(err => {
            res.status(400).status(err.stack)
          })

        return leasesArray
      }

      return cleanUp()
    })
    .then((finalLeasesInfoPayload: Array<LeaseModel>) => {
      res.status(200).send(finalLeasesInfoPayload)
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })
}

// READ INDIVIDUAL LEASE
exports.readIndividualLease = (req, res) => {
  const uid: string = req.params.uid
  if (!uid) throw new Error('Id is blank')

  leasesCollectionRef.doc(uid)
    .get()
    .then(lease => {
      return lease.data()
    })
    .then((leaseInfo: LeaseModel) => {
      async function getTenantInfo() {

        const tempTenantsArray: Array<TenantModel> = []

        leaseInfo.tenantIds.forEach(id => {
          tempTenantsArray.push(

            db.collection('tenants').doc(id)
              .get()
              .then(incomingTenantObjects => {
                return incomingTenantObjects.data()
              })
              .catch(err => {
                res.status(400).send(err.stack)
              }))

        })

      await Promise.all(tempTenantsArray)
        .then(resolvedTenantsArray => {
          leaseInfo.tenants = resolvedTenantsArray
        })
        .catch(err => {
          res.status(400).send(err.stack)
        })

        return leaseInfo
      }

      return getTenantInfo()
    })
    .then((leaseInfo: LeaseModel) => {
      async function getPropertyInfo() {

        const tempPropertyArray: Array<PropertiesModel> = []

        tempPropertyArray.push(

          db.collection('property').doc(leaseInfo.propertyId)
            .get()
            .then(incomingPropertyObject => {
              return incomingPropertyObject.data()
            })
            .catch(err => {
              res.status(400).send(err.stack)
            }))

        await Promise.all(tempPropertyArray)
          .then(resolvedPropertyArray => {
            leaseInfo.property = resolvedPropertyArray.pop()
          })

        return leaseInfo
      }

      return getPropertyInfo()
    })
    .then((leaseInfo: LeaseModel) => {
      const newLeaseModel = {
        id: leaseInfo.id,
        tenants: leaseInfo.tenants,
        property: leaseInfo.property,
        unit: leaseInfo.unit,
        numberOfResidenceInUnit: leaseInfo.numberOfResidenceInUnit,
        dateStart: leaseInfo.dateStart,
        dateEnd: leaseInfo.dateEnd,
        dateCreated: leaseInfo.dateCreated,
        dateUpdated: leaseInfo.dateUpdated
      }

      return newLeaseModel
    })
    .then(finalLeasesInfoPayload => {
      res.status(200).send(finalLeasesInfoPayload)
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })
}

// UPDATE INDIVIDUAL LEASE
exports.update = (req, res) => {
  const uid: string = req.params.uid
  const leaseData: LeaseModel = req.body
  const dateUpdatedTimeStamp: string = new Date().toString()

  if (!uid) throw new Error('Id is blank')

  //entered user data from front end
  const newLeaseModel: LeaseModel = {
    id: uid,
    tenantIds: leaseData.tenantIds,
    propertyId: leaseData.propertyId,
    unit: leaseData.unit,
    numberOfResidenceInUnit: leaseData.numberOfResidenceInUnit,
    dateStart: leaseData.dateStart,
    dateEnd: leaseData.dateEnd,
    dateCreated: 'placeholder: will not update',
    dateUpdated: dateUpdatedTimeStamp
  }

  const serverValidation = leasesCollectionRef.doc(uid)
    .get()
    .then(databaseObject => {
      const dbObject = databaseObject.data()
      const validationObject: LeaseModel = {
        id: uid,
        propertyId: dbObject.propertyId,
        unit: dbObject.unit,
        tenantIds: dbObject.tenantIds,
        numberOfResidenceInUnit: dbObject.numberOfResidenceInUnit,
        dateStart: dbObject.dateStart,
        dateEnd: dbObject.dateEnd,
        dateCreated: dbObject.dateCreated,
        dateUpdated: dateUpdatedTimeStamp
      }

      return validationObject
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })

    Promise.resolve(serverValidation)
      .then(validationObject => {
        newLeaseModel.propertyId !== validationObject.propertyId &&
        newLeaseModel.propertyId !== '' ?
          validationObject.propertyId = newLeaseModel.propertyId :
          validationObject.propertyId

        return validationObject
      })
      .then(validationObject => {
        newLeaseModel.unit !== validationObject.unit &&
        newLeaseModel.unit !== '' ?
          validationObject.unit = newLeaseModel.unit :
          validationObject.unit

        return validationObject
      })
      .then(validationObject => {
        newLeaseModel.numberOfResidenceInUnit !== validationObject.numberOfResidenceInUnit &&
        newLeaseModel.numberOfResidenceInUnit !== NaN ?
          validationObject.numberOfResidenceInUnit = newLeaseModel.numberOfResidenceInUnit :
          validationObject.numberOfResidenceInUnit

        return validationObject
      })
      .then(validationObject => {
        newLeaseModel.dateStart !== validationObject.dateStart &&
        newLeaseModel.dateStart !== '' ?
          validationObject.dateStart = newLeaseModel.dateStart :
          validationObject.dateStart

        return validationObject
      })
      .then(validationObject => {
        newLeaseModel.dateEnd !== validationObject.dateEnd &&
        newLeaseModel.dateEnd !== '' ?
          validationObject.dateEnd = newLeaseModel.dateEnd :
          validationObject.dateEnd

        return validationObject
      })
      .then(validationObject => {
        async function validateTenantIds() {
          const validatedTenantIdsArray = newLeaseModel.tenantIds.map(id => {
            return db.collection('tenants').doc(id)
              .get()
              .then(results => {
                if (results.exists) {
                  return results.id
                }
              })
              .catch(err => {
                res.status(400).send(err.stack)
              })
          })

          await Promise.all(validatedTenantIdsArray)
            .then(async results => {
              validationObject.tenantIds = await results.filter(validated => validated !== undefined)

              return Promise.all(results)
            })

          return validationObject
        }

        return validateTenantIds()
      })
      .then(finalLeaseInfoPayload => {
        leasesCollectionRef.doc(uid)
          .update({finalLeaseInfoPayload})
      })
      .then(_ => {
        leasesCollectionRef.doc(uid)
          .get()
          .then(updatedLease => {
            res.status(200).send(updatedLease.data())
          })
          .catch(err => {
            res.status(400).send(err.stack)
          })
      })
      .catch((err) => {
        res.status(400).send(err.stack)
      })
}

// ARCHIVE INDIVIDUAL USER
exports.archive = (req, res) => {
  const uid: string = req.params.uid
  if (!uid) throw new Error('Id is blank')

  leasesCollectionRef.doc(uid)
    .get()
    .then(databaseObject => {
      const archiveLease: LeaseModel = databaseObject.data()

      db.collection('archivedLeases').doc(uid)
        .set({archiveLease})

      leasesCollectionRef.doc(uid)
        .delete()

      res.status(200).send(`lease for ${archiveLease.tenantIds} has been archived`)
    })
    .catch((err) => {
      res.status(400).send(res.message = `ID does not exist: ${uid}; status code: 400 \n` + err.stack)
    })
}

// DELETE INDIVIDUAL LEASE
exports.delete = (req, res) => {
  const uid: string = req.params.uid
  if (!uid) throw new Error('Id is blank')

  leasesCollectionRef.doc(uid)
    .get()
    .then(deleteLeaseInfo => {
      const deleteLeaseData: LeaseModel = deleteLeaseInfo.data()

      leasesCollectionRef.doc(uid)
        .delete()

      res.status(200).send(`lease for ${deleteLeaseData.tenantIds} has been deleted`)
    })
    .catch(err => {
      res.status(400).send(err.stack)
    })
}
