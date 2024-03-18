import { DataTypes } from "sequelize";
import sequelize from './client'
import { Booking } from "../model/model";

// use this file to insert any data into the db

const myFirstBooking = Booking.create({

}).then(() => {
    console.log(`first booking created successfuly - ${myFirstBooking}`)
}).catch(err => {
    console.error('error inserting booking', err)
})